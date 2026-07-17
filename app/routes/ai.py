from flask import Blueprint, render_template
from flask_socketio import emit
from app.extensions import socketio
import os
import base64
from openai import OpenAI
import time
import wave
import numpy as np
from scipy import signal
from app.utils.vad import detect_speech, detect_snoring, is_noise_transcript, compute_rms

ai_bp = Blueprint('ai', __name__)

audio_buffer = []
MAX_BUFFER_SIZE = 16000 * 2 * 3

AUDIO_SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../temp_audio")
MAX_SAVED_FILES = 10

vad_stats = {"total": 0, "noise_skipped": 0, "filtered_response": 0}


def cleanup_old_audio():
    try:
        if not os.path.exists(AUDIO_SAVE_DIR):
            os.makedirs(AUDIO_SAVE_DIR)
            return

        files = [os.path.join(AUDIO_SAVE_DIR, f) for f in os.listdir(AUDIO_SAVE_DIR) if f.endswith('.wav')]
        files.sort(key=os.path.getmtime)

        while len(files) >= MAX_SAVED_FILES:
            old_file = files.pop(0)
            os.remove(old_file)
            print(f"已清理旧音频文件: {os.path.basename(old_file)}")
    except Exception as e:
        print(f"音频清理失败: {e}")


def save_pcm_as_wav(pcm_data, sample_rate=16000):
    try:
        cleanup_old_audio()

        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = f"audio_{timestamp}.wav"
        wav_path = os.path.join(AUDIO_SAVE_DIR, filename)

        with wave.open(wav_path, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_data)
        return wav_path
    except Exception as e:
        print(f"WAV 转换失败: {e}")
        return None


def enhance_audio(wav_path, sample_rate=16000):
    try:
        with wave.open(wav_path, 'rb') as wav_file:
            frames = wav_file.readframes(wav_file.getnframes())
            audio_int16 = np.frombuffer(frames, dtype=np.int16)
            audio_float = audio_int16.astype(np.float32) / 32768.0

        sos = signal.butter(4, [300, 3400], btype='band', fs=sample_rate, output='sos')
        audio_filtered = signal.sosfilt(sos, audio_float)

        noise_floor = np.percentile(np.abs(audio_filtered[:int(sample_rate * 0.1)]), 90)
        gate_threshold = max(noise_floor * 1.5, 0.008)
        mask = np.abs(audio_filtered) > gate_threshold
        audio_gated = audio_filtered * mask.astype(np.float32)

        envelope = np.convolve(np.abs(audio_gated), np.ones(800) / 800, mode='same')
        noise_profile = np.percentile(envelope, 15)
        gain = np.clip(1.0 - (noise_profile / (envelope + 1e-6)), 0.1, 1.0)
        audio_denoised = audio_gated * gain

        max_val = np.max(np.abs(audio_denoised))
        if max_val > 0.01:
            audio_norm = audio_denoised / max_val * 0.9
        else:
            audio_norm = audio_denoised

        audio_out = np.clip(audio_norm * 32768, -32768, 32767).astype(np.int16)

        with wave.open(wav_path, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_out.tobytes())

        print(f"音频增强完成: {os.path.basename(wav_path)}")
        return wav_path
    except Exception as e:
        print(f"音频增强失败: {e}")
        return wav_path


client = OpenAI(
    api_key=os.getenv("AI_API_KEY"),
    base_url=os.getenv("AI_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
)


@ai_bp.route('/ai-assistant')
def ai_assistant():
    return render_template('ai_assistant.html')


@socketio.on('connect')
def handle_connect():
    print('设备或前端已连接')


@socketio.on('audio_data')
def handle_audio_data(data):
    global audio_buffer

    try:
        if isinstance(data, str):
            binary_data = base64.b64decode(data)
        else:
            binary_data = data

        audio_buffer.append(binary_data)

        buffer_len = sum(len(b) for b in audio_buffer)

        if buffer_len >= MAX_BUFFER_SIZE:
            pcm_data = b''.join(audio_buffer)
            audio_buffer = []

            vad_stats["total"] += 1
            pcm_int16 = np.frombuffer(pcm_data, dtype=np.int16)

            rms_before = compute_rms(pcm_int16)
            has_speech_before, detail_before = detect_speech(pcm_int16)

            wav_path = save_pcm_as_wav(pcm_data)

            if wav_path:
                print(f"已生成 3 秒语音: {os.path.basename(wav_path)}，开始降噪增强...")
                wav_path = enhance_audio(wav_path)

                with wave.open(wav_path, 'rb') as wf:
                    enhanced_frames = wf.readframes(wf.getnframes())
                    enhanced_int16 = np.frombuffer(enhanced_frames, dtype=np.int16)

                has_speech_after, detail_after = detect_speech(enhanced_int16)

                if not has_speech_after:
                    vad_stats["noise_skipped"] += 1
                    skip_rate = vad_stats["noise_skipped"] / vad_stats["total"] * 100
                    print(f"[VAD] 跳过噪声 (before: {detail_before}, after: {detail_after}) | 累计: {vad_stats['noise_skipped']}/{vad_stats['total']} ({skip_rate:.0f}%)")
                    return

                try:
                    with open(wav_path, "rb") as f:
                        audio_b64 = base64.b64encode(f.read()).decode("utf-8")
                    handle_audio_query(audio_b64)
                except Exception as read_e:
                    print(f"读取音频文件失败: {read_e}")
            else:
                print("音频保存失败")

    except Exception as e:
        print(f"音频处理错误: {e}")


def handle_audio_query(audio_b64):
    model_name = os.getenv("AI_MODEL", "doubao-seed-2-0-lite-260428")

    try:
        print(f"正在请求模型 {model_name} 处理音频...")
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "请听这段音频并回答用户的问题，请保持回答简洁。"},
                        {"type": "input_audio", "input_audio": {"data": audio_b64, "format": "wav"}}
                    ]
                }
            ]
        )
        response_text = completion.choices[0].message.content
        print(f"豆包音频回复: {response_text}")

        if is_noise_transcript(response_text):
            vad_stats["filtered_response"] += 1
            print(f"[ASR过滤] 丢弃噪声回复 (累计: {vad_stats['filtered_response']})")
            return

        emit('text_response', {'response': response_text})
    except Exception as e:
        print(f"豆包音频调用失败: {e}")
        emit('text_response', {'response': '抱歉，我刚才没听清楚，请再说一遍。'})


# ============ 鼾声监控 ============
snore_stats = {"total_frames": 0, "snore_frames": 0, "is_snoring": False}


@socketio.on('snore_audio')
def handle_snore_audio(data):
    try:
        if isinstance(data, str):
            pcm_data = base64.b64decode(data)
        else:
            pcm_data = data

        pcm_int16 = np.frombuffer(pcm_data, dtype=np.int16)

        is_snoring, snore_score, detail = detect_snoring(pcm_int16)

        snore_stats["total_frames"] += 1
        if is_snoring:
            snore_stats["snore_frames"] += 1
        snore_stats["is_snoring"] = is_snoring

        rms = compute_rms(pcm_int16)

        emit('snore_result', {
            'is_snoring': is_snoring,
            'score': round(snore_score, 2),
            'rms': round(rms, 5),
            'detail': detail,
            'total': snore_stats["total_frames"],
            'snore_count': snore_stats["snore_frames"],
        })
    except Exception as e:
        print(f"鼾声检测错误: {e}")
        emit('snore_result', {'is_snoring': False, 'score': 0, 'error': str(e)})


# ============ 语音控制 ============
VOICE_COMMANDS = {
    "打开闹钟": {"action": "alarm_on"},
    "关闭闹钟": {"action": "alarm_off"},
    "下一个时区": {"action": "next_timezone"},
    "上一个时区": {"action": "prev_timezone"},
    "切换到北京时间": {"action": "set_timezone", "tz": "Asia/Shanghai"},
    "切换到纽约时间": {"action": "set_timezone", "tz": "America/New_York"},
    "切换到伦敦时间": {"action": "set_timezone", "tz": "Europe/London"},
    "切换到东京时间": {"action": "set_timezone", "tz": "Asia/Tokyo"},
    "显示时间": {"action": "show_time"},
    "调高音量": {"action": "volume_up"},
    "调低音量": {"action": "volume_down"},
    "关闭音量": {"action": "volume_mute"},
}


@socketio.on('voice_command')
def handle_voice_command(json_data):
    query = json_data.get('query', '')
    print(f"收到语音控制: {query}")

    query_lower = query.lower().strip()

    for cmd_text, cmd in VOICE_COMMANDS.items():
        if cmd_text in query_lower:
            emit('voice_cmd_response', {
                'recognized': True,
                'command': cmd,
                'text': query,
                'reply': f"已执行: {cmd_text}",
            })
            return

    try:
        model_name = os.getenv("AI_MODEL", "doubao-seed-2-0-lite-260428")
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "你是一个智能家居语音控制助手。用户会说出控制指令，请判断并返回JSON格式的控制命令。可用命令: alarm_on, alarm_off, next_timezone, prev_timezone, set_timezone(tz), volume_up, volume_down, volume_mute, show_time。如果用户说的是控制命令，返回 {\"action\": \"xxx\"}。如果是其他问题，返回普通回答。"},
                {"role": "user", "content": query}
            ]
        )
        reply = completion.choices[0].message.content
        emit('voice_cmd_response', {
            'recognized': False,
            'text': query,
            'reply': reply,
        })
    except Exception as e:
        print(f"语音控制AI调用失败: {e}")
        emit('voice_cmd_response', {
            'recognized': False,
            'text': query,
            'reply': "抱歉，无法识别您的指令。",
        })
    except Exception as e:
        print(f"豆包音频调用失败: {e}")
        emit('text_response', {'response': '抱歉，我刚才没听清楚，请再说一遍。'})


@socketio.on('text_query')
def handle_text_query(json_data):
    query = json_data.get('query')
    print(f"收到文字查询: {query}")

    try:
        model_name = os.getenv("AI_MODEL", "doubao-seed-2-0-lite-260428")
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "你是一个智能助手，正在通过 ESP32 硬件与用户交流。请简洁明了地回答。"},
                {"role": "user", "content": query}
            ]
        )
        response_text = completion.choices[0].message.content
        print(f"AI 回复: {response_text}")
    except Exception as e:
        print(f"AI 调用失败: {e}")
        response_text = "抱歉，我现在大脑有点混乱，请稍后再试。"

    emit('text_response', {'response': response_text})

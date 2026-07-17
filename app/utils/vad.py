import numpy as np


def compute_rms(audio_int16):
    audio_float = audio_int16.astype(np.float32) / 32768.0
    return float(np.sqrt(np.mean(audio_float ** 2)))


def compute_speech_ratio(audio_int16, sample_rate=16000):
    audio_float = audio_int16.astype(np.float32) / 32768.0

    window_size = int(sample_rate * 0.05)
    total_windows = len(audio_float) // window_size
    if total_windows < 2:
        return 0.0

    speech_windows = 0
    for i in range(total_windows):
        start = i * window_size
        end = start + window_size
        window_rms = np.sqrt(np.mean(audio_float[start:end] ** 2))
        if window_rms > 0.01:
            speech_windows += 1

    return speech_windows / total_windows


def detect_speech(audio_int16, sample_rate=16000):
    """
    基于 RMS 能量和语音比例的综合 VAD。
    返回 (has_speech: bool, detail: str)
    """
    rms = compute_rms(audio_int16)
    speech_ratio = compute_speech_ratio(audio_int16, sample_rate)

    if rms < 0.003:
        return False, f"静音 (RMS={rms:.5f})"

    if rms < 0.006 and speech_ratio < 0.15:
        return False, f"环境噪声 (RMS={rms:.5f}, speech_ratio={speech_ratio:.2f})"

    if rms > 0.30:
        return False, f"削波/爆破噪声 (RMS={rms:.3f}, speech_ratio={speech_ratio:.2f})"

    if speech_ratio < 0.10 and rms < 0.02:
        return False, f"疑似非人声 (RMS={rms:.5f}, speech_ratio={speech_ratio:.2f})"

    return True, f"检测到语音 (RMS={rms:.5f}, speech_ratio={speech_ratio:.2f})"


NOISE_KEYWORDS = [
    "噪音", "爆破", "杂音", "噪声", "静电", "干扰",
    "故障", "数据错误", "信号受干扰", "电子故障",
    "没有有效人声", "没有任何人声", "没有出现人声",
    "无人声", "无有效语音", "听不清",
    "无声", "静音", "没有声音",
    "no valid speech", "no human voice",
]


def is_noise_transcript(text):
    """
    检查 AI 返回的文本是否为"噪声描述"而非真实对话内容。
    返回 True 表示应该丢弃这条回复。
    """
    if not text:
        return True

    text_lower = text.lower()

    noise_hit = 0
    for kw in NOISE_KEYWORDS:
        if kw.lower() in text_lower:
            noise_hit += 1

    if noise_hit >= 2:
        return True

    if len(text.strip()) < 5:
        return True

    return False

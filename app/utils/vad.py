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


def detect_snoring(audio_int16, sample_rate=16000):
    """
    基于频谱特征检测鼾声。
    鼾声特征：低频为主（20-300Hz），能量集中在低频段，有周期性。
    返回 (is_snoring: bool, snore_score: float, detail: str)
    """
    audio_float = audio_int16.astype(np.float32) / 32768.0
    rms = float(np.sqrt(np.mean(audio_float ** 2)))

    if rms < 0.005:
        return False, 0.0, "静音"

    fft = np.abs(np.fft.rfft(audio_float))
    freqs = np.fft.rfftfreq(len(audio_float), 1.0 / sample_rate)

    low_mask = freqs <= 300
    low_energy = float(np.sum(fft[low_mask] ** 2))
    total_energy = float(np.sum(fft ** 2))

    if total_energy < 1e-10:
        return False, 0.0, "能量过低"

    low_ratio = low_energy / total_energy

    freq_bands = [20, 60, 120, 200, 300]
    band_energy = []
    for i in range(len(freq_bands) - 1):
        mask = (freqs >= freq_bands[i]) & (freqs < freq_bands[i + 1])
        band_energy.append(float(np.sum(fft[mask] ** 2)))

    peak_band = max(band_energy) if band_energy else 0
    band_entropy = 0.0
    if peak_band > 0:
        band_total = sum(band_energy) + 1e-10
        probs = [e / band_total for e in band_energy]
        for p in probs:
            if p > 0:
                band_entropy -= p * np.log2(p)

    snore_score = 0.0
    if low_ratio > 0.5:
        snore_score += 0.3
    if low_ratio > 0.7:
        snore_score += 0.15
    if band_entropy < 1.5 and band_entropy > 0.5:
        snore_score += 0.25
    if rms > 0.01 and rms < 0.25:
        snore_score += 0.2
    if 0.01 < rms < 0.08:
        snore_score += 0.1
    snore_score = min(snore_score, 1.0)

    is_snoring = snore_score >= 0.55
    detail = f"鼾声评分={snore_score:.2f} 低频占比={low_ratio:.2f} RMS={rms:.5f} 频谱熵={band_entropy:.2f}"

    return is_snoring, snore_score, detail


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

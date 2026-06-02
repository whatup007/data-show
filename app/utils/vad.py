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
    鍩轰簬 RMS 鑳介噺鍜岃闊虫瘮渚嬬殑缁煎悎 VAD銆?    杩斿洖 (has_speech: bool, detail: str)
    """
    rms = compute_rms(audio_int16)
    speech_ratio = compute_speech_ratio(audio_int16, sample_rate)

    if rms < 0.003:
        return False, f"闈欓煶 (RMS={rms:.5f})"

    if rms < 0.006 and speech_ratio < 0.15:
        return False, f"鐜鍣０ (RMS={rms:.5f}, speech_ratio={speech_ratio:.2f})"

    if rms > 0.30:
        return False, f"鍓婃尝/鐖嗚鍣０ (RMS={rms:.3f}, speech_ratio={speech_ratio:.2f})"

    if speech_ratio < 0.10 and rms < 0.02:
        return False, f"鐤戜技闈炰汉澹?(RMS={rms:.5f}, speech_ratio={speech_ratio:.2f})"

    return True, f"妫€娴嬪埌璇煶 (RMS={rms:.5f}, speech_ratio={speech_ratio:.2f})"


NOISE_KEYWORDS = [
    "鍣煎暘", "鐖嗚", "鏉傞煶", "鍣煶", "鍣０", "闈欑數", "骞叉壈",
    "鏁呴殰绫?, "鏁版嵁鍑洪敊", "淇″彿鍙楀共鎵?, "鐢靛瓙鏁呴殰",
    "娌℃湁鏈夋晥浜哄０", "娌℃湁浠讳綍浜哄０", "娌℃湁鍑虹幇浜哄０",
    "鏃犱汉澹?, "鏃犳湁鏁堣闊?, "鍚笉娓?,
    "鏃犲０", "闈欓煶", "娌℃湁澹伴煶",
    "no valid speech", "no human voice",
]


def is_noise_transcript(text):
    """
    妫€娴?AI 杩斿洖鐨勬枃鏈槸鍚︿负"鍣０鎻忚堪"鑰岄潪鐪熷疄瀵硅瘽鍐呭銆?    杩斿洖 True 琛ㄧず搴旇涓㈠純杩欐潯鍥炲銆?    """
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

"""Voice activity segmentation for 16 kHz mono PCM audio."""

from collections import deque
from dataclasses import dataclass
import audioop


@dataclass(frozen=True)
class VoiceEvent:
    kind: str
    data: bytes = b""


class EnergyVad:
    """Fallback detector used when the WebRTC VAD wheel is unavailable."""

    def __init__(self, threshold: int = 420):
        self.threshold = threshold

    def __call__(self, frame: bytes, _sample_rate: int) -> bool:
        return audioop.rms(frame, 2) >= self.threshold


def create_detector(aggressiveness: int = 2):
    try:
        import webrtcvad

        vad = webrtcvad.Vad(max(0, min(3, aggressiveness)))
        return lambda frame, sample_rate: vad.is_speech(frame, sample_rate)
    except Exception:
        return EnergyVad()


class VoiceActivitySegmenter:
    """Turns arbitrary PCM chunks into speech-only frames and utterance boundaries."""

    def __init__(
        self,
        detector=None,
        sample_rate: int = 16000,
        frame_ms: int = 20,
        pre_roll_ms: int = 160,
        trailing_silence_ms: int = 640,
    ):
        if frame_ms not in (10, 20, 30):
            raise ValueError("frame_ms must be 10, 20, or 30")
        self.sample_rate = sample_rate
        self.frame_ms = frame_ms
        self.frame_bytes = sample_rate * frame_ms // 1000 * 2
        self.detector = detector or create_detector()
        self.pre_roll = deque(maxlen=max(0, pre_roll_ms // frame_ms))
        self.trailing_limit = max(1, trailing_silence_ms // frame_ms)
        self.buffer = bytearray()
        self.active = False
        self.trailing_frames = 0

    def feed(self, chunk: bytes):
        self.buffer.extend(chunk)
        events = []
        while len(self.buffer) >= self.frame_bytes:
            frame = bytes(self.buffer[: self.frame_bytes])
            del self.buffer[: self.frame_bytes]
            speech = bool(self.detector(frame, self.sample_rate))

            if not self.active:
                if not speech:
                    self.pre_roll.append(frame)
                    continue
                self.active = True
                self.trailing_frames = 0
                events.append(VoiceEvent("speech_start"))
                while self.pre_roll:
                    events.append(VoiceEvent("audio", self.pre_roll.popleft()))
                events.append(VoiceEvent("audio", frame))
                continue

            if speech:
                self.trailing_frames = 0
                events.append(VoiceEvent("audio", frame))
                continue

            self.trailing_frames += 1
            if self.trailing_frames >= self.trailing_limit:
                self.active = False
                self.trailing_frames = 0
                self.pre_roll.clear()
                events.append(VoiceEvent("speech_end"))

        return events

    def flush(self):
        events = []
        if self.active:
            self.active = False
            self.trailing_frames = 0
            self.pre_roll.clear()
            events.append(VoiceEvent("speech_end"))
        self.buffer.clear()
        return events

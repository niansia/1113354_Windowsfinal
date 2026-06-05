import array
import unittest

from voice_activity import VoiceActivitySegmenter


def pcm_frame(level: int, samples: int = 320) -> bytes:
    return array.array("h", [level] * samples).tobytes()


class VoiceActivitySegmenterTests(unittest.TestCase):
    def test_ignores_noise_and_finishes_after_trailing_silence(self):
        quiet = pcm_frame(80)
        speech = pcm_frame(8000)
        detector = lambda frame, _sample_rate: frame == speech
        segmenter = VoiceActivitySegmenter(
            detector=detector,
            frame_ms=20,
            pre_roll_ms=20,
            trailing_silence_ms=40,
        )

        events = []
        for chunk in (quiet, quiet, speech, speech, quiet, quiet):
            events.extend(segmenter.feed(chunk))

        self.assertEqual([event.kind for event in events], [
            "speech_start",
            "audio",
            "audio",
            "audio",
            "speech_end",
        ])
        self.assertEqual(events[1].data, quiet)
        self.assertEqual(events[2].data, speech)
        self.assertEqual(events[3].data, speech)

    def test_does_not_emit_audio_for_background_only_input(self):
        quiet = pcm_frame(120)
        segmenter = VoiceActivitySegmenter(
            detector=lambda _frame, _sample_rate: False,
            frame_ms=20,
            pre_roll_ms=40,
            trailing_silence_ms=60,
        )

        events = []
        for _ in range(20):
            events.extend(segmenter.feed(quiet))

        self.assertEqual(events, [])


if __name__ == "__main__":
    unittest.main()

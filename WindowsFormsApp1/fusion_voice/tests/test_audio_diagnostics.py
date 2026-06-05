import array
import unittest

from audio_diagnostics import dbfs_levels


class AudioDiagnosticsTests(unittest.TestCase):
    def test_reports_silence_at_floor(self):
        pcm = array.array("h", [0] * 320).tobytes()
        self.assertEqual(dbfs_levels(pcm), (-120.0, -120.0))

    def test_reports_audible_pcm_levels(self):
        pcm = array.array("h", [1000, -1000] * 160).tobytes()
        rms, peak = dbfs_levels(pcm)
        self.assertAlmostEqual(rms, -30.31, places=1)
        self.assertAlmostEqual(peak, -30.31, places=1)


if __name__ == "__main__":
    unittest.main()

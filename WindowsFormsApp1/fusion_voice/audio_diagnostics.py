"""Audio level helpers shared by the Fusion voice diagnostics."""

import array
import math


DBFS_FLOOR = -120.0
INT16_FULL_SCALE = 32768.0


def _to_dbfs(amplitude):
    if amplitude <= 0:
        return DBFS_FLOOR
    return max(DBFS_FLOOR, 20.0 * math.log10(amplitude / INT16_FULL_SCALE))


def dbfs_levels(pcm):
    """Return (RMS dBFS, peak dBFS) for little-endian signed 16-bit PCM."""
    if not pcm:
        return DBFS_FLOOR, DBFS_FLOOR

    samples = array.array("h")
    samples.frombytes(pcm[: len(pcm) - (len(pcm) % 2)])
    if not samples:
        return DBFS_FLOOR, DBFS_FLOOR

    peak = max(abs(sample) for sample in samples)
    if peak == 0:
        return DBFS_FLOOR, DBFS_FLOOR

    mean_square = sum(sample * sample for sample in samples) / len(samples)
    return round(_to_dbfs(math.sqrt(mean_square)), 2), round(_to_dbfs(peak), 2)

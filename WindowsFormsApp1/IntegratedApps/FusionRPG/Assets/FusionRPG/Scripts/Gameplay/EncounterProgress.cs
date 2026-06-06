using System;

namespace FusionRPG
{
    public enum EncounterProgressChange
    {
        None,
        WaveAdvanced,
        BossUnlocked
    }

    public sealed class EncounterProgress
    {
        private readonly int[] waveEnemyCounts;
        private int currentWaveIndex = -1;

        public EncounterProgress(int[] waveEnemyCounts)
        {
            if (waveEnemyCounts == null || waveEnemyCounts.Length == 0)
            {
                throw new ArgumentException("An encounter needs at least one enemy wave.", nameof(waveEnemyCounts));
            }

            this.waveEnemyCounts = new int[waveEnemyCounts.Length];
            for (var i = 0; i < waveEnemyCounts.Length; i++)
            {
                this.waveEnemyCounts[i] = Math.Max(1, waveEnemyCounts[i]);
            }
        }

        public int CurrentWaveNumber => currentWaveIndex < 0 ? 0 : Math.Min(currentWaveIndex + 1, waveEnemyCounts.Length);
        public int RemainingEnemies { get; private set; }
        public bool IsBossUnlocked { get; private set; }

        public void Start()
        {
            if (currentWaveIndex >= 0)
            {
                return;
            }

            currentWaveIndex = 0;
            RemainingEnemies = waveEnemyCounts[0];
        }

        public EncounterProgressChange NotifyEnemyDefeated()
        {
            if (currentWaveIndex < 0 || IsBossUnlocked || RemainingEnemies <= 0)
            {
                return EncounterProgressChange.None;
            }

            RemainingEnemies--;
            if (RemainingEnemies > 0)
            {
                return EncounterProgressChange.None;
            }

            currentWaveIndex++;
            if (currentWaveIndex >= waveEnemyCounts.Length)
            {
                IsBossUnlocked = true;
                return EncounterProgressChange.BossUnlocked;
            }

            RemainingEnemies = waveEnemyCounts[currentWaveIndex];
            return EncounterProgressChange.WaveAdvanced;
        }
    }
}

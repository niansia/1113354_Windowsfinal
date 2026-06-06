using System;

namespace FusionRPG
{
    public sealed class UltimateGauge
    {
        private readonly int maximum;

        public UltimateGauge(int maximum)
        {
            this.maximum = Math.Max(1, maximum);
        }

        public int Current { get; private set; }
        public int Maximum => maximum;
        public bool IsReady => Current >= maximum;
        public float Normalized => (float)Current / maximum;

        public void Gain(int amount)
        {
            if (amount <= 0)
            {
                return;
            }

            Current = Math.Min(maximum, Current + amount);
        }

        public bool TryConsume()
        {
            if (!IsReady)
            {
                return false;
            }

            Current = 0;
            return true;
        }
    }
}

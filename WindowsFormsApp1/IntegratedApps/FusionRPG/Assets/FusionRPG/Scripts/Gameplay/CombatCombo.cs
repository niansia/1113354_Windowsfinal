using System;

namespace FusionRPG
{
    public readonly struct ComboHit
    {
        public ComboHit(int index, int damage, float time)
        {
            Index = index;
            Damage = damage;
            Time = time;
        }

        public int Index { get; }
        public int Damage { get; }
        public float Time { get; }
    }

    public sealed class CombatCombo
    {
        private readonly int[] damageSequence;
        private readonly float resetWindowSeconds;
        private int nextIndex;
        private float lastHitTime = float.NegativeInfinity;

        public CombatCombo(int[] damageSequence, float resetWindowSeconds)
        {
            if (damageSequence == null || damageSequence.Length == 0)
            {
                throw new ArgumentException("A combo needs at least one damage value.", nameof(damageSequence));
            }

            this.damageSequence = new int[damageSequence.Length];
            for (var i = 0; i < damageSequence.Length; i++)
            {
                this.damageSequence[i] = Math.Max(1, damageSequence[i]);
            }

            this.resetWindowSeconds = Math.Max(0.1f, resetWindowSeconds);
        }

        public ComboHit NextHit(float time)
        {
            if (nextIndex != 0 && time - lastHitTime > resetWindowSeconds)
            {
                nextIndex = 0;
            }

            var index = nextIndex;
            var hit = new ComboHit(index, damageSequence[index], time);
            lastHitTime = time;
            nextIndex = (nextIndex + 1) % damageSequence.Length;
            return hit;
        }

        public void Reset()
        {
            nextIndex = 0;
            lastHitTime = float.NegativeInfinity;
        }
    }
}

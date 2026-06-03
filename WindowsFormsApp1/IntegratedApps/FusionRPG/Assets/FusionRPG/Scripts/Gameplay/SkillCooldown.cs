using System;

namespace FusionRPG
{
    public sealed class SkillCooldown
    {
        private readonly float duration;
        private float remaining;

        public SkillCooldown(float duration)
        {
            this.duration = Math.Max(0.1f, duration);
        }

        public bool IsReady => remaining <= 0f;
        public float RemainingSeconds => remaining;
        public float NormalizedRemaining => duration <= 0f ? 0f : Math.Min(1f, Math.Max(0f, remaining / duration));

        public bool TryUse()
        {
            if (!IsReady)
            {
                return false;
            }

            remaining = duration;
            return true;
        }

        public void Tick(float deltaTime)
        {
            if (remaining <= 0f)
            {
                remaining = 0f;
                return;
            }

            remaining = Math.Max(0f, remaining - Math.Max(0f, deltaTime));
        }

        public void Reset()
        {
            remaining = 0f;
        }
    }
}

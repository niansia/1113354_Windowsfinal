namespace FusionRPG
{
    public enum BossPhase
    {
        PhaseOne = 1,
        PhaseTwo = 2,
        PhaseThree = 3
    }

    public sealed class BossPhaseState
    {
        public BossPhase Current { get; private set; } = BossPhase.PhaseOne;

        public BossPhase Update(float healthRatio)
        {
            BossPhase requested;
            if (healthRatio <= 0.3f)
            {
                requested = BossPhase.PhaseThree;
            }
            else if (healthRatio <= 0.65f)
            {
                requested = BossPhase.PhaseTwo;
            }
            else
            {
                requested = BossPhase.PhaseOne;
            }

            if (requested > Current)
            {
                Current = requested;
            }

            return Current;
        }
    }
}

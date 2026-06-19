namespace FusionRPG
{
    public sealed class CombatTargeting
    {
        public Health Selected { get; private set; }

        public void SetTarget(Health target)
        {
            Selected = target != null && !target.IsDead ? target : null;
        }

        public void Clear()
        {
            Selected = null;
        }

        public void Refresh()
        {
            if (Selected == null || Selected.IsDead)
            {
                Selected = null;
            }
        }
    }
}

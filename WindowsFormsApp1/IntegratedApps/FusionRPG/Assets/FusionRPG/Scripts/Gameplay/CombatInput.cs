using UnityEngine;

namespace FusionRPG
{
    public enum CombatAction
    {
        None,
        BasicAttack,
        QuickSkill,
        AreaSkill,
        DashSkill,
        Ultimate
    }

    public static class CombatInputBindings
    {
        public static bool IsMovementKey(KeyCode key)
        {
            return key == KeyCode.UpArrow ||
                   key == KeyCode.DownArrow ||
                   key == KeyCode.LeftArrow ||
                   key == KeyCode.RightArrow;
        }

        public static CombatAction ActionFor(KeyCode key)
        {
            switch (key)
            {
                case KeyCode.A:
                    return CombatAction.BasicAttack;
                case KeyCode.W:
                    return CombatAction.QuickSkill;
                case KeyCode.Q:
                    return CombatAction.AreaSkill;
                case KeyCode.E:
                    return CombatAction.DashSkill;
                case KeyCode.R:
                    return CombatAction.Ultimate;
                default:
                    return CombatAction.None;
            }
        }

        public static Vector2 ReadMovement()
        {
            var x = 0f;
            var y = 0f;
            if (Input.GetKey(KeyCode.LeftArrow)) x -= 1f;
            if (Input.GetKey(KeyCode.RightArrow)) x += 1f;
            if (Input.GetKey(KeyCode.DownArrow)) y -= 1f;
            if (Input.GetKey(KeyCode.UpArrow)) y += 1f;
            return Vector2.ClampMagnitude(new Vector2(x, y), 1f);
        }
    }

    public sealed class AbilityCooldownSet
    {
        private readonly SkillCooldown quick;
        private readonly SkillCooldown area;
        private readonly SkillCooldown dash;

        public AbilityCooldownSet(float quickSeconds, float areaSeconds, float dashSeconds)
        {
            quick = new SkillCooldown(quickSeconds);
            area = new SkillCooldown(areaSeconds);
            dash = new SkillCooldown(dashSeconds);
        }

        public void Tick(float deltaTime)
        {
            quick.Tick(deltaTime);
            area.Tick(deltaTime);
            dash.Tick(deltaTime);
        }

        public bool TryUse(CombatAction action)
        {
            var cooldown = Get(action);
            return cooldown != null && cooldown.TryUse();
        }

        public float NormalizedRemaining(CombatAction action)
        {
            var cooldown = Get(action);
            return cooldown == null ? 0f : cooldown.NormalizedRemaining;
        }

        private SkillCooldown Get(CombatAction action)
        {
            switch (action)
            {
                case CombatAction.QuickSkill:
                    return quick;
                case CombatAction.AreaSkill:
                    return area;
                case CombatAction.DashSkill:
                    return dash;
                default:
                    return null;
            }
        }
    }

    public sealed class AerialAttackState
    {
        public bool IsArmed { get; private set; }

        public bool TryArm(bool isGrounded)
        {
            if (isGrounded || IsArmed)
            {
                return false;
            }

            IsArmed = true;
            return true;
        }

        public bool TryConsumeLanding(bool wasGrounded, bool isGrounded)
        {
            if (!IsArmed || wasGrounded || !isGrounded)
            {
                return false;
            }

            IsArmed = false;
            return true;
        }

        public void Clear()
        {
            IsArmed = false;
        }
    }
}

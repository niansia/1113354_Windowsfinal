using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(DamageHitbox))]
    public sealed class PlayerCombat : MonoBehaviour
    {
        [SerializeField] private Transform hitOrigin;
        [SerializeField] private SkillEffect skillEffect;
        [SerializeField] private int[] comboDamage = { 16, 22, 34 };
        [SerializeField] private float comboResetWindow = 0.7f;
        [SerializeField] private float attackRadius = 1.7f;
        [SerializeField] private float attackForwardOffset = 1.25f;
        [SerializeField] private float attackCooldown = 0.28f;
        [SerializeField] private float skillCooldownSeconds = 4.5f;
        [SerializeField] private float mouseClickDragThreshold = 8f;
        [SerializeField] private LayerMask targetLayers = ~0;

        private DamageHitbox hitbox;
        private CombatCombo combo;
        private SkillCooldown skillCooldown;
        private float nextAttackTime;
        private Vector2 leftMouseDownPosition;
        private Vector2 rightMouseDownPosition;
        private bool leftMouseDragged;
        private bool rightMouseDragged;

        public float SkillCooldownRemaining01 => skillCooldown == null ? 0f : skillCooldown.NormalizedRemaining;

        private void Awake()
        {
            hitbox = GetComponent<DamageHitbox>();
            combo = new CombatCombo(comboDamage, comboResetWindow);
            skillCooldown = new SkillCooldown(skillCooldownSeconds);
            if (hitOrigin == null)
            {
                hitOrigin = transform;
            }
        }

        private void Update()
        {
            skillCooldown.Tick(Time.deltaTime);

            if (ConsumeMouseClick(0, ref leftMouseDownPosition, ref leftMouseDragged))
            {
                TryBasicAttack(Time.time);
            }

            if (Input.GetKeyDown(KeyCode.E) || ConsumeMouseClick(1, ref rightMouseDownPosition, ref rightMouseDragged))
            {
                TrySkill(Time.time);
            }
        }

        private bool ConsumeMouseClick(int button, ref Vector2 downPosition, ref bool dragged)
        {
            if (Input.GetMouseButtonDown(button))
            {
                downPosition = Input.mousePosition;
                dragged = false;
            }

            if (Input.GetMouseButton(button))
            {
                var delta = (Vector2)Input.mousePosition - downPosition;
                dragged |= delta.sqrMagnitude > mouseClickDragThreshold * mouseClickDragThreshold;
            }

            return Input.GetMouseButtonUp(button) && !dragged;
        }

        public bool TryBasicAttack(float time)
        {
            if (time < nextAttackTime)
            {
                return false;
            }

            var hit = combo.NextHit(time);
            hitbox.Configure(hit.Damage, attackRadius, targetLayers);
            var center = hitOrigin.position + transform.forward * attackForwardOffset + Vector3.up * 0.8f;
            hitbox.Apply(center, transform);
            nextAttackTime = time + attackCooldown;
            return true;
        }

        public bool TrySkill(float time)
        {
            if (!skillCooldown.TryUse())
            {
                return false;
            }

            if (skillEffect != null)
            {
                skillEffect.Cast(transform.position + Vector3.up * 0.3f, transform, targetLayers);
            }
            return true;
        }

        public void ConfigureForPrototype(SkillEffect nextSkillEffect, LayerMask nextTargetLayers)
        {
            skillEffect = nextSkillEffect;
            targetLayers = nextTargetLayers;
        }
    }
}

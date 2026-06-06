using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(DamageHitbox))]
    [RequireComponent(typeof(PlayerController))]
    [RequireComponent(typeof(Health))]
    public sealed class PlayerCombat : MonoBehaviour
    {
        [Header("Basic Attack")]
        [SerializeField] private Transform hitOrigin;
        [SerializeField] private int[] comboDamage = { 18, 26, 40 };
        [SerializeField] private float comboResetWindow = 0.72f;
        [SerializeField] private float attackRadius = 1.15f;
        [SerializeField] private float attackForwardOffset = 1.05f;
        [SerializeField] private float attackCooldown = 0.26f;

        [Header("Skills")]
        [SerializeField] private float quickSkillCooldown = 2.4f;
        [SerializeField] private float areaSkillCooldown = 5.8f;
        [SerializeField] private float dashSkillCooldown = 7.2f;
        [SerializeField] private int quickSkillDamage = 25;
        [SerializeField] private int areaSkillDamage = 44;
        [SerializeField] private int dashSkillDamage = 52;
        [SerializeField] private int aerialDamage = 48;
        [SerializeField] private int ultimatePulseDamage = 26;
        [SerializeField] private LayerMask targetLayers = ~0;

        [Header("VFX")]
        [SerializeField] private GameObject basicHitVfx;
        [SerializeField] private GameObject quickSkillVfx;
        [SerializeField] private GameObject areaSkillVfx;
        [SerializeField] private GameObject dashSkillVfx;
        [SerializeField] private GameObject ultimateVfx;
        [SerializeField] private Material fallbackVfxMaterial;

        private DamageHitbox hitbox;
        private PlayerController movement;
        private Health health;
        private CombatCombo combo;
        private AbilityCooldownSet cooldowns;
        private UltimateGauge ultimate;
        private AerialAttackState aerial;
        private float nextAttackTime;
        private bool wasGrounded;
        private Coroutine dashRoutine;
        private Coroutine ultimateRoutine;
        private float aerialQueueTimer;

        public float SkillCooldownRemaining01 => AreaCooldownRemaining01;
        public float QuickCooldownRemaining01 => cooldowns == null ? 0f : cooldowns.NormalizedRemaining(CombatAction.QuickSkill);
        public float AreaCooldownRemaining01 => cooldowns == null ? 0f : cooldowns.NormalizedRemaining(CombatAction.AreaSkill);
        public float DashCooldownRemaining01 => cooldowns == null ? 0f : cooldowns.NormalizedRemaining(CombatAction.DashSkill);
        public float UltimateNormalized => ultimate == null ? 0f : ultimate.Normalized;
        public bool IsUltimateReady => ultimate != null && ultimate.IsReady;
        public bool IsAerialAttackArmed => aerial != null && aerial.IsArmed;

        private void Awake()
        {
            hitbox = GetComponent<DamageHitbox>();
            movement = GetComponent<PlayerController>();
            health = GetComponent<Health>();
            combo = new CombatCombo(comboDamage, comboResetWindow);
            cooldowns = new AbilityCooldownSet(quickSkillCooldown, areaSkillCooldown, dashSkillCooldown);
            ultimate = new UltimateGauge(100);
            aerial = new AerialAttackState();
            hitOrigin = hitOrigin == null ? transform : hitOrigin;
            wasGrounded = movement.IsGrounded;
            health.Damaged += HandlePlayerDamaged;
        }

        private void Update()
        {
            cooldowns.Tick(Time.deltaTime);
            aerialQueueTimer = Mathf.Max(0f, aerialQueueTimer - Time.deltaTime);

            var grounded = movement.IsGrounded;
            if (aerialQueueTimer > 0f && !grounded)
            {
                aerialQueueTimer = 0f;
                TryBasicAttack(Time.time);
            }
            if (aerial.TryConsumeLanding(wasGrounded, grounded))
            {
                ExecuteAerialImpact();
            }
            wasGrounded = grounded;

            if (Input.GetKeyDown(KeyCode.A))
            {
                if (grounded && Input.GetKey(KeyCode.Space))
                {
                    aerialQueueTimer = 0.35f;
                }
                else
                {
                    TryBasicAttack(Time.time);
                }
            }
            if (Input.GetKeyDown(KeyCode.W))
            {
                TryQuickSkill();
            }
            if (Input.GetKeyDown(KeyCode.Q))
            {
                TryAreaSkill();
            }
            if (Input.GetKeyDown(KeyCode.E))
            {
                TryDashSkill();
            }
            if (Input.GetKeyDown(KeyCode.R))
            {
                TryUltimate();
            }
        }

        public bool TryBasicAttack(float time)
        {
            if (!movement.IsGrounded)
            {
                if (!aerial.TryArm(false))
                {
                    return false;
                }

                movement.BeginPlunge(16f);
                CombatVfx.Spawn(basicHitVfx, transform.position + Vector3.up * 0.35f, transform.rotation, 0.7f, 0.6f, fallbackVfxMaterial);
                return true;
            }

            if (time < nextAttackTime)
            {
                return false;
            }

            var hit = combo.NextHit(time);
            hitbox.Configure(hit.Damage, attackRadius + hit.Index * 0.12f, targetLayers);
            var center = hitOrigin.position + transform.forward * (attackForwardOffset + hit.Index * 0.08f) + Vector3.up * 0.72f;
            var damaged = hitbox.Apply(center, transform);
            GainUltimateFromDamage(hit.Damage, damaged);
            CombatVfx.Spawn(basicHitVfx, center, transform.rotation, 0.45f + hit.Index * 0.12f, 0.45f, fallbackVfxMaterial);
            nextAttackTime = time + attackCooldown;
            return true;
        }

        public bool TryQuickSkill()
        {
            if (!cooldowns.TryUse(CombatAction.QuickSkill))
            {
                return false;
            }

            var projectile = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            projectile.name = "Sakura Quick Skill Projectile";
            projectile.transform.SetPositionAndRotation(
                transform.position + Vector3.up * 0.75f + transform.forward * 0.45f,
                transform.rotation);
            projectile.transform.localScale = Vector3.one * 0.25f;
            var collider = projectile.GetComponent<Collider>();
            if (collider != null)
            {
                Destroy(collider);
            }
            var renderer = projectile.GetComponent<Renderer>();
            if (renderer != null && fallbackVfxMaterial != null)
            {
                renderer.sharedMaterial = fallbackVfxMaterial;
            }
            projectile.AddComponent<CombatProjectile>().Initialize(transform, quickSkillDamage, 14f, 0.28f, 2.8f, targetLayers);
            CombatVfx.Spawn(quickSkillVfx, projectile.transform.position, projectile.transform.rotation, 0.5f, 0.8f, fallbackVfxMaterial);
            ultimate.Gain(4);
            return true;
        }

        public bool TryAreaSkill()
        {
            if (!cooldowns.TryUse(CombatAction.AreaSkill))
            {
                return false;
            }

            hitbox.Configure(areaSkillDamage, 3.3f, targetLayers);
            var damaged = hitbox.Apply(transform.position + Vector3.up * 0.55f, transform);
            GainUltimateFromDamage(areaSkillDamage, damaged);
            CombatVfx.Spawn(areaSkillVfx, transform.position + Vector3.up * 0.08f, Quaternion.identity, 1.2f, 2f, fallbackVfxMaterial);
            return true;
        }

        public bool TrySkill(float time)
        {
            return TryAreaSkill();
        }

        public bool TryDashSkill()
        {
            if (dashRoutine != null || !cooldowns.TryUse(CombatAction.DashSkill))
            {
                return false;
            }

            dashRoutine = StartCoroutine(DashStrike());
            return true;
        }

        public bool TryUltimate()
        {
            if (ultimateRoutine != null || !ultimate.TryConsume())
            {
                return false;
            }

            ultimateRoutine = StartCoroutine(UltimateField());
            return true;
        }

        public void ConfigureForPrototype(SkillEffect unusedLegacySkill, LayerMask nextTargetLayers)
        {
            targetLayers = nextTargetLayers;
        }

        public void ConfigureVfx(
            GameObject nextBasicHit,
            GameObject nextQuick,
            GameObject nextArea,
            GameObject nextDash,
            GameObject nextUltimate,
            Material fallbackMaterial)
        {
            basicHitVfx = nextBasicHit;
            quickSkillVfx = nextQuick;
            areaSkillVfx = nextArea;
            dashSkillVfx = nextDash;
            ultimateVfx = nextUltimate;
            fallbackVfxMaterial = fallbackMaterial;
        }

        public void GainUltimate(int amount)
        {
            ultimate.Gain(amount);
        }

        private IEnumerator DashStrike()
        {
            var direction = transform.forward;
            var damagedTargets = new HashSet<Health>();
            var elapsed = 0f;
            const float duration = 0.32f;
            const float speed = 11f;
            CombatVfx.Spawn(dashSkillVfx, transform.position + Vector3.up * 0.5f, transform.rotation, 0.9f, 1.2f, fallbackVfxMaterial);

            while (elapsed < duration)
            {
                var deltaTime = Mathf.Min(Time.deltaTime, duration - elapsed);
                movement.MoveExternal(direction * (speed * deltaTime));
                hitbox.Configure(dashSkillDamage, 1.05f, targetLayers);
                var center = transform.position + direction * 0.75f + Vector3.up * 0.65f;
                var newlyDamaged = hitbox.Apply(center, transform, damagedTargets);
                GainUltimateFromDamage(dashSkillDamage, newlyDamaged);
                elapsed += deltaTime;
                yield return null;
            }

            dashRoutine = null;
        }

        private IEnumerator UltimateField()
        {
            health.SetIncomingDamageMultiplier(0.4f);
            CombatVfx.Spawn(ultimateVfx, transform.position, Quaternion.identity, 1.8f, 3.2f, fallbackVfxMaterial);

            for (var pulse = 0; pulse < 5; pulse++)
            {
                hitbox.Configure(ultimatePulseDamage, 5.8f, targetLayers);
                hitbox.Apply(transform.position + Vector3.up * 0.5f, transform);
                yield return new WaitForSeconds(0.34f);
            }

            health.SetIncomingDamageMultiplier(1f);
            ultimateRoutine = null;
        }

        private void ExecuteAerialImpact()
        {
            hitbox.Configure(aerialDamage, 2.45f, targetLayers);
            var center = transform.position + Vector3.up * 0.35f;
            var damaged = hitbox.Apply(center, transform);
            GainUltimateFromDamage(aerialDamage, damaged);
            CombatVfx.Spawn(areaSkillVfx, transform.position + Vector3.up * 0.05f, Quaternion.identity, 0.9f, 1.3f, fallbackVfxMaterial);
        }

        private void GainUltimateFromDamage(int damage, int targetCount)
        {
            if (targetCount <= 0)
            {
                return;
            }

            ultimate.Gain(Mathf.Clamp(Mathf.CeilToInt(damage * 0.18f) * targetCount, 1, 24));
        }

        private void HandlePlayerDamaged(int amount)
        {
            ultimate.Gain(Mathf.Clamp(Mathf.CeilToInt(amount * 0.35f), 1, 12));
        }

        private void OnDestroy()
        {
            if (health != null)
            {
                health.Damaged -= HandlePlayerDamaged;
                health.SetIncomingDamageMultiplier(1f);
            }
        }
    }
}

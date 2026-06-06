using System.Collections.Generic;
using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(CharacterController))]
    [RequireComponent(typeof(Health))]
    [RequireComponent(typeof(EnemyAttack))]
    public sealed class BossController : MonoBehaviour
    {
        private enum BossAttack
        {
            Swipe,
            Charge,
            Slam,
            Pulse
        }

        private enum BossState
        {
            Pursuit,
            Telegraph,
            Charge,
            Recovery,
            Dead
        }

        [SerializeField] private Transform target;
        [SerializeField] private float detectionRange = 22f;
        [SerializeField] private LayerMask targetLayers = ~0;

        private CharacterController controller;
        private Health health;
        private EnemyAttack attack;
        private EnemyProceduralAnimator visualAnimator;
        private readonly BossPhaseState phases = new BossPhaseState();
        private readonly HashSet<Health> chargeHits = new HashSet<Health>();
        private BossState state;
        private BossAttack activeAttack;
        private float stateTimer;
        private float verticalVelocity;
        private int attackSequence;
        private Vector3 chargeDirection;

        public BossPhase CurrentPhase => phases.Current;
        public int AttackPatternCount => 4;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            health = GetComponent<Health>();
            attack = GetComponent<EnemyAttack>();
            visualAnimator = GetComponent<EnemyProceduralAnimator>();
            health.Died += HandleDeath;
            state = BossState.Pursuit;
        }

        private void Update()
        {
            if (health.IsDead || target == null)
            {
                ApplyGravity();
                return;
            }

            var previousPhase = phases.Current;
            var phase = phases.Update(health.Ratio);
            if (phase != previousPhase)
            {
                visualAnimator?.PlayPhaseTransition();
                state = BossState.Recovery;
                stateTimer = 1.05f;
            }

            var offset = target.position - transform.position;
            offset.y = 0f;
            var distance = offset.magnitude;

            switch (state)
            {
                case BossState.Telegraph:
                    UpdateTelegraph(offset);
                    break;
                case BossState.Charge:
                    UpdateCharge();
                    break;
                case BossState.Recovery:
                    stateTimer -= Time.deltaTime;
                    visualAnimator?.SetMovement(0f);
                    ApplyGravity();
                    if (stateTimer <= 0f)
                    {
                        state = BossState.Pursuit;
                    }
                    break;
                default:
                    UpdatePursuit(offset, distance);
                    break;
            }
        }

        public void SetTarget(Transform nextTarget)
        {
            target = nextTarget;
        }

        public void Configure(LayerMask layers)
        {
            targetLayers = layers;
        }

        private void UpdatePursuit(Vector3 offset, float distance)
        {
            if (distance > detectionRange)
            {
                visualAnimator?.SetMovement(0f);
                ApplyGravity();
                return;
            }

            var preferredRange = CurrentPhase == BossPhase.PhaseOne ? 2.2f : 2.8f;
            if (distance > preferredRange)
            {
                var direction = offset.sqrMagnitude > 0.001f ? offset.normalized : transform.forward;
                FaceDirection(direction);
                var speed = CurrentPhase == BossPhase.PhaseOne ? 2.25f : CurrentPhase == BossPhase.PhaseTwo ? 2.9f : 3.45f;
                MoveWithSubsteps(direction * (speed * Time.deltaTime));
                visualAnimator?.SetMovement(1f);
                ApplyGravity();
                return;
            }

            BeginNextAttack(offset);
            ApplyGravity();
        }

        private void BeginNextAttack(Vector3 offset)
        {
            var availableCount = CurrentPhase == BossPhase.PhaseOne ? 2 : 4;
            activeAttack = (BossAttack)(attackSequence % availableCount);
            attackSequence++;
            if (CurrentPhase == BossPhase.PhaseThree && attackSequence % 3 == 0)
            {
                activeAttack = BossAttack.Pulse;
            }

            FaceDirection(offset);
            chargeDirection = transform.forward;
            state = BossState.Telegraph;
            stateTimer = TelegraphDuration(activeAttack);
            visualAnimator?.PlayAttack();
        }

        private void UpdateTelegraph(Vector3 offset)
        {
            FaceDirection(offset);
            visualAnimator?.SetMovement(0f);
            stateTimer -= Time.deltaTime;
            ApplyGravity();
            if (stateTimer > 0f)
            {
                return;
            }

            switch (activeAttack)
            {
                case BossAttack.Charge:
                    chargeHits.Clear();
                    chargeDirection = transform.forward;
                    state = BossState.Charge;
                    stateTimer = CurrentPhase == BossPhase.PhaseOne ? 0.55f : 0.72f;
                    return;
                case BossAttack.Slam:
                    attack.ApplySphere(transform.position + Vector3.up * 0.35f, 3.35f, PhaseDamage(30, 38, 48), transform);
                    break;
                case BossAttack.Pulse:
                    attack.ApplySphere(transform.position + Vector3.up * 0.55f, 4.8f, PhaseDamage(22, 30, 42), transform);
                    break;
                default:
                    attack.ApplySphere(transform.position + transform.forward * 1.25f + Vector3.up * 0.7f, 1.55f, PhaseDamage(20, 27, 36), transform);
                    break;
            }

            BeginRecovery();
        }

        private void UpdateCharge()
        {
            var speed = CurrentPhase == BossPhase.PhaseThree ? 12f : 9.5f;
            MoveWithSubsteps(chargeDirection * (speed * Time.deltaTime));
            attack.ApplySphere(
                transform.position + chargeDirection * 0.75f + Vector3.up * 0.65f,
                1.35f,
                PhaseDamage(24, 34, 46),
                transform,
                chargeHits);
            visualAnimator?.SetMovement(1f);
            stateTimer -= Time.deltaTime;
            ApplyGravity();
            if (stateTimer <= 0f)
            {
                BeginRecovery();
            }
        }

        private void BeginRecovery()
        {
            state = BossState.Recovery;
            stateTimer = CurrentPhase == BossPhase.PhaseOne ? 1.1f : CurrentPhase == BossPhase.PhaseTwo ? 0.82f : 0.58f;
        }

        private int PhaseDamage(int phaseOne, int phaseTwo, int phaseThree)
        {
            switch (CurrentPhase)
            {
                case BossPhase.PhaseThree:
                    return phaseThree;
                case BossPhase.PhaseTwo:
                    return phaseTwo;
                default:
                    return phaseOne;
            }
        }

        private static float TelegraphDuration(BossAttack bossAttack)
        {
            switch (bossAttack)
            {
                case BossAttack.Charge:
                    return 0.72f;
                case BossAttack.Slam:
                    return 0.88f;
                case BossAttack.Pulse:
                    return 1.05f;
                default:
                    return 0.48f;
            }
        }

        private void FaceDirection(Vector3 direction)
        {
            direction.y = 0f;
            if (direction.sqrMagnitude <= 0.001f)
            {
                return;
            }

            transform.rotation = Quaternion.RotateTowards(
                transform.rotation,
                Quaternion.LookRotation(direction.normalized, Vector3.up),
                360f * Time.deltaTime);
        }

        private void ApplyGravity()
        {
            if (!controller.enabled)
            {
                return;
            }

            if (controller.isGrounded && verticalVelocity < 0f)
            {
                verticalVelocity = -2f;
            }
            verticalVelocity += Physics.gravity.y * Time.deltaTime;
            MoveWithSubsteps(Vector3.up * (verticalVelocity * Time.deltaTime));
        }

        private void MoveWithSubsteps(Vector3 motion)
        {
            if (!controller.enabled)
            {
                return;
            }

            var distance = motion.magnitude;
            var steps = Mathf.Clamp(Mathf.CeilToInt(distance / 0.065f), 1, 32);
            var step = motion / steps;
            for (var i = 0; i < steps; i++)
            {
                controller.Move(step);
            }
        }

        private void HandleDeath()
        {
            state = BossState.Dead;
            controller.enabled = false;
            foreach (var hurtbox in GetComponentsInChildren<CombatHurtbox>(true))
            {
                hurtbox.GetComponent<Collider>().enabled = false;
            }
            visualAnimator?.PlayDeath();
        }

        private void OnDestroy()
        {
            if (health != null)
            {
                health.Died -= HandleDeath;
            }
        }
    }
}

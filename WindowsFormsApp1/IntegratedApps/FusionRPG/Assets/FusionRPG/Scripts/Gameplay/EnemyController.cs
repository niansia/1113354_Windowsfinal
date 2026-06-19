using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(CharacterController))]
    [RequireComponent(typeof(Health))]
    [RequireComponent(typeof(EnemyAttack))]
    public sealed class EnemyController : MonoBehaviour
    {
        private enum EnemyState
        {
            Idle,
            Pursuit,
            Telegraph,
            Recovery,
            Dead
        }

        [SerializeField] private Transform target;
        [SerializeField] private float detectionRange = 13f;
        [SerializeField] private float moveSpeed = 2.6f;
        [SerializeField] private float attackRange = 1.65f;
        [SerializeField] private float telegraphDuration = 0.42f;
        [SerializeField] private float recoveryDuration = 0.72f;
        [SerializeField] private int contactDamage = 12;

        private CharacterController controller;
        private Health health;
        private EnemyAttack attack;
        private EnemyProceduralAnimator visualAnimator;
        private EnemyState state;
        private float stateTimer;
        private float verticalVelocity;

        public Transform Target => target;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            health = GetComponent<Health>();
            attack = GetComponent<EnemyAttack>();
            visualAnimator = GetComponent<EnemyProceduralAnimator>();
            health.Died += HandleDeath;
        }

        private void Update()
        {
            if (health.IsDead || target == null)
            {
                visualAnimator?.SetMovement(0f);
                ApplyGravity();
                return;
            }

            var offset = target.position - transform.position;
            offset.y = 0f;
            var distance = offset.magnitude;

            switch (state)
            {
                case EnemyState.Telegraph:
                    UpdateTelegraph(offset, distance);
                    break;
                case EnemyState.Recovery:
                    stateTimer -= Time.deltaTime;
                    visualAnimator?.SetMovement(0f);
                    if (stateTimer <= 0f)
                    {
                        state = EnemyState.Pursuit;
                    }
                    ApplyGravity();
                    break;
                default:
                    if (distance > detectionRange)
                    {
                        state = EnemyState.Idle;
                        visualAnimator?.SetMovement(0f);
                        ApplyGravity();
                    }
                    else if (distance > attackRange)
                    {
                        state = EnemyState.Pursuit;
                        MoveTowards(offset);
                    }
                    else
                    {
                        BeginAttack();
                        ApplyGravity();
                    }
                    break;
            }
        }

        public void SetTarget(Transform nextTarget)
        {
            target = nextTarget;
        }

        public void Configure(float nextMoveSpeed, float nextDetectionRange, float nextAttackRange, float nextAttackInterval, int nextDamage)
        {
            moveSpeed = Mathf.Max(0.1f, nextMoveSpeed);
            attackRange = Mathf.Max(0.3f, nextAttackRange);
            detectionRange = Mathf.Max(attackRange, nextDetectionRange);
            recoveryDuration = Mathf.Max(0.1f, nextAttackInterval);
            contactDamage = Mathf.Max(1, nextDamage);
        }

        private void BeginAttack()
        {
            state = EnemyState.Telegraph;
            stateTimer = telegraphDuration;
            visualAnimator?.PlayAttack();
        }

        private void UpdateTelegraph(Vector3 offset, float distance)
        {
            visualAnimator?.SetMovement(0f);
            FaceDirection(offset);
            stateTimer -= Time.deltaTime;
            ApplyGravity();
            if (stateTimer > 0f)
            {
                return;
            }

            if (distance <= attackRange + 0.55f)
            {
                var center = transform.position + transform.forward * 0.85f + Vector3.up * 0.55f;
                attack.ApplySphere(center, 1.05f, contactDamage, transform);
            }

            state = EnemyState.Recovery;
            stateTimer = recoveryDuration;
        }

        private void MoveTowards(Vector3 offset)
        {
            var direction = offset.sqrMagnitude > 0.001f ? offset.normalized : transform.forward;
            FaceDirection(direction);
            var motion = direction * (moveSpeed * Time.deltaTime);
            MoveWithSubsteps(motion);
            visualAnimator?.SetMovement(1f);
            ApplyGravity();
        }

        private void FaceDirection(Vector3 direction)
        {
            direction.y = 0f;
            if (direction.sqrMagnitude <= 0.001f)
            {
                return;
            }

            var targetRotation = Quaternion.LookRotation(direction.normalized, Vector3.up);
            transform.rotation = Quaternion.RotateTowards(transform.rotation, targetRotation, 420f * Time.deltaTime);
        }

        private void ApplyGravity()
        {
            if (controller.isGrounded && verticalVelocity < 0f)
            {
                verticalVelocity = -2f;
            }
            verticalVelocity += Physics.gravity.y * Time.deltaTime;
            MoveWithSubsteps(Vector3.up * (verticalVelocity * Time.deltaTime));
        }

        private void MoveWithSubsteps(Vector3 motion)
        {
            var distance = motion.magnitude;
            var steps = Mathf.Clamp(Mathf.CeilToInt(distance / 0.07f), 1, 24);
            var step = motion / steps;
            for (var i = 0; i < steps; i++)
            {
                controller.Move(step);
            }
        }

        private void HandleDeath()
        {
            state = EnemyState.Dead;
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

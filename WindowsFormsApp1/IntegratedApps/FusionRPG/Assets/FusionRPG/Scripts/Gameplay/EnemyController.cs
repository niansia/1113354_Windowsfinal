using UnityEngine;

namespace FusionRPG
{
    [RequireComponent(typeof(CharacterController))]
    [RequireComponent(typeof(Health))]
    public sealed class EnemyController : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private float detectionRange = 8.5f;
        [SerializeField] private float moveSpeed = 2.4f;
        [SerializeField] private float attackRange = 1.35f;
        [SerializeField] private float attackInterval = 1.15f;
        [SerializeField] private int contactDamage = 10;

        private CharacterController controller;
        private Health health;
        private float verticalVelocity;
        private float nextAttackTime;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            health = GetComponent<Health>();
            health.Died += HandleDeath;
        }

        private void Update()
        {
            if (health.IsDead || target == null)
            {
                return;
            }

            var offset = target.position - transform.position;
            offset.y = 0f;
            var distance = offset.magnitude;
            if (distance > detectionRange)
            {
                ApplyGravity();
                return;
            }

            if (distance > attackRange)
            {
                var direction = offset.normalized;
                transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(direction, Vector3.up), 480f * Time.deltaTime);
                var motion = direction * moveSpeed;
                motion.y = verticalVelocity;
                controller.Move(motion * Time.deltaTime);
            }
            else
            {
                TryAttack();
                ApplyGravity();
            }
        }

        public void SetTarget(Transform nextTarget)
        {
            target = nextTarget;
        }

        private void TryAttack()
        {
            if (Time.time < nextAttackTime)
            {
                return;
            }

            nextAttackTime = Time.time + attackInterval;
            var targetHealth = target.GetComponentInParent<Health>();
            if (targetHealth != null)
            {
                targetHealth.ApplyDamage(contactDamage);
            }
        }

        private void ApplyGravity()
        {
            if (controller.isGrounded && verticalVelocity < 0f)
            {
                verticalVelocity = -2f;
            }
            verticalVelocity += Physics.gravity.y * Time.deltaTime;
            controller.Move(new Vector3(0f, verticalVelocity, 0f) * Time.deltaTime);
        }

        private void HandleDeath()
        {
            foreach (var collider in GetComponentsInChildren<Collider>())
            {
                collider.enabled = false;
            }
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

using UnityEngine;

namespace FusionRPG
{
    public sealed class EnemyProceduralAnimator : MonoBehaviour
    {
        [SerializeField] private Transform visualRoot;
        [SerializeField] private float idleAmplitude = 0.025f;
        [SerializeField] private float moveBob = 0.06f;
        [SerializeField] private float moveFrequency = 7f;

        private Vector3 basePosition;
        private Vector3 baseScale;
        private Quaternion baseRotation;
        private float movementAmount;
        private float attackPulse;
        private float hitPulse;
        private float phasePulse;
        private bool dead;
        private float time;

        public void Configure(Transform nextVisualRoot)
        {
            visualRoot = nextVisualRoot;
            CaptureBasePose();
        }

        private void Awake()
        {
            if (visualRoot == null)
            {
                visualRoot = transform;
            }
            CaptureBasePose();

            var health = GetComponent<Health>();
            if (health != null)
            {
                health.Damaged += HandleDamaged;
                health.Died += PlayDeath;
            }
        }

        public void SetMovement(float normalizedAmount)
        {
            movementAmount = Mathf.Clamp01(normalizedAmount);
        }

        public void PlayAttack()
        {
            attackPulse = 1f;
        }

        public void PlayPhaseTransition()
        {
            phasePulse = 1f;
        }

        public void PlayDeath()
        {
            dead = true;
        }

        private void LateUpdate()
        {
            if (visualRoot == null)
            {
                return;
            }

            time += Time.deltaTime;
            attackPulse = Mathf.MoveTowards(attackPulse, 0f, Time.deltaTime * 2.8f);
            hitPulse = Mathf.MoveTowards(hitPulse, 0f, Time.deltaTime * 6f);
            phasePulse = Mathf.MoveTowards(phasePulse, 0f, Time.deltaTime * 1.6f);

            var idle = Mathf.Sin(time * 2.4f) * idleAmplitude;
            var stride = Mathf.Sin(time * moveFrequency) * moveBob * movementAmount;
            var attackLean = Mathf.Sin(attackPulse * Mathf.PI) * 18f;
            var hitTwist = Mathf.Sin(hitPulse * Mathf.PI * 3f) * 9f;
            var phaseScale = 1f + Mathf.Sin(phasePulse * Mathf.PI) * 0.12f;

            visualRoot.localPosition = basePosition + Vector3.up * (idle + Mathf.Abs(stride));
            visualRoot.localRotation = baseRotation * Quaternion.Euler(
                dead ? 78f : attackLean,
                hitTwist,
                stride * 75f);
            visualRoot.localScale = Vector3.Lerp(
                visualRoot.localScale,
                dead ? new Vector3(baseScale.x * 1.08f, baseScale.y * 0.25f, baseScale.z * 1.08f) : baseScale * phaseScale,
                1f - Mathf.Exp(-10f * Time.deltaTime));
        }

        private void HandleDamaged(int amount)
        {
            hitPulse = 1f;
        }

        private void CaptureBasePose()
        {
            if (visualRoot == null)
            {
                return;
            }

            basePosition = visualRoot.localPosition;
            baseRotation = visualRoot.localRotation;
            baseScale = visualRoot.localScale;
        }

        private void OnDestroy()
        {
            var health = GetComponent<Health>();
            if (health != null)
            {
                health.Damaged -= HandleDamaged;
                health.Died -= PlayDeath;
            }
        }
    }
}

using System.Collections.Generic;
using UnityEngine;

namespace FusionRPG
{
    public sealed class CombatProjectile : MonoBehaviour
    {
        [SerializeField] private float speed = 13f;
        [SerializeField] private float radius = 0.22f;
        [SerializeField] private float lifetime = 2.5f;
        [SerializeField] private int damage = 24;
        [SerializeField] private LayerMask targetLayers = ~0;

        private Transform ownerRoot;
        private float remainingLifetime;
        private Vector3 previousPosition;

        public void Initialize(Transform owner, int nextDamage, float nextSpeed, float nextRadius, float nextLifetime, LayerMask layers)
        {
            ownerRoot = owner;
            damage = Mathf.Max(1, nextDamage);
            speed = Mathf.Max(0.1f, nextSpeed);
            radius = Mathf.Max(0.02f, nextRadius);
            lifetime = Mathf.Max(0.1f, nextLifetime);
            targetLayers = layers;
            remainingLifetime = lifetime;
            previousPosition = transform.position;
        }

        private void Awake()
        {
            remainingLifetime = lifetime;
            previousPosition = transform.position;
        }

        private void Update()
        {
            var nextPosition = transform.position + transform.forward * (speed * Time.deltaTime);
            if (Sweep(previousPosition, nextPosition, radius, damage, targetLayers, ownerRoot) > 0)
            {
                Destroy(gameObject);
                return;
            }

            transform.position = nextPosition;
            previousPosition = nextPosition;
            remainingLifetime -= Time.deltaTime;
            if (remainingLifetime <= 0f)
            {
                Destroy(gameObject);
            }
        }

        public static int Sweep(
            Vector3 from,
            Vector3 to,
            float radius,
            int damage,
            LayerMask targetLayers,
            Transform ignoredRoot)
        {
            var delta = to - from;
            var distance = delta.magnitude;
            if (distance <= Mathf.Epsilon)
            {
                return 0;
            }

            var hits = Physics.SphereCastAll(
                from,
                Mathf.Max(0.01f, radius),
                delta / distance,
                distance,
                targetLayers,
                QueryTriggerInteraction.Collide);
            var damaged = new HashSet<Health>();
            foreach (var hit in hits)
            {
                var health = hit.collider.GetComponentInParent<Health>();
                if (health == null || damaged.Contains(health))
                {
                    continue;
                }

                if (ignoredRoot != null &&
                    (health.transform == ignoredRoot || health.transform.IsChildOf(ignoredRoot)))
                {
                    continue;
                }

                health.ApplyDamage(damage);
                damaged.Add(health);
            }

            return damaged.Count;
        }
    }
}

using System.Collections.Generic;
using UnityEngine;

namespace FusionRPG
{
    public sealed class EnemyAttack : MonoBehaviour
    {
        [SerializeField] private LayerMask targetLayers = ~0;
        [SerializeField] private GameObject attackVfx;
        [SerializeField] private Material fallbackVfxMaterial;
        private readonly Collider[] hits = new Collider[32];

        public void Configure(LayerMask layers, GameObject vfx, Material fallbackMaterial)
        {
            targetLayers = layers;
            attackVfx = vfx;
            fallbackVfxMaterial = fallbackMaterial;
        }

        public int ApplySphere(Vector3 center, float radius, int damage, Transform ignoredRoot, HashSet<Health> alreadyDamaged = null)
        {
            var count = Physics.OverlapSphereNonAlloc(
                center,
                Mathf.Max(0.05f, radius),
                hits,
                targetLayers,
                QueryTriggerInteraction.Collide);
            var damaged = alreadyDamaged ?? new HashSet<Health>();
            var initialCount = damaged.Count;
            for (var i = 0; i < count; i++)
            {
                var health = hits[i].GetComponentInParent<Health>();
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

            CombatVfx.Spawn(attackVfx, center, Quaternion.identity, radius * 0.35f, 1.2f, fallbackVfxMaterial);
            return damaged.Count - initialCount;
        }
    }
}

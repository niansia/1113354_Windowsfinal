using System.Collections.Generic;
using UnityEngine;

namespace FusionRPG
{
    public sealed class DamageHitbox : MonoBehaviour
    {
        [SerializeField] private int damage = 15;
        [SerializeField] private float radius = 1.4f;
        [SerializeField] private LayerMask targetLayers = ~0;
        private readonly Collider[] hits = new Collider[16];

        public int Apply(Vector3 center)
        {
            return Apply(center, null);
        }

        public int Apply(Vector3 center, Transform ignoredRoot)
        {
            var count = Physics.OverlapSphereNonAlloc(center, radius, hits, targetLayers, QueryTriggerInteraction.Ignore);
            var damaged = new HashSet<Health>();
            for (var i = 0; i < count; i++)
            {
                var health = hits[i].GetComponentInParent<Health>();
                if (health == null || damaged.Contains(health)) continue;
                if (ignoredRoot != null && (health.transform == ignoredRoot || health.transform.IsChildOf(ignoredRoot))) continue;
                health.ApplyDamage(damage);
                damaged.Add(health);
            }
            return damaged.Count;
        }

        public void Configure(int nextDamage, float nextRadius, LayerMask nextLayers)
        {
            damage = Mathf.Max(1, nextDamage);
            radius = Mathf.Max(0.1f, nextRadius);
            targetLayers = nextLayers;
        }
    }
}

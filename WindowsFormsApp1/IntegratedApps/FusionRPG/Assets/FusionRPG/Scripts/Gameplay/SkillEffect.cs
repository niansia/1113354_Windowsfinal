using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace FusionRPG
{
    public sealed class SkillEffect : MonoBehaviour
    {
        [SerializeField] private int damage = 45;
        [SerializeField] private float radius = 3.2f;
        [SerializeField] private float visualDuration = 0.55f;
        [SerializeField] private Material visualMaterial;

        private readonly Collider[] hits = new Collider[32];

        public int Cast(Vector3 center, Transform ignoredRoot, LayerMask targetLayers)
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

            StartCoroutine(ShowBurst(center));
            return damaged.Count;
        }

        private IEnumerator ShowBurst(Vector3 center)
        {
            var burst = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            burst.name = "Sakura Frost Burst";
            burst.transform.position = center;
            burst.transform.localScale = Vector3.one * 0.25f;
            var collider = burst.GetComponent<Collider>();
            if (collider != null)
            {
                Destroy(collider);
            }

            var renderer = burst.GetComponent<Renderer>();
            if (renderer != null && visualMaterial != null)
            {
                renderer.sharedMaterial = visualMaterial;
            }

            var elapsed = 0f;
            while (elapsed < visualDuration)
            {
                elapsed += Time.deltaTime;
                var t = Mathf.Clamp01(elapsed / visualDuration);
                burst.transform.localScale = Vector3.one * Mathf.Lerp(0.35f, radius * 2f, t);
                yield return null;
            }

            Destroy(burst);
        }

        public void Configure(Material material, int nextDamage, float nextRadius)
        {
            visualMaterial = material;
            damage = Mathf.Max(1, nextDamage);
            radius = Mathf.Max(0.2f, nextRadius);
        }
    }
}

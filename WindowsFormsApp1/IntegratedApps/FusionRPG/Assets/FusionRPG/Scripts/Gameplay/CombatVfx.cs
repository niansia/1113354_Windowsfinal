using UnityEngine;

namespace FusionRPG
{
    public static class CombatVfx
    {
        public static GameObject Spawn(
            GameObject prefab,
            Vector3 position,
            Quaternion rotation,
            float scale,
            float lifetime,
            Material fallbackMaterial = null)
        {
            GameObject instance;
            if (prefab != null)
            {
                instance = Object.Instantiate(prefab, position, rotation);
                instance.transform.localScale *= Mathf.Max(0.01f, scale);
            }
            else
            {
                instance = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                instance.name = "Combat VFX";
                instance.transform.SetPositionAndRotation(position, rotation);
                instance.transform.localScale = Vector3.one * Mathf.Max(0.01f, scale);
                var collider = instance.GetComponent<Collider>();
                if (collider != null)
                {
                    Object.Destroy(collider);
                }

                var renderer = instance.GetComponent<Renderer>();
                if (renderer != null && fallbackMaterial != null)
                {
                    renderer.sharedMaterial = fallbackMaterial;
                }

                instance.AddComponent<TransientCombatVfx>();
            }

            Object.Destroy(instance, Mathf.Max(0.1f, lifetime));
            return instance;
        }
    }

    public sealed class TransientCombatVfx : MonoBehaviour
    {
        [SerializeField] private float expansionSpeed = 5f;
        [SerializeField] private float spinSpeed = 120f;

        private void Update()
        {
            transform.localScale += Vector3.one * (expansionSpeed * Time.deltaTime);
            transform.Rotate(0f, spinSpeed * Time.deltaTime, 0f, Space.World);
        }
    }
}

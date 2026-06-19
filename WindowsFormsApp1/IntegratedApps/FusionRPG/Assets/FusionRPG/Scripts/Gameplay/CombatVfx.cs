using UnityEngine;

namespace FusionRPG
{
    /// <summary>
    /// Procedural combat VFX. Every hit/skill layers an expanding shock ring, a
    /// bright additive core, a light flash and a spark burst so impacts read as
    /// flashy AoE bursts. Ultimates add stacked rings, an energy column and a
    /// full-screen flash. All visuals are asset-free and Built-in RP compatible
    /// (a shared additive material is loaded from Resources/Fx so its shader is
    /// guaranteed to survive build shader stripping).
    /// </summary>
    public static class CombatVfx
    {
        private static Material sharedAdditive;
        private static Mesh ringMesh;

        /// <summary>
        /// Backward-compatible entry used across the combat scripts. Optionally
        /// instantiates a themed prefab, then always layers the procedural impact.
        /// </summary>
        public static GameObject Spawn(
            GameObject prefab,
            Vector3 position,
            Quaternion rotation,
            float scale,
            float lifetime,
            Material fallbackMaterial = null,
            Color? tint = null)
        {
            var color = tint ?? InferColor(fallbackMaterial);

            GameObject instance = null;
            if (prefab != null)
            {
                instance = Object.Instantiate(prefab, position, rotation);
                instance.transform.localScale *= Mathf.Max(0.01f, scale);
                Object.Destroy(instance, Mathf.Max(0.1f, lifetime));
            }

            PlayImpact(position, scale, color);
            return instance;
        }

        public static void PlayImpact(Vector3 position, float scale, Color color)
        {
            scale = Mathf.Max(0.2f, scale);
            SpawnRing(position, scale * 2.6f, 0.45f, color);
            SpawnCore(position + Vector3.up * 0.35f, scale * 0.9f, 0.26f, color);
            SpawnLight(position + Vector3.up * 0.6f, scale * 4.5f, color, 0.2f);
            SpawnSparks(position + Vector3.up * 0.35f, scale, color, Mathf.RoundToInt(Mathf.Clamp(scale * 16f, 8f, 48f)));
        }

        public static void PlayUltimate(Vector3 position, float scale, Color color)
        {
            scale = Mathf.Max(1f, scale);
            SpawnRing(position, scale * 2.2f, 0.55f, color);
            SpawnRing(position, scale * 3.4f, 0.8f, color);
            SpawnRing(position, scale * 4.8f, 1.05f, Color.white);
            SpawnColumn(position, scale * 0.7f, scale * 3.4f, 0.7f, color);
            SpawnCore(position + Vector3.up * 1.1f, scale * 1.4f, 0.4f, color);
            SpawnLight(position + Vector3.up * 1.5f, scale * 9f, color, 0.5f);
            SpawnSparks(position + Vector3.up * 0.6f, scale * 1.6f, color, 90);
            ScreenFlash(new Color(color.r, color.g, color.b, 0.5f), 0.55f);
        }

        public static void ScreenFlash(Color color, float duration)
        {
            ScreenFlasher.Flash(color, duration);
        }

        private static void SpawnRing(Vector3 position, float targetRadius, float life, Color color)
        {
            var go = NewFxObject("FX Shock Ring", position + Vector3.up * 0.06f);
            go.AddComponent<MeshFilter>().sharedMesh = RingMesh();
            var renderer = go.AddComponent<MeshRenderer>();
            ConfigureFxRenderer(renderer);
            go.AddComponent<FxExpandFade>().Configure(
                renderer,
                color,
                new Vector3(targetRadius * 0.25f, 1f, targetRadius * 0.25f),
                new Vector3(targetRadius, 1f, targetRadius),
                life,
                false);
        }

        private static void SpawnCore(Vector3 position, float size, float life, Color color)
        {
            var go = NewFxPrimitive(PrimitiveType.Sphere, "FX Core Flash", position);
            var renderer = go.GetComponent<MeshRenderer>();
            ConfigureFxRenderer(renderer);
            go.AddComponent<FxExpandFade>().Configure(
                renderer,
                color,
                Vector3.one * (size * 0.35f),
                Vector3.one * size,
                life,
                true);
        }

        private static void SpawnColumn(Vector3 position, float radius, float height, float life, Color color)
        {
            var go = NewFxPrimitive(PrimitiveType.Cylinder, "FX Energy Column", position + Vector3.up * (height * 0.5f));
            var renderer = go.GetComponent<MeshRenderer>();
            ConfigureFxRenderer(renderer);
            go.AddComponent<FxExpandFade>().Configure(
                renderer,
                color,
                new Vector3(radius * 0.2f, height * 0.5f, radius * 0.2f),
                new Vector3(radius, height * 0.5f, radius),
                life,
                false);
        }

        private static void SpawnLight(Vector3 position, float range, Color color, float life)
        {
            var go = NewFxObject("FX Flash Light", position);
            var light = go.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = color;
            light.range = Mathf.Max(1f, range);
            light.intensity = 6f;
            go.AddComponent<FxLightDecay>().Configure(life);
        }

        private static void SpawnSparks(Vector3 position, float scale, Color color, int count)
        {
            var go = NewFxObject("FX Sparks", position);
            var particles = go.AddComponent<ParticleSystem>();
            particles.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);

            var renderer = go.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = SharedAdditive();
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;

            var main = particles.main;
            main.duration = 0.6f;
            main.loop = false;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.28f, 0.6f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(3.5f * scale, 7.5f * scale);
            main.startSize = new ParticleSystem.MinMaxCurve(0.06f * scale, 0.16f * scale);
            main.startColor = color;
            main.gravityModifier = 0.6f;
            main.maxParticles = Mathf.Max(16, count);
            main.stopAction = ParticleSystemStopAction.Destroy;
            main.playOnAwake = false;

            var emission = particles.emission;
            emission.enabled = true;
            emission.rateOverTime = 0f;
            emission.SetBursts(new[] { new ParticleSystem.Burst(0f, (short)Mathf.Max(8, count)) });

            var shape = particles.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.12f * scale;

            var colorOverLifetime = particles.colorOverLifetime;
            colorOverLifetime.enabled = true;
            var gradient = new Gradient();
            gradient.SetKeys(
                new[] { new GradientColorKey(color, 0f), new GradientColorKey(color, 1f) },
                new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(0f, 1f) });
            colorOverLifetime.color = new ParticleSystem.MinMaxGradient(gradient);

            var sizeOverLifetime = particles.sizeOverLifetime;
            sizeOverLifetime.enabled = true;
            sizeOverLifetime.size = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.EaseInOut(0f, 1f, 1f, 0f));

            particles.Play();
            Object.Destroy(go, 1.2f);
        }

        private static GameObject NewFxObject(string name, Vector3 position)
        {
            var go = new GameObject(name);
            go.transform.position = position;
            go.layer = 2; // Ignore Raycast — never participate in combat overlap queries.
            return go;
        }

        private static GameObject NewFxPrimitive(PrimitiveType type, string name, Vector3 position)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.position = position;
            go.layer = 2;
            var collider = go.GetComponent<Collider>();
            if (collider != null)
            {
                Object.Destroy(collider);
            }
            return go;
        }

        private static void ConfigureFxRenderer(Renderer renderer)
        {
            renderer.sharedMaterial = SharedAdditive();
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            renderer.lightProbeUsage = UnityEngine.Rendering.LightProbeUsage.Off;
            renderer.reflectionProbeUsage = UnityEngine.Rendering.ReflectionProbeUsage.Off;
        }

        private static Color InferColor(Material material)
        {
            if (material != null)
            {
                if (material.HasProperty("_Color")) return material.GetColor("_Color");
                if (material.HasProperty("_BaseColor")) return material.GetColor("_BaseColor");
            }
            return new Color(1f, 0.5f, 0.78f, 1f);
        }

        private static Material SharedAdditive()
        {
            if (sharedAdditive != null)
            {
                return sharedAdditive;
            }

            var loaded = Resources.Load<Material>("Fx/MAT_FxAdditive");
            if (loaded != null)
            {
                sharedAdditive = loaded;
                return sharedAdditive;
            }

            var shader =
                Shader.Find("Legacy Shaders/Particles/Additive") ??
                Shader.Find("Particles/Standard Unlit") ??
                Shader.Find("Sprites/Default") ??
                Shader.Find("Unlit/Color");
            sharedAdditive = new Material(shader);
            return sharedAdditive;
        }

        private static Mesh RingMesh()
        {
            if (ringMesh != null)
            {
                return ringMesh;
            }

            const int segments = 56;
            const float inner = 0.78f;
            const float outer = 1f;
            var vertices = new Vector3[segments * 2];
            var uvs = new Vector2[segments * 2];
            var triangles = new int[segments * 6];
            for (var i = 0; i < segments; i++)
            {
                var angle = (float)i / segments * Mathf.PI * 2f;
                var cos = Mathf.Cos(angle);
                var sin = Mathf.Sin(angle);
                vertices[i * 2] = new Vector3(cos * inner, 0f, sin * inner);
                vertices[i * 2 + 1] = new Vector3(cos * outer, 0f, sin * outer);
                uvs[i * 2] = new Vector2((float)i / segments, 0f);
                uvs[i * 2 + 1] = new Vector2((float)i / segments, 1f);
            }
            for (var i = 0; i < segments; i++)
            {
                var next = (i + 1) % segments;
                var t = i * 6;
                triangles[t] = i * 2;
                triangles[t + 1] = next * 2;
                triangles[t + 2] = i * 2 + 1;
                triangles[t + 3] = i * 2 + 1;
                triangles[t + 4] = next * 2;
                triangles[t + 5] = next * 2 + 1;
            }

            ringMesh = new Mesh { name = "FX Ring" };
            ringMesh.vertices = vertices;
            ringMesh.uv = uvs;
            ringMesh.triangles = triangles;
            ringMesh.RecalculateNormals();
            ringMesh.RecalculateBounds();
            return ringMesh;
        }

        internal static void ApplyColor(Renderer renderer, Color color)
        {
            if (renderer == null)
            {
                return;
            }

            var block = new MaterialPropertyBlock();
            renderer.GetPropertyBlock(block);
            block.SetColor("_TintColor", color);
            block.SetColor("_Color", color);
            block.SetColor("_BaseColor", color);
            block.SetColor("_EmissionColor", color);
            renderer.SetPropertyBlock(block);
        }
    }

    /// <summary>Scales an FX renderer up while fading its additive colour to black.</summary>
    public sealed class FxExpandFade : MonoBehaviour
    {
        private Renderer fxRenderer;
        private Color baseColor = Color.white;
        private Vector3 fromScale;
        private Vector3 toScale;
        private float life = 0.4f;
        private float elapsed;
        private bool billboard;
        private Camera cam;

        public void Configure(Renderer renderer, Color color, Vector3 from, Vector3 to, float duration, bool faceCamera)
        {
            fxRenderer = renderer;
            baseColor = color;
            fromScale = from;
            toScale = to;
            life = Mathf.Max(0.05f, duration);
            billboard = faceCamera;
            transform.localScale = from;
            CombatVfx.ApplyColor(fxRenderer, baseColor);
        }

        private void Start()
        {
            cam = Camera.main;
        }

        private void LateUpdate()
        {
            elapsed += Time.deltaTime;
            var k = Mathf.Clamp01(elapsed / life);
            var eased = 1f - Mathf.Pow(1f - k, 3f);
            transform.localScale = Vector3.LerpUnclamped(fromScale, toScale, eased);

            var color = baseColor * (1f - k);
            color.a = baseColor.a * (1f - k);
            CombatVfx.ApplyColor(fxRenderer, color);

            if (billboard)
            {
                if (cam == null)
                {
                    cam = Camera.main;
                }
                if (cam != null)
                {
                    transform.rotation = cam.transform.rotation;
                }
            }

            if (k >= 1f)
            {
                Destroy(gameObject);
            }
        }
    }

    /// <summary>Fades a flash point-light to zero and self-destructs.</summary>
    public sealed class FxLightDecay : MonoBehaviour
    {
        private Light fxLight;
        private float startIntensity;
        private float life = 0.2f;
        private float elapsed;

        public void Configure(float duration)
        {
            life = Mathf.Max(0.05f, duration);
            fxLight = GetComponent<Light>();
            startIntensity = fxLight != null ? fxLight.intensity : 0f;
        }

        private void Update()
        {
            if (fxLight == null)
            {
                return;
            }

            elapsed += Time.deltaTime;
            var k = Mathf.Clamp01(elapsed / life);
            fxLight.intensity = Mathf.Lerp(startIntensity, 0f, k);
            if (k >= 1f)
            {
                Destroy(gameObject);
            }
        }
    }

    /// <summary>Persistent full-screen overlay used for ultimate flashes.</summary>
    public sealed class ScreenFlasher : MonoBehaviour
    {
        private static ScreenFlasher instance;

        private UnityEngine.UI.Image image;
        private Color startColor;
        private float life;
        private float elapsed;
        private bool active;

        public static void Flash(Color color, float duration)
        {
            EnsureInstance();
            instance.startColor = color;
            instance.life = Mathf.Max(0.05f, duration);
            instance.elapsed = 0f;
            instance.active = true;
            instance.image.color = color;
            instance.image.enabled = true;
        }

        private static void EnsureInstance()
        {
            if (instance != null)
            {
                return;
            }

            var root = new GameObject("FX Screen Flasher");
            Object.DontDestroyOnLoad(root);
            var canvas = root.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 32760;

            var imageObject = new GameObject("Flash");
            imageObject.transform.SetParent(root.transform, false);
            var image = imageObject.AddComponent<UnityEngine.UI.Image>();
            var rect = image.rectTransform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            image.raycastTarget = false;
            image.enabled = false;

            instance = root.AddComponent<ScreenFlasher>();
            instance.image = image;
        }

        private void Update()
        {
            if (!active)
            {
                return;
            }

            elapsed += Time.deltaTime;
            var k = Mathf.Clamp01(elapsed / life);
            var color = startColor;
            color.a = startColor.a * (1f - k);
            image.color = color;
            if (k >= 1f)
            {
                active = false;
                image.enabled = false;
            }
        }
    }
}

using UnityEngine;
using UnityEngine.UI;

namespace FusionRPG
{
    /// <summary>
    /// Floating damage number rendered on the screen-space HUD canvas. It is
    /// projected from a world position once, then rises and fades in screen space
    /// so hits read clearly regardless of camera angle.
    /// </summary>
    public sealed class FloatingCombatText : MonoBehaviour
    {
        private RectTransform rect;
        private Text label;
        private float life = 0.85f;
        private float elapsed;
        private float riseSpeed = 90f;
        private float drift;
        private Color baseColor = Color.white;
        private float baseFontSize = 26f;

        public static void Spawn(Vector3 worldPosition, int amount, Color color, float scale = 1f)
        {
            if (amount <= 0)
            {
                return;
            }

            var cam = Camera.main;
            var overlay = EnemyHealthBar.FindOverlayCanvas();
            if (cam == null || overlay == null)
            {
                return;
            }

            var screenPoint = cam.WorldToScreenPoint(worldPosition);
            if (screenPoint.z <= 0.2f)
            {
                return;
            }

            var go = new GameObject("Damage " + amount);
            var text = go.AddComponent<Text>();
            var rectTransform = text.rectTransform;
            rectTransform.SetParent(overlay.transform, false);
            rectTransform.anchorMin = new Vector2(0.5f, 0.5f);
            rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
            rectTransform.pivot = new Vector2(0.5f, 0.5f);
            rectTransform.sizeDelta = new Vector2(160f, 48f);
            rectTransform.position = new Vector3(screenPoint.x, screenPoint.y, 0f);

            text.alignment = TextAnchor.MiddleCenter;
            text.font = EnemyHealthBar.ResolveFont();
            text.fontStyle = FontStyle.Bold;
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.text = amount.ToString();
            text.raycastTarget = false;

            var floating = go.AddComponent<FloatingCombatText>();
            floating.rect = rectTransform;
            floating.label = text;
            floating.baseColor = color;
            floating.baseFontSize = 26f * Mathf.Clamp(scale, 0.6f, 2f);
            floating.drift = Random.Range(-40f, 40f);
            text.fontSize = Mathf.RoundToInt(floating.baseFontSize);
            text.color = color;
        }

        private void LateUpdate()
        {
            elapsed += Time.deltaTime;
            var k = Mathf.Clamp01(elapsed / life);

            if (rect != null)
            {
                rect.position += new Vector3(drift * Time.deltaTime, riseSpeed * Time.deltaTime, 0f);
                var pop = 1f + Mathf.Sin(Mathf.Clamp01(elapsed / 0.14f) * Mathf.PI * 0.5f) * 0.4f;
                rect.localScale = Vector3.one * (pop * (1f - 0.25f * k));
            }

            if (label != null)
            {
                var c = baseColor;
                c.a = 1f - k * k;
                label.color = c;
            }

            if (k >= 1f)
            {
                Destroy(gameObject);
            }
        }
    }
}

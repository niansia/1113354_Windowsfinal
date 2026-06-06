using UnityEngine;
using UnityEngine.UI;

namespace FusionRPG
{
    /// <summary>
    /// Floating enemy health bar. It builds its UI on the existing screen-space
    /// HUD canvas (the one that reliably renders) and follows the enemy each frame
    /// via <see cref="Camera.WorldToScreenPoint"/>. The bar drains as the enemy
    /// takes damage, shows a trailing "lag" chunk, scales with distance, hides
    /// when off-screen or dead, and spawns floating damage numbers on hits.
    /// </summary>
    public sealed class EnemyHealthBar : MonoBehaviour
    {
        private static Font sharedFont;

        [SerializeField] private Health health;
        [SerializeField] private float headHeight = 2.1f;
        [SerializeField] private float referenceWidth = 96f;
        [SerializeField] private string displayName = string.Empty;
        [SerializeField] private Color fillColor = new Color(1f, 0.3f, 0.38f, 1f);

        private Camera cam;
        private RectTransform group;
        private CanvasGroup canvasGroup;
        private Image fillImage;
        private Image lagImage;
        private float lagRatio = 1f;

        public void Configure(Health targetHealth, float head, float width, string name, Color color)
        {
            health = targetHealth;
            headHeight = head;
            referenceWidth = Mathf.Max(60f, width * 80f);
            displayName = name;
            fillColor = color;
        }

        private void Start()
        {
            cam = Camera.main;
            var overlay = FindOverlayCanvas();
            if (overlay != null)
            {
                BuildUi(overlay.transform);
            }
            if (health != null)
            {
                lagRatio = health.Ratio;
                health.Damaged += HandleDamaged;
            }
        }

        private void HandleDamaged(int amount)
        {
            FloatingCombatText.Spawn(transform.position + Vector3.up * (headHeight + 0.2f), amount, new Color(1f, 0.86f, 0.32f, 1f));
        }

        private void LateUpdate()
        {
            if (group == null)
            {
                return;
            }

            if (cam == null)
            {
                cam = Camera.main;
            }

            var dead = health == null || health.IsDead;
            var screenPoint = cam != null ? cam.WorldToScreenPoint(transform.position + Vector3.up * headHeight) : new Vector3(0f, 0f, -1f);
            var visible = !dead && cam != null && screenPoint.z > 0.2f;

            canvasGroup.alpha = Mathf.MoveTowards(canvasGroup.alpha, visible ? 1f : 0f, Time.deltaTime * 6f);
            if (!visible)
            {
                return;
            }

            group.position = new Vector3(screenPoint.x, screenPoint.y, 0f);
            group.localScale = Vector3.one * Mathf.Clamp(16f / screenPoint.z, 0.55f, 1.5f);

            var ratio = health.Ratio;
            if (fillImage != null)
            {
                fillImage.fillAmount = ratio;
            }
            lagRatio = Mathf.Max(ratio, Mathf.MoveTowards(lagRatio, ratio, Time.deltaTime * 0.8f));
            if (lagImage != null)
            {
                lagImage.fillAmount = lagRatio;
            }
        }

        private void BuildUi(Transform canvasTransform)
        {
            var root = new GameObject("Enemy HP " + displayName, typeof(RectTransform));
            group = root.GetComponent<RectTransform>();
            group.SetParent(canvasTransform, false);
            SetCenter(group, new Vector2(referenceWidth, 30f), Vector2.zero);
            canvasGroup = root.AddComponent<CanvasGroup>();
            canvasGroup.interactable = false;
            canvasGroup.blocksRaycasts = false;
            canvasGroup.alpha = 0f;

            var frame = CreateImage(group, "Frame", new Color(0.02f, 0.02f, 0.05f, 0.85f));
            SetCenter(frame.rectTransform, new Vector2(referenceWidth, 11f), new Vector2(0f, -3f));

            lagImage = CreateImage(frame.rectTransform, "Lag", new Color(1f, 1f, 1f, 0.5f));
            Stretch(lagImage.rectTransform, 1.5f);
            MakeFilled(lagImage);

            fillImage = CreateImage(frame.rectTransform, "Fill", fillColor);
            Stretch(fillImage.rectTransform, 1.5f);
            MakeFilled(fillImage);

            if (!string.IsNullOrEmpty(displayName))
            {
                var labelObject = new GameObject("Name");
                var text = labelObject.AddComponent<Text>();
                var labelRect = text.rectTransform;
                labelRect.SetParent(group, false);
                SetCenter(labelRect, new Vector2(referenceWidth + 80f, 18f), new Vector2(0f, 12f));
                text.alignment = TextAnchor.MiddleCenter;
                text.font = ResolveFont();
                text.fontSize = 13;
                text.fontStyle = FontStyle.Bold;
                text.horizontalOverflow = HorizontalWrapMode.Overflow;
                text.verticalOverflow = VerticalWrapMode.Overflow;
                text.text = displayName;
                text.color = new Color(1f, 0.92f, 0.95f, 1f);
                text.raycastTarget = false;
            }
        }

        private static Image CreateImage(Transform parent, string name, Color color)
        {
            var go = new GameObject(name);
            var image = go.AddComponent<Image>();
            image.rectTransform.SetParent(parent, false);
            image.color = color;
            image.raycastTarget = false;
            return image;
        }

        private static void MakeFilled(Image image)
        {
            image.sprite = UiSprites.White();
            image.type = Image.Type.Filled;
            image.fillMethod = Image.FillMethod.Horizontal;
            image.fillOrigin = (int)Image.OriginHorizontal.Left;
            image.fillAmount = 1f;
        }

        private static void SetCenter(RectTransform rect, Vector2 size, Vector2 anchoredPosition)
        {
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = size;
            rect.anchoredPosition = anchoredPosition;
        }

        private static void Stretch(RectTransform rect, float padding)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(padding, padding);
            rect.offsetMax = new Vector2(-padding, -padding);
        }

        private void OnDestroy()
        {
            if (health != null)
            {
                health.Damaged -= HandleDamaged;
            }
            if (group != null)
            {
                Destroy(group.gameObject);
            }
        }

        internal static Canvas FindOverlayCanvas()
        {
            var named = GameObject.Find("Fusion RPG HUD");
            if (named != null)
            {
                var canvas = named.GetComponent<Canvas>();
                if (canvas != null)
                {
                    return canvas;
                }
            }

            foreach (var canvas in Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None))
            {
                if (canvas.renderMode == RenderMode.ScreenSpaceOverlay && canvas.isRootCanvas)
                {
                    return canvas;
                }
            }
            return null;
        }

        internal static Font ResolveFont()
        {
            if (sharedFont == null)
            {
                sharedFont = Font.CreateDynamicFontFromOSFont(
                    new[] { "Microsoft JhengHei UI", "Microsoft JhengHei", "Arial Unicode MS", "Arial" },
                    16);
            }
            return sharedFont;
        }
    }
}

using UnityEngine;

namespace FusionRPG
{
    /// <summary>
    /// Shared UI sprites. A plain white sprite is required for any
    /// <see cref="UnityEngine.UI.Image"/> using <c>Image.Type.Filled</c>: with no
    /// sprite assigned, Unity ignores <c>fillAmount</c> and always draws a full
    /// quad, so the bar never appears to drain.
    /// </summary>
    public static class UiSprites
    {
        private static Sprite white;

        public static Sprite White()
        {
            if (white == null)
            {
                var texture = Texture2D.whiteTexture;
                white = Sprite.Create(
                    texture,
                    new Rect(0f, 0f, texture.width, texture.height),
                    new Vector2(0.5f, 0.5f),
                    100f,
                    0,
                    SpriteMeshType.FullRect);
                white.name = "FusionWhiteSprite";
            }
            return white;
        }
    }
}

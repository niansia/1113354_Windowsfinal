using UnityEngine;

namespace FusionRPG
{
    /// <summary>
    /// Forces the standalone player into borderless full-screen at the display's
    /// native resolution on launch. Unity persists the last-used window mode in the
    /// registry, so a single previous windowed run (or a launcher that opened the
    /// exe windowed) keeps every later launch windowed. Re-applying the resolution
    /// at runtime overrides that persisted preference so the game always opens
    /// full-screen. Press F11 to toggle back to a window.
    /// </summary>
    public sealed class DisplayBootstrap : MonoBehaviour
    {
        [SerializeField] private bool startFullscreen = true;
        [SerializeField] private int targetFrameRate = 60;

        private void Awake()
        {
            // Keep simulating/rendering when the window is not focused so the game
            // doesn't freeze on Alt+Tab (and so automated captures stay reliable).
            Application.runInBackground = true;

            if (startFullscreen)
            {
                ApplyFullscreen();
            }

            if (targetFrameRate > 0)
            {
                Application.targetFrameRate = targetFrameRate;
            }
        }

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.F11))
            {
                if (Screen.fullScreenMode == FullScreenMode.Windowed)
                {
                    ApplyFullscreen();
                }
                else
                {
                    Screen.SetResolution(1280, 720, FullScreenMode.Windowed);
                }
            }
        }

        private static void ApplyFullscreen()
        {
            var width = Display.main != null ? Display.main.systemWidth : Screen.currentResolution.width;
            var height = Display.main != null ? Display.main.systemHeight : Screen.currentResolution.height;
            if (width <= 0 || height <= 0)
            {
                width = Screen.currentResolution.width;
                height = Screen.currentResolution.height;
            }

            Screen.SetResolution(width, height, FullScreenMode.FullScreenWindow);
        }
    }
}

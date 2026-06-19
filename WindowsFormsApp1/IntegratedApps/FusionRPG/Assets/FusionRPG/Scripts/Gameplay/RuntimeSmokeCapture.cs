using System.Collections;
using System.IO;
using UnityEngine;

namespace FusionRPG
{
    public sealed class RuntimeSmokeCapture : MonoBehaviour
    {
        private IEnumerator Start()
        {
            var arguments = System.Environment.GetCommandLineArgs();
            string outputPath = null;
            for (var i = 0; i < arguments.Length - 1; i++)
            {
                if (arguments[i] == "-fusion-smoke-capture")
                {
                    outputPath = arguments[i + 1];
                    break;
                }
            }

            if (string.IsNullOrWhiteSpace(outputPath))
            {
                yield break;
            }

            for (var frame = 0; frame < 20; frame++)
            {
                yield return new WaitForEndOfFrame();
            }

            var texture = new Texture2D(Screen.width, Screen.height, TextureFormat.RGB24, false);
            texture.ReadPixels(new Rect(0f, 0f, Screen.width, Screen.height), 0, 0, false);
            texture.Apply(false, false);
            WriteBitmap(outputPath, texture);
            Destroy(texture);

            Debug.Log(File.Exists(outputPath)
                ? "Fusion RPG runtime smoke capture completed: " + outputPath
                : "Fusion RPG runtime smoke capture timed out.");
            Application.Quit(File.Exists(outputPath) ? 0 : 3);
        }

        private static void WriteBitmap(string outputPath, Texture2D texture)
        {
            var width = texture.width;
            var height = texture.height;
            var rowStride = (width * 3 + 3) & ~3;
            var pixelBytes = rowStride * height;
            var pixels = texture.GetPixels32();
            var directory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            using (var stream = File.Open(outputPath, FileMode.Create, FileAccess.Write))
            using (var writer = new BinaryWriter(stream))
            {
                writer.Write((byte)'B');
                writer.Write((byte)'M');
                writer.Write(54 + pixelBytes);
                writer.Write(0);
                writer.Write(54);
                writer.Write(40);
                writer.Write(width);
                writer.Write(height);
                writer.Write((short)1);
                writer.Write((short)24);
                writer.Write(0);
                writer.Write(pixelBytes);
                writer.Write(2835);
                writer.Write(2835);
                writer.Write(0);
                writer.Write(0);

                var padding = rowStride - width * 3;
                for (var y = 0; y < height; y++)
                {
                    var rowStart = y * width;
                    for (var x = 0; x < width; x++)
                    {
                        var pixel = pixels[rowStart + x];
                        writer.Write(pixel.b);
                        writer.Write(pixel.g);
                        writer.Write(pixel.r);
                    }
                    for (var pad = 0; pad < padding; pad++)
                    {
                        writer.Write((byte)0);
                    }
                }
            }
        }
    }
}

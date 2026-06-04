using System;
using System.Threading;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace FusionRPG.EditorTools
{
    public static class FusionRPGGltfTools
    {
        private const string GltfFastPackageName = "com.unity.cloud.gltfast";
        private const string TempleCourtyardGlbPath = "Assets/FusionRPG/Art/Models/traditional_temple_courtyard.glb";
        private const string TempleCourtyardBaseColorPath = "Assets/FusionRPG/Art/Models/Textures/traditional_temple_courtyard_basecolor.jpg";
        private const string TempleCourtyardRoughnessMetallicPath = "Assets/FusionRPG/Art/Models/Textures/traditional_temple_courtyard_roughness_metallic.jpg";
        private const string TempleCourtyardNormalPath = "Assets/FusionRPG/Art/Models/Textures/traditional_temple_courtyard_normal.jpg";
        private const string PinkCharacterGlbPath = "Assets/FusionRPG/Art/Models/pink_fantasy_character.glb";
        private const string PinkCharacterBaseColorPath = "Assets/FusionRPG/Art/Models/Textures/pink_fantasy_character_basecolor.jpg";
        private const string PinkCharacterRoughnessMetallicPath = "Assets/FusionRPG/Art/Models/Textures/pink_fantasy_character_roughness_metallic.jpg";
        private const string PinkCharacterNormalPath = "Assets/FusionRPG/Art/Models/Textures/pink_fantasy_character_normal.jpg";

        [MenuItem("Fusion RPG/Assets/Install glTFast Package")]
        public static void InstallGltfFastPackage()
        {
            var listRequest = Client.List(true, false);
            WaitForRequest(listRequest, "list installed packages");

            foreach (var package in listRequest.Result)
            {
                if (package.name == GltfFastPackageName)
                {
                    Debug.Log("glTFast package is already installed: " + package.packageId);
                    return;
                }
            }

            var addRequest = Client.Add(GltfFastPackageName);
            WaitForRequest(addRequest, "install " + GltfFastPackageName);
            Debug.Log("Installed glTFast package: " + addRequest.Result.packageId);
            AssetDatabase.Refresh();
        }

        [MenuItem("Fusion RPG/Assets/Reimport Temple Courtyard GLB")]
        public static void ImportTempleCourtyardAsset()
        {
            AssetDatabase.Refresh();
            ImportTempleCourtyardTextures();
            AssetDatabase.ImportAsset(TempleCourtyardGlbPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            AssetDatabase.Refresh();

            var importedPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(TempleCourtyardGlbPath);
            if (importedPrefab == null)
            {
                throw new InvalidOperationException("Temple courtyard GLB was copied into the project, but Unity did not import it as a GameObject. Install glTFast first, then reimport " + TempleCourtyardGlbPath + ".");
            }

            Debug.Log("Temple courtyard GLB imported successfully: " + TempleCourtyardGlbPath);
        }

        [MenuItem("Fusion RPG/Assets/Reimport Pink Character GLB")]
        public static void ImportPinkCharacterAsset()
        {
            AssetDatabase.Refresh();
            ImportPinkCharacterTextures();
            AssetDatabase.ImportAsset(PinkCharacterGlbPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            AssetDatabase.Refresh();

            var importedPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(PinkCharacterGlbPath);
            if (importedPrefab == null)
            {
                throw new InvalidOperationException("Pink character GLB was copied into the project, but Unity did not import it as a GameObject. Install glTFast first, then reimport " + PinkCharacterGlbPath + ".");
            }

            Debug.Log("Pink character GLB imported successfully: " + PinkCharacterGlbPath);
        }

        [MenuItem("Fusion RPG/Assets/Reimport Temple Courtyard Textures")]
        public static void ImportTempleCourtyardTextures()
        {
            ImportTexture(TempleCourtyardBaseColorPath, TextureImporterType.Default, true);
            ImportTexture(TempleCourtyardRoughnessMetallicPath, TextureImporterType.Default, false);
            ImportTexture(TempleCourtyardNormalPath, TextureImporterType.NormalMap, false);
        }

        [MenuItem("Fusion RPG/Assets/Reimport Pink Character Textures")]
        public static void ImportPinkCharacterTextures()
        {
            ImportTexture(PinkCharacterBaseColorPath, TextureImporterType.Default, true);
            ImportTexture(PinkCharacterRoughnessMetallicPath, TextureImporterType.Default, false);
            ImportTexture(PinkCharacterNormalPath, TextureImporterType.NormalMap, false);
        }

        public static void InstallAndImportTempleCourtyard()
        {
            InstallGltfFastPackage();
            ImportTempleCourtyardAsset();
        }

        public static void InstallAndImportAllGltfAssets()
        {
            InstallGltfFastPackage();
            ImportTempleCourtyardAsset();
            ImportPinkCharacterAsset();
        }

        private static void WaitForRequest(Request request, string operationName)
        {
            while (!request.IsCompleted)
            {
                Thread.Sleep(100);
            }

            if (request.Status == StatusCode.Failure)
            {
                throw new InvalidOperationException("Failed to " + operationName + ": " + request.Error.message);
            }
        }

        private static void ImportTexture(string assetPath, TextureImporterType textureType, bool srgb)
        {
            AssetDatabase.ImportAsset(assetPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            var importer = AssetImporter.GetAtPath(assetPath) as TextureImporter;
            if (importer == null)
            {
                Debug.LogWarning("Temple courtyard texture is missing or not a TextureImporter asset: " + assetPath);
                return;
            }

            importer.textureType = textureType;
            importer.sRGBTexture = srgb;
            importer.mipmapEnabled = true;
            importer.maxTextureSize = 4096;
            importer.textureCompression = TextureImporterCompression.CompressedHQ;
            importer.SaveAndReimport();
        }
    }
}

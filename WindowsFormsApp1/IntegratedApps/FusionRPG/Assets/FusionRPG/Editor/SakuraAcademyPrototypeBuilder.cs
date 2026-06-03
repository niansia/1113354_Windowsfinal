using System;
using System.Collections.Generic;
using System.IO;
using FusionRPG;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace FusionRPG.EditorTools
{
    public static class SakuraAcademyPrototypeBuilder
    {
        private const string ScenePath = "Assets/FusionRPG/Scenes/SakuraAcademyPrototype.unity";
        private const string BuildPath = "Build/FusionRPG.exe";
        private const string MaterialsFolder = "Assets/FusionRPG/Materials";
        private const string AcademyEnvironmentPath = "Assets/FusionRPG/Art/References/sakura_academy_environment.png";
        private const string PreviewOutputPath = "../../../output/fusion-rpg-unity-preview.png";

        private static readonly Color Navy = new Color(0.05f, 0.07f, 0.14f, 1f);
        private static readonly Color Indigo = new Color(0.16f, 0.14f, 0.35f, 1f);
        private static readonly Color SakuraPink = new Color(1f, 0.45f, 0.68f, 1f);
        private static readonly Color SoftPink = new Color(1f, 0.78f, 0.86f, 1f);
        private static readonly Color IceBlue = new Color(0.45f, 0.88f, 1f, 1f);
        private static readonly Color Gold = new Color(1f, 0.67f, 0.26f, 1f);
        private static readonly Color Stone = new Color(0.66f, 0.62f, 0.58f, 1f);
        private static readonly Color PaleStone = new Color(0.82f, 0.78f, 0.74f, 1f);
        private static readonly Color Wood = new Color(0.42f, 0.18f, 0.12f, 1f);

        [MenuItem("Fusion RPG/Build Sakura Academy Prototype Scene")]
        public static void BuildPrototypeScene()
        {
            EnsureFolders();
            var materials = CreateMaterials();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "SakuraAcademyPrototype";

            RenderSettings.ambientLight = new Color(0.78f, 0.84f, 0.92f, 1f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.82f, 0.88f, 0.95f, 1f);
            RenderSettings.fogDensity = 0.012f;

            var root = new GameObject("Sakura Academy Prototype");
            var environment = NewGroup("Environment", root.transform);
            var gameplay = NewGroup("Gameplay", root.transform);

            BuildLighting();
            BuildCourtyard(environment.transform, materials);

            var player = BuildPlayer(gameplay.transform, materials);
            var enemy = BuildEnemy(gameplay.transform, materials, player.transform);
            var camera = BuildCamera(player.transform);
            player.GetComponent<PlayerController>().SetCamera(camera);

            var skillEffect = player.GetComponentInChildren<SkillEffect>();
            player.GetComponent<PlayerCombat>().ConfigureForPrototype(skillEffect, ~0);

            var hud = BuildHud(player.GetComponent<Health>(), enemy.GetComponent<Health>(), player.GetComponent<PlayerCombat>());
            var manager = new GameObject("Prototype Game Manager").AddComponent<PrototypeGameManager>();
            manager.ConfigureForPrototype(player.GetComponent<Health>(), enemy.GetComponent<Health>(), player.GetComponent<PlayerCombat>(), hud);

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("Fusion RPG prototype scene generated at " + ScenePath);
        }

        public static void BuildWindowsPlayer()
        {
            if (!File.Exists(ScenePath))
            {
                BuildPrototypeScene();
            }

            Directory.CreateDirectory("Build");
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = BuildPath,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            });

            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException("Fusion RPG build failed: " + report.summary.result);
            }

            Debug.Log("Fusion RPG Windows build generated at " + BuildPath);
        }

        public static void BuildAll()
        {
            BuildPrototypeScene();
            BuildWindowsPlayer();
        }

        public static void CapturePrototypePreview()
        {
            if (!File.Exists(ScenePath))
            {
                BuildPrototypeScene();
            }

            EditorSceneManager.OpenScene(ScenePath);
            var camera = Camera.main ?? UnityEngine.Object.FindFirstObjectByType<Camera>();
            if (camera == null)
            {
                throw new InvalidOperationException("Cannot capture Fusion RPG preview because no camera exists in the prototype scene.");
            }

            camera.transform.position = new Vector3(0f, 4.8f, -10.2f);
            camera.transform.rotation = Quaternion.Euler(25f, 0f, 0f);
            camera.fieldOfView = 52f;

            var renderTexture = new RenderTexture(1280, 720, 24);
            var previousTarget = camera.targetTexture;
            var previousActive = RenderTexture.active;
            camera.targetTexture = renderTexture;
            RenderTexture.active = renderTexture;
            camera.Render();

            var texture = new Texture2D(1280, 720, TextureFormat.RGB24, false);
            texture.ReadPixels(new Rect(0, 0, 1280, 720), 0, 0);
            texture.Apply();

            var outputPath = Path.GetFullPath(Path.Combine(Application.dataPath, PreviewOutputPath));
            var directory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllBytes(outputPath, texture.EncodeToPNG());
            camera.targetTexture = previousTarget;
            RenderTexture.active = previousActive;
            UnityEngine.Object.DestroyImmediate(renderTexture);
            UnityEngine.Object.DestroyImmediate(texture);
            Debug.Log("Fusion RPG preview captured at " + outputPath);
        }

        private static void EnsureFolders()
        {
            var folders = new[]
            {
                "Assets/FusionRPG/Art",
                "Assets/FusionRPG/Art/References",
                "Assets/FusionRPG/Materials",
                "Assets/FusionRPG/Prefabs",
                "Assets/FusionRPG/Scenes",
                "Assets/FusionRPG/UI"
            };

            foreach (var folder in folders)
            {
                Directory.CreateDirectory(folder);
            }
        }

        private static Dictionary<string, Material> CreateMaterials()
        {
            var materials = new Dictionary<string, Material>
            {
                ["stone"] = SaveMaterial("MAT_Stone", Stone, 0f, 0.32f),
                ["paleStone"] = SaveMaterial("MAT_PaleStone", PaleStone, 0f, 0.28f),
                ["navy"] = SaveMaterial("MAT_NavyGlass", Navy, 0f, 0.72f),
                ["indigo"] = SaveMaterial("MAT_IndigoRoof", Indigo, 0f, 0.65f),
                ["sakura"] = SaveMaterial("MAT_SakuraPink", SakuraPink, 0f, 0.58f),
                ["softPink"] = SaveMaterial("MAT_SoftPetalPink", SoftPink, 0f, 0.45f),
                ["ice"] = SaveMaterial("MAT_IceBlue", IceBlue, 0f, 0.82f),
                ["gold"] = SaveMaterial("MAT_GoldTrim", Gold, 0.18f, 0.72f),
                ["wood"] = SaveMaterial("MAT_WarmWood", Wood, 0f, 0.38f),
                ["grass"] = SaveMaterial("MAT_GardenGreen", new Color(0.24f, 0.48f, 0.28f, 1f), 0f, 0.42f),
                ["leaf"] = SaveMaterial("MAT_LeafGreen", new Color(0.18f, 0.36f, 0.2f, 1f), 0f, 0.46f),
                ["uniformRed"] = SaveMaterial("MAT_PlaidRoseRed", new Color(0.5f, 0.08f, 0.16f, 1f), 0f, 0.5f),
                ["blade"] = SaveMaterial("MAT_KatanaBlade", new Color(0.9f, 0.97f, 1f, 1f), 0.12f, 0.9f),
                ["eye"] = SaveMaterial("MAT_SakuraEyes", new Color(0.42f, 0.06f, 0.13f, 1f), 0f, 0.35f),
                ["mouth"] = SaveMaterial("MAT_SoftMouth", new Color(0.78f, 0.22f, 0.32f, 1f), 0f, 0.3f),
                ["trimDark"] = SaveMaterial("MAT_BlackGoldTrim", new Color(0.03f, 0.03f, 0.06f, 1f), 0f, 0.62f),
                ["sheerPink"] = SaveMaterial("MAT_SheerSakuraFabric", new Color(1f, 0.54f, 0.76f, 0.38f), 0f, 0.76f, true),
                ["white"] = SaveMaterial("MAT_UniformWhite", new Color(0.96f, 0.94f, 0.92f, 1f), 0f, 0.45f),
                ["black"] = SaveMaterial("MAT_StockingBlack", new Color(0.02f, 0.018f, 0.026f, 1f), 0f, 0.52f),
                ["water"] = SaveMaterial("MAT_PondWater", new Color(0.22f, 0.75f, 0.95f, 0.62f), 0f, 0.88f, true),
                ["burst"] = SaveMaterial("MAT_SakuraFrostBurst", new Color(0.68f, 0.95f, 1f, 0.42f), 0f, 0.95f, true),
                ["backdrop"] = SaveTextureMaterial("MAT_AcademyPaintedBackdrop", AcademyEnvironmentPath, Color.white)
            };
            return materials;
        }

        private static Material SaveMaterial(string name, Color color, float metallic, float smoothness, bool transparent = false)
        {
            var path = MaterialsFolder + "/" + name + ".mat";
            var shader = Shader.Find("Standard") ?? Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Unlit/Color");
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }

            material.shader = shader;
            if (material.HasProperty("_Color")) material.SetColor("_Color", color);
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", metallic);
            if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", smoothness);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);

            if (transparent)
            {
                material.SetFloat("_Mode", 3f);
                material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                material.SetInt("_ZWrite", 0);
                material.EnableKeyword("_ALPHABLEND_ON");
                material.renderQueue = 3000;
            }

            EditorUtility.SetDirty(material);
            return material;
        }

        private static Material SaveTextureMaterial(string name, string textureAssetPath, Color tint)
        {
            var path = MaterialsFolder + "/" + name + ".mat";
            var shader = Shader.Find("Unlit/Texture") ?? Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Standard");
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }

            material.shader = shader;
            var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(textureAssetPath);
            if (texture != null)
            {
                if (material.HasProperty("_MainTex")) material.SetTexture("_MainTex", texture);
                if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", texture);
            }

            if (material.HasProperty("_Color")) material.SetColor("_Color", tint);
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", tint);
            EditorUtility.SetDirty(material);
            return material;
        }

        private static GameObject NewGroup(string name, Transform parent)
        {
            var group = new GameObject(name);
            group.transform.SetParent(parent, false);
            return group;
        }

        private static void BuildLighting()
        {
            var sun = new GameObject("Soft Morning Sun");
            var light = sun.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.88f, 0.82f, 1f);
            light.intensity = 1.35f;
            sun.transform.rotation = Quaternion.Euler(45f, -38f, 0f);

            var fill = new GameObject("Ice Blue Fill Light");
            var fillLight = fill.AddComponent<Light>();
            fillLight.type = LightType.Point;
            fillLight.color = IceBlue;
            fillLight.intensity = 1.8f;
            fillLight.range = 18f;
            fill.transform.position = new Vector3(-4f, 5f, 2f);
        }

        private static void BuildCourtyard(Transform parent, Dictionary<string, Material> materials)
        {
            BuildPaintedBackdrop(parent, materials);
            CreateCube("Foundation Slab", new Vector3(0f, -0.08f, 0f), new Vector3(28f, 0.12f, 24f), materials["paleStone"], parent);

            for (var x = -6; x <= 6; x++)
            {
                for (var z = -5; z <= 5; z++)
                {
                    var material = (x + z) % 2 == 0 ? materials["stone"] : materials["paleStone"];
                    CreateCube("Stone Tile", new Vector3(x * 1.5f, 0f, z * 1.5f), new Vector3(1.42f, 0.08f, 1.42f), material, parent);
                }
            }

            CreateCylinder("Sakura Crest Plaza", new Vector3(0f, 0.07f, 0f), new Vector3(3.1f, 0.04f, 3.1f), materials["sakura"], parent);
            CreateCylinder("Gold Crest Ring", new Vector3(0f, 0.095f, 0f), new Vector3(3.45f, 0.035f, 3.45f), materials["gold"], parent);
            BuildCrestMosaic(parent, materials);

            BuildAcademyWalls(parent, materials);
            BuildAcademyBuilding(parent, materials);
            BuildGate(parent, materials, new Vector3(-5.8f, 0f, -7.9f), "Courtyard Gate");
            BuildGate(parent, materials, new Vector3(5.8f, 0f, -7.9f), "Training Gate");
            BuildPond(parent, materials);
            BuildBridge(parent, materials);
            BuildNoticeBoard(parent, materials, new Vector3(7.6f, 0f, -3.7f));
            BuildBench(parent, materials, new Vector3(-7.8f, 0f, 1.6f));
            BuildBench(parent, materials, new Vector3(7.7f, 0f, 2.1f));

            for (var i = 0; i < 4; i++)
            {
                BuildLantern(parent, materials, new Vector3(-8f + i * 5.2f, 0f, -4.8f));
            }

            BuildCherryTree(parent, materials, new Vector3(-9.5f, 0f, 5.5f), 1.1f);
            BuildCherryTree(parent, materials, new Vector3(9.4f, 0f, 5.2f), 1f);
            BuildCherryTree(parent, materials, new Vector3(-10.5f, 0f, -4.8f), 0.85f);
            BuildCherryTree(parent, materials, new Vector3(10.8f, 0f, -4.2f), 0.82f);

            BuildBannerRow(parent, materials);
            BuildGardenDetails(parent, materials);

            for (var i = -2; i <= 2; i++)
            {
                BuildPlanter(parent, materials, new Vector3(i * 3.3f, 0f, 7.5f));
            }

            BuildPetalField(parent, materials);
        }

        private static void BuildPaintedBackdrop(Transform parent, Dictionary<string, Material> materials)
        {
            CreateQuad(
                "Painted Sakura Academy Vista",
                new Vector3(0f, 5.1f, 17.2f),
                new Vector3(29f, 12f, 1f),
                materials["backdrop"],
                parent,
                Quaternion.identity);
            CreateCube("Backdrop Soft Horizon Glow", new Vector3(0f, 2.8f, 16.85f), new Vector3(30f, 4.2f, 0.08f), materials["burst"], parent);
        }

        private static void BuildAcademyWalls(Transform parent, Dictionary<string, Material> materials)
        {
            for (var x = -12; x <= 12; x += 4)
            {
                BuildWallSegment(parent, materials, new Vector3(x, 0f, -9.8f), Quaternion.identity);
                if (x < -4 || x > 4)
                {
                    BuildWallSegment(parent, materials, new Vector3(x, 0f, 10.8f), Quaternion.identity);
                }
            }

            for (var z = -6; z <= 8; z += 4)
            {
                BuildWallSegment(parent, materials, new Vector3(-13.4f, 0f, z), Quaternion.Euler(0f, 90f, 0f));
                BuildWallSegment(parent, materials, new Vector3(13.4f, 0f, z), Quaternion.Euler(0f, 90f, 0f));
            }
        }

        private static void BuildWallSegment(Transform parent, Dictionary<string, Material> materials, Vector3 position, Quaternion rotation)
        {
            var wall = NewGroup("Sakura Perimeter Wall", parent);
            wall.transform.position = position;
            wall.transform.rotation = rotation;
            CreateCube("White Wall Panel", new Vector3(0f, 0.65f, 0f), new Vector3(3.55f, 1.25f, 0.32f), materials["white"], wall.transform);
            CreateCube("Navy Tile Cap", new Vector3(0f, 1.42f, 0f), new Vector3(3.8f, 0.24f, 0.5f), materials["indigo"], wall.transform);
            CreateCube("Gold Rail", new Vector3(0f, 1.58f, -0.26f), new Vector3(3.9f, 0.08f, 0.08f), materials["gold"], wall.transform);
            CreateCylinder("Wall Sakura Medallion", new Vector3(0f, 0.78f, -0.19f), new Vector3(0.38f, 0.04f, 0.38f), materials["sakura"], wall.transform, Quaternion.Euler(90f, 0f, 0f));
        }

        private static void BuildCrestMosaic(Transform parent, Dictionary<string, Material> materials)
        {
            for (var i = 0; i < 8; i++)
            {
                var angle = i * 45f;
                var radians = angle * Mathf.Deg2Rad;
                var position = new Vector3(Mathf.Sin(radians) * 0.86f, 0.14f, Mathf.Cos(radians) * 0.86f);
                CreateCube(
                    "Sakura Crest Petal",
                    position,
                    new Vector3(0.24f, 0.035f, 1.0f),
                    i % 2 == 0 ? materials["softPink"] : materials["sakura"],
                    parent,
                    Quaternion.Euler(0f, angle, 0f));
            }

            CreateCylinder("Crest Gold Center", new Vector3(0f, 0.17f, 0f), new Vector3(0.42f, 0.035f, 0.42f), materials["gold"], parent);
        }

        private static void BuildBannerRow(Transform parent, Dictionary<string, Material> materials)
        {
            for (var i = 0; i < 6; i++)
            {
                var x = -10.5f + i * 4.2f;
                BuildBannerStand(parent, materials, new Vector3(x, 0f, -6.2f), Quaternion.identity);
            }

            for (var i = 0; i < 4; i++)
            {
                var z = -4.4f + i * 3.4f;
                BuildBannerStand(parent, materials, new Vector3(-11.8f, 0f, z), Quaternion.Euler(0f, 90f, 0f));
                BuildBannerStand(parent, materials, new Vector3(11.8f, 0f, z), Quaternion.Euler(0f, -90f, 0f));
            }
        }

        private static void BuildBannerStand(Transform parent, Dictionary<string, Material> materials, Vector3 position, Quaternion rotation)
        {
            var stand = NewGroup("Sakura Festival Banner", parent);
            stand.transform.position = position;
            stand.transform.rotation = rotation;
            CreateCylinder("Banner Pole", new Vector3(0f, 1.2f, 0f), new Vector3(0.08f, 2.4f, 0.08f), materials["navy"], stand.transform);
            CreateCube("Banner Cloth", new Vector3(0.28f, 1.25f, -0.03f), new Vector3(0.56f, 1.35f, 0.05f), materials["sakura"], stand.transform);
            CreateCube("Banner Pale Stripe", new Vector3(0.28f, 1.25f, -0.07f), new Vector3(0.24f, 1.05f, 0.04f), materials["softPink"], stand.transform);
            CreateCylinder("Banner Crest", new Vector3(0.28f, 1.58f, -0.1f), new Vector3(0.22f, 0.035f, 0.22f), materials["gold"], stand.transform, Quaternion.Euler(90f, 0f, 0f));
            CreateSphere("Banner Flower", new Vector3(0.28f, 1.58f, -0.14f), Vector3.one * 0.16f, materials["white"], stand.transform, true);
        }

        private static void BuildGardenDetails(Transform parent, Dictionary<string, Material> materials)
        {
            for (var i = 0; i < 9; i++)
            {
                var x = -10f + i * 2.5f;
                BuildFlowerStrip(parent, materials, new Vector3(x, 0f, 8.8f));
                BuildFlowerStrip(parent, materials, new Vector3(x, 0f, -8.5f));
            }

            for (var i = 0; i < 16; i++)
            {
                var angle = i * 22.5f;
                var radians = angle * Mathf.Deg2Rad;
                var radius = 5.2f + (i % 3) * 0.35f;
                var position = new Vector3(Mathf.Sin(radians) * radius, 0.12f, Mathf.Cos(radians) * radius);
                CreateCube("Scattered Gold Path Inlay", position, new Vector3(0.52f, 0.035f, 0.08f), materials["gold"], parent, Quaternion.Euler(0f, angle, 0f));
            }

            for (var i = 0; i < 10; i++)
            {
                var position = new Vector3(-8.5f + i * 1.9f, 0.14f, -2.2f + Mathf.Sin(i * 1.7f) * 0.6f);
                CreateCube("Loose Sakura Ground Petal", position, new Vector3(0.18f, 0.025f, 0.46f), i % 2 == 0 ? materials["sakura"] : materials["softPink"], parent, Quaternion.Euler(0f, i * 31f, 0f));
            }
        }

        private static void BuildFlowerStrip(Transform parent, Dictionary<string, Material> materials, Vector3 position)
        {
            var strip = NewGroup("Dense Sakura Flower Strip", parent);
            strip.transform.position = position;
            CreateCube("Leafy Ground", new Vector3(0f, 0.12f, 0f), new Vector3(1.7f, 0.18f, 0.55f), materials["leaf"], strip.transform);
            CreateSphere("Soft Flower A", new Vector3(-0.45f, 0.31f, -0.06f), Vector3.one * 0.22f, materials["softPink"], strip.transform, true);
            CreateSphere("Soft Flower B", new Vector3(0.02f, 0.36f, 0.04f), Vector3.one * 0.26f, materials["sakura"], strip.transform, true);
            CreateSphere("Soft Flower C", new Vector3(0.45f, 0.3f, -0.02f), Vector3.one * 0.2f, materials["white"], strip.transform, true);
        }

        private static void BuildAcademyBuilding(Transform parent, Dictionary<string, Material> materials)
        {
            CreateCube("Sakura Academy Main Hall", new Vector3(0f, 1.4f, 9.8f), new Vector3(11.5f, 2.8f, 3.6f), materials["white"], parent);
            CreateCube("Left Academy Wing", new Vector3(-7.8f, 1.05f, 10.1f), new Vector3(4.6f, 2.1f, 3.1f), materials["white"], parent);
            CreateCube("Right Academy Wing", new Vector3(7.8f, 1.05f, 10.1f), new Vector3(4.6f, 2.1f, 3.1f), materials["white"], parent);
            CreateCube("Main Hall Navy Base", new Vector3(0f, 0.35f, 7.75f), new Vector3(12.2f, 0.7f, 0.45f), materials["navy"], parent);
            CreateCube("Left Wing Navy Base", new Vector3(-7.8f, 0.32f, 7.92f), new Vector3(5.1f, 0.62f, 0.42f), materials["navy"], parent);
            CreateCube("Right Wing Navy Base", new Vector3(7.8f, 0.32f, 7.92f), new Vector3(5.1f, 0.62f, 0.42f), materials["navy"], parent);
            CreateCube("Main Hall Roof", new Vector3(0f, 3.15f, 9.8f), new Vector3(12.8f, 0.5f, 4.2f), materials["indigo"], parent);
            CreateCube("Main Hall Roof Cap", new Vector3(0f, 3.55f, 9.8f), new Vector3(8.8f, 0.34f, 3.2f), materials["indigo"], parent);
            CreateGabledRoof("Main Hall Swept Roof", new Vector3(0f, 3.78f, 9.8f), 13.4f, 4.7f, 0.9f, materials["indigo"], parent);
            CreateCube("Left Wing Roof", new Vector3(-7.8f, 2.42f, 10.1f), new Vector3(5.3f, 0.44f, 3.7f), materials["indigo"], parent);
            CreateCube("Right Wing Roof", new Vector3(7.8f, 2.42f, 10.1f), new Vector3(5.3f, 0.44f, 3.7f), materials["indigo"], parent);
            CreateCube("Left Wing Roof Cap", new Vector3(-7.8f, 2.76f, 10.1f), new Vector3(3.7f, 0.28f, 2.65f), materials["indigo"], parent);
            CreateCube("Right Wing Roof Cap", new Vector3(7.8f, 2.76f, 10.1f), new Vector3(3.7f, 0.28f, 2.65f), materials["indigo"], parent);
            CreateGabledRoof("Left Wing Swept Roof", new Vector3(-7.8f, 2.98f, 10.1f), 5.8f, 3.9f, 0.64f, materials["indigo"], parent);
            CreateGabledRoof("Right Wing Swept Roof", new Vector3(7.8f, 2.98f, 10.1f), 5.8f, 3.9f, 0.64f, materials["indigo"], parent);
            CreateCube("Gold Roof Trim Front", new Vector3(0f, 3.47f, 7.62f), new Vector3(13.1f, 0.14f, 0.2f), materials["gold"], parent);
            CreateCube("Main Roof Gold Ridge", new Vector3(0f, 4.25f, 9.8f), new Vector3(9.5f, 0.12f, 0.18f), materials["gold"], parent);
            CreateCube("Left Wing Gold Trim", new Vector3(-7.8f, 2.72f, 7.98f), new Vector3(5.5f, 0.12f, 0.16f), materials["gold"], parent);
            CreateCube("Right Wing Gold Trim", new Vector3(7.8f, 2.72f, 7.98f), new Vector3(5.5f, 0.12f, 0.16f), materials["gold"], parent);
            CreateCube("Left Roof Gold Ridge", new Vector3(-7.8f, 3.31f, 10.1f), new Vector3(4.0f, 0.09f, 0.14f), materials["gold"], parent);
            CreateCube("Right Roof Gold Ridge", new Vector3(7.8f, 3.31f, 10.1f), new Vector3(4.0f, 0.09f, 0.14f), materials["gold"], parent);
            CreateCylinder("Hall Sakura Crest", new Vector3(0f, 2.55f, 7.55f), new Vector3(0.9f, 0.08f, 0.9f), materials["sakura"], parent, Quaternion.Euler(90f, 0f, 0f));
            CreateCylinder("Hall Gold Crest Ring", new Vector3(0f, 2.55f, 7.49f), new Vector3(1.15f, 0.04f, 1.15f), materials["gold"], parent, Quaternion.Euler(90f, 0f, 0f));
            CreateCylinder("Hall Sakura Crest Core", new Vector3(0f, 2.55f, 7.44f), new Vector3(0.72f, 0.04f, 0.72f), materials["sakura"], parent, Quaternion.Euler(90f, 0f, 0f));

            for (var x = -4; x <= 4; x += 2)
            {
                CreateCube("Warm Window", new Vector3(x, 1.65f, 7.5f), new Vector3(0.85f, 0.75f, 0.08f), materials["gold"], parent);
                CreateCube("Window Navy Frame Vertical", new Vector3(x - 0.43f, 1.65f, 7.44f), new Vector3(0.06f, 0.85f, 0.08f), materials["navy"], parent);
                CreateCube("Window Navy Frame Cross", new Vector3(x, 1.65f, 7.43f), new Vector3(0.9f, 0.06f, 0.08f), materials["navy"], parent);
            }

            for (var x = -9; x <= 9; x += 3)
            {
                if (Mathf.Abs(x) < 6) continue;
                CreateCube("Wing Warm Window", new Vector3(x, 1.35f, 7.76f), new Vector3(0.76f, 0.62f, 0.08f), materials["gold"], parent);
                CreateCube("Wing Window Frame", new Vector3(x, 1.35f, 7.7f), new Vector3(0.84f, 0.08f, 0.08f), materials["navy"], parent);
            }

            for (var x = -5f; x <= 5f; x += 2.5f)
            {
                CreateCube("Academy Front Column", new Vector3(x, 1.24f, 7.28f), new Vector3(0.22f, 1.85f, 0.18f), materials["navy"], parent);
                CreateCube("Column Gold Band", new Vector3(x, 1.92f, 7.16f), new Vector3(0.32f, 0.08f, 0.08f), materials["gold"], parent);
            }

            CreateCube("Front Stairs", new Vector3(0f, 0.18f, 6.35f), new Vector3(4.3f, 0.26f, 1.2f), materials["stone"], parent);
            CreateCube("Front Step Lower", new Vector3(0f, 0.1f, 5.7f), new Vector3(5.4f, 0.18f, 0.9f), materials["paleStone"], parent);
            CreateCube("Front Step Gold Line", new Vector3(0f, 0.34f, 5.88f), new Vector3(4.7f, 0.05f, 0.08f), materials["gold"], parent);
        }

        private static void BuildGate(Transform parent, Dictionary<string, Material> materials, Vector3 position, string name)
        {
            var gate = NewGroup(name, parent);
            gate.transform.position = position;
            CreateCube("Left Pillar", new Vector3(-1.35f, 1.2f, 0f), new Vector3(0.35f, 2.4f, 0.45f), materials["navy"], gate.transform);
            CreateCube("Right Pillar", new Vector3(1.35f, 1.2f, 0f), new Vector3(0.35f, 2.4f, 0.45f), materials["navy"], gate.transform);
            CreateCube("Pink Banner L", new Vector3(-1.35f, 1.1f, -0.28f), new Vector3(0.23f, 1.45f, 0.05f), materials["sakura"], gate.transform);
            CreateCube("Pink Banner R", new Vector3(1.35f, 1.1f, -0.28f), new Vector3(0.23f, 1.45f, 0.05f), materials["sakura"], gate.transform);
            CreateCube("Crossbeam", new Vector3(0f, 2.45f, 0f), new Vector3(3.6f, 0.32f, 0.55f), materials["wood"], gate.transform);
            CreateCube("Gold Beam Line", new Vector3(0f, 2.62f, -0.31f), new Vector3(3.75f, 0.08f, 0.08f), materials["gold"], gate.transform);
            CreateCube("Navy Roof", new Vector3(0f, 2.9f, 0f), new Vector3(4.2f, 0.34f, 0.85f), materials["indigo"], gate.transform);
            CreateCube("Raised Roof Ridge", new Vector3(0f, 3.16f, 0f), new Vector3(2.8f, 0.18f, 0.58f), materials["indigo"], gate.transform);
            CreateGabledRoof("Gate Gabled Roof", new Vector3(0f, 3.26f, 0f), 4.4f, 1.05f, 0.42f, materials["indigo"], gate.transform);
            CreateCube("Gold Roof Trim", new Vector3(0f, 3.12f, -0.44f), new Vector3(4.45f, 0.12f, 0.12f), materials["gold"], gate.transform);
            CreateCylinder("Gate Sakura Crest", new Vector3(0f, 2.62f, -0.52f), new Vector3(0.48f, 0.05f, 0.48f), materials["sakura"], gate.transform, Quaternion.Euler(90f, 0f, 0f));
            CreateSphere("Left Hanging Charm", new Vector3(-0.75f, 2.15f, -0.34f), Vector3.one * 0.14f, materials["gold"], gate.transform, true);
            CreateSphere("Right Hanging Charm", new Vector3(0.75f, 2.15f, -0.34f), Vector3.one * 0.14f, materials["gold"], gate.transform, true);
            CreateCylinder("Left Tassel", new Vector3(-0.75f, 1.92f, -0.34f), new Vector3(0.05f, 0.38f, 0.05f), materials["sakura"], gate.transform);
            CreateCylinder("Right Tassel", new Vector3(0.75f, 1.92f, -0.34f), new Vector3(0.05f, 0.38f, 0.05f), materials["sakura"], gate.transform);
        }

        private static void BuildPond(Transform parent, Dictionary<string, Material> materials)
        {
            CreateCylinder("Stone Pond Rim", new Vector3(6.4f, 0.05f, 5.2f), new Vector3(2.6f, 0.12f, 2.6f), materials["stone"], parent);
            CreateCylinder("Pond Water", new Vector3(6.4f, 0.16f, 5.2f), new Vector3(2.25f, 0.05f, 2.25f), materials["water"], parent);
            CreateCylinder("Fountain Bowl", new Vector3(6.4f, 0.7f, 5.2f), new Vector3(0.62f, 0.18f, 0.62f), materials["paleStone"], parent);
            CreateCylinder("Fountain Core", new Vector3(6.4f, 1.1f, 5.2f), new Vector3(0.24f, 0.72f, 0.24f), materials["stone"], parent);
            CreateSphere("Ice Sakura Fountain Light", new Vector3(6.4f, 1.65f, 5.2f), new Vector3(0.42f, 0.42f, 0.42f), materials["ice"], parent);
            for (var i = 0; i < 10; i++)
            {
                var angle = i * 36f;
                var radians = angle * Mathf.Deg2Rad;
                var position = new Vector3(6.4f + Mathf.Sin(radians) * 1.38f, 0.24f, 5.2f + Mathf.Cos(radians) * 1.38f);
                CreateSphere("Lotus Leaf", position, new Vector3(0.32f, 0.04f, 0.23f), i % 2 == 0 ? materials["leaf"] : materials["grass"], parent, true);
            }
            CreateCube("Water Sparkle A", new Vector3(5.75f, 0.29f, 4.65f), new Vector3(0.5f, 0.025f, 0.05f), materials["ice"], parent, Quaternion.Euler(0f, 28f, 0f));
            CreateCube("Water Sparkle B", new Vector3(7.05f, 0.29f, 5.82f), new Vector3(0.42f, 0.025f, 0.05f), materials["ice"], parent, Quaternion.Euler(0f, -42f, 0f));
        }

        private static void BuildBridge(Transform parent, Dictionary<string, Material> materials)
        {
            var bridge = NewGroup("Pink Garden Bridge", parent);
            bridge.transform.position = new Vector3(4.1f, 0f, 4.9f);
            CreateCube("Bridge Deck", new Vector3(0f, 0.35f, 0f), new Vector3(3.1f, 0.25f, 0.9f), materials["wood"], bridge.transform);
            CreateCube("Left Rail", new Vector3(0f, 0.78f, -0.56f), new Vector3(3.25f, 0.16f, 0.12f), materials["sakura"], bridge.transform);
            CreateCube("Right Rail", new Vector3(0f, 0.78f, 0.56f), new Vector3(3.25f, 0.16f, 0.12f), materials["sakura"], bridge.transform);
            CreateCube("Gold Rail L", new Vector3(0f, 0.98f, -0.56f), new Vector3(3.35f, 0.08f, 0.08f), materials["gold"], bridge.transform);
            CreateCube("Gold Rail R", new Vector3(0f, 0.98f, 0.56f), new Vector3(3.35f, 0.08f, 0.08f), materials["gold"], bridge.transform);
            for (var i = -1; i <= 1; i++)
            {
                CreateCube("Bridge Plank Line", new Vector3(i * 0.72f, 0.51f, 0f), new Vector3(0.06f, 0.05f, 0.96f), materials["gold"], bridge.transform);
            }
        }

        private static void BuildNoticeBoard(Transform parent, Dictionary<string, Material> materials, Vector3 position)
        {
            var board = NewGroup("Academy Notice Board", parent);
            board.transform.position = position;
            CreateCube("Board Back", new Vector3(0f, 1.15f, 0f), new Vector3(2.6f, 1.35f, 0.18f), materials["wood"], board.transform);
            CreateCube("Paper A", new Vector3(-0.45f, 1.22f, -0.11f), new Vector3(0.65f, 0.82f, 0.04f), materials["white"], board.transform);
            CreateCube("Paper B", new Vector3(0.45f, 1.22f, -0.11f), new Vector3(0.65f, 0.82f, 0.04f), materials["paleStone"], board.transform);
            CreateCube("Roof", new Vector3(0f, 2.05f, 0f), new Vector3(3f, 0.28f, 0.72f), materials["indigo"], board.transform);
            CreateCube("Gold Trim", new Vector3(0f, 2.23f, -0.37f), new Vector3(3.1f, 0.08f, 0.08f), materials["gold"], board.transform);
        }

        private static void BuildBench(Transform parent, Dictionary<string, Material> materials, Vector3 position)
        {
            var bench = NewGroup("Sakura Bench", parent);
            bench.transform.position = position;
            CreateCube("Seat", new Vector3(0f, 0.55f, 0f), new Vector3(2.4f, 0.22f, 0.58f), materials["wood"], bench.transform);
            CreateCube("Back", new Vector3(0f, 1.0f, 0.35f), new Vector3(2.45f, 0.65f, 0.16f), materials["wood"], bench.transform);
            CreateCube("Left Leg", new Vector3(-0.85f, 0.25f, -0.1f), new Vector3(0.18f, 0.5f, 0.18f), materials["navy"], bench.transform);
            CreateCube("Right Leg", new Vector3(0.85f, 0.25f, -0.1f), new Vector3(0.18f, 0.5f, 0.18f), materials["navy"], bench.transform);
            CreateCylinder("Bench Crest", new Vector3(0f, 1.05f, 0.25f), new Vector3(0.36f, 0.04f, 0.36f), materials["sakura"], bench.transform, Quaternion.Euler(90f, 0f, 0f));
        }

        private static void BuildLantern(Transform parent, Dictionary<string, Material> materials, Vector3 position)
        {
            var lantern = NewGroup("Sakura Lantern", parent);
            lantern.transform.position = position;
            CreateCylinder("Post", new Vector3(0f, 0.95f, 0f), new Vector3(0.14f, 1.9f, 0.14f), materials["navy"], lantern.transform);
            CreateCube("Lamp Body", new Vector3(0f, 2.1f, 0f), new Vector3(0.58f, 0.72f, 0.58f), materials["sakura"], lantern.transform);
            CreateCube("Lamp Roof", new Vector3(0f, 2.55f, 0f), new Vector3(0.84f, 0.18f, 0.84f), materials["indigo"], lantern.transform);
            var lightObject = new GameObject("Soft Pink Lantern Light");
            lightObject.transform.SetParent(lantern.transform, false);
            lightObject.transform.localPosition = new Vector3(0f, 2.08f, 0f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = SoftPink;
            light.range = 3.2f;
            light.intensity = 1.25f;
        }

        private static void BuildCherryTree(Transform parent, Dictionary<string, Material> materials, Vector3 position, float scale)
        {
            var tree = NewGroup("Cherry Blossom Tree", parent);
            tree.transform.position = position;
            CreateCylinder("Twisted Trunk", new Vector3(0f, 1.15f * scale, 0f), new Vector3(0.38f * scale, 2.3f * scale, 0.38f * scale), materials["wood"], tree.transform);
            CreateSphere("Petal Crown A", new Vector3(0f, 2.8f * scale, 0f), Vector3.one * 1.6f * scale, materials["softPink"], tree.transform);
            CreateSphere("Petal Crown B", new Vector3(-0.9f * scale, 2.55f * scale, 0.25f * scale), Vector3.one * 1.1f * scale, materials["sakura"], tree.transform);
            CreateSphere("Petal Crown C", new Vector3(0.95f * scale, 2.55f * scale, -0.2f * scale), Vector3.one * 1.15f * scale, materials["softPink"], tree.transform);
            CreateSphere("Petal Crown D", new Vector3(0.15f * scale, 3.25f * scale, -0.55f * scale), Vector3.one * 0.95f * scale, materials["sakura"], tree.transform);
        }

        private static void BuildPlanter(Transform parent, Dictionary<string, Material> materials, Vector3 position)
        {
            var planter = NewGroup("Flower Planter", parent);
            planter.transform.position = position;
            CreateCube("Planter Box", new Vector3(0f, 0.32f, 0f), new Vector3(1.65f, 0.55f, 0.75f), materials["stone"], planter.transform);
            CreateSphere("Flower Cluster L", new Vector3(-0.45f, 0.72f, 0f), Vector3.one * 0.32f, materials["sakura"], planter.transform);
            CreateSphere("Flower Cluster M", new Vector3(0f, 0.78f, 0.05f), Vector3.one * 0.36f, materials["softPink"], planter.transform);
            CreateSphere("Flower Cluster R", new Vector3(0.42f, 0.7f, -0.05f), Vector3.one * 0.3f, materials["ice"], planter.transform);
        }

        private static void BuildPetalField(Transform parent, Dictionary<string, Material> materials)
        {
            var petals = new GameObject("Falling Sakura Petals");
            petals.transform.SetParent(parent, false);
            petals.transform.position = new Vector3(0f, 7f, 0f);
            var ps = petals.AddComponent<ParticleSystem>();
            var main = ps.main;
            main.startColor = new ParticleSystem.MinMaxGradient(SoftPink, SakuraPink);
            main.startSize = new ParticleSystem.MinMaxCurve(0.08f, 0.18f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.4f, 1.1f);
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = 260;
            var emission = ps.emission;
            emission.rateOverTime = 26f;
            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(22f, 1f, 18f);
            var renderer = petals.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = materials["softPink"];
        }

        private static GameObject BuildPlayer(Transform parent, Dictionary<string, Material> materials)
        {
            var player = new GameObject("Sakuraba Sakura");
            player.transform.SetParent(parent, false);
            player.transform.position = new Vector3(0f, 0.08f, -3.7f);
            player.transform.rotation = Quaternion.Euler(0f, 0f, 0f);

            var controller = player.AddComponent<CharacterController>();
            controller.center = new Vector3(0f, 0.95f, 0f);
            controller.height = 1.9f;
            controller.radius = 0.35f;

            var health = player.AddComponent<Health>();
            health.ConfigureMaxHealth(120);
            player.AddComponent<DamageHitbox>();
            player.AddComponent<PlayerController>();
            player.AddComponent<PlayerCombat>();

            var visuals = NewGroup("Stylized Character Visuals", player.transform);
            CreateCapsule("Uniform Body", new Vector3(0f, 0.95f, 0f), new Vector3(0.42f, 0.72f, 0.42f), materials["navy"], visuals.transform, true);
            CreateSphere("Head", new Vector3(0f, 1.78f, 0f), Vector3.one * 0.42f, materials["white"], visuals.transform, true);
            CreateCapsule("Sakura Hair Fall", new Vector3(0f, 1.35f, 0.24f), new Vector3(0.55f, 1.35f, 0.55f), materials["sakura"], visuals.transform, true);
            CreateSphere("Hair Crown", new Vector3(0f, 1.92f, 0.02f), Vector3.one * 0.52f, materials["sakura"], visuals.transform, true);
            CreateCapsule("Left Front Hair Lock", new Vector3(-0.31f, 1.48f, -0.23f), new Vector3(0.12f, 0.95f, 0.12f), materials["sakura"], visuals.transform, true);
            CreateCapsule("Right Front Hair Lock", new Vector3(0.31f, 1.48f, -0.23f), new Vector3(0.12f, 0.95f, 0.12f), materials["sakura"], visuals.transform, true);
            CreateCapsule("Long Back Hair Strand", new Vector3(0.42f, 1.12f, 0.23f), new Vector3(0.12f, 1.28f, 0.12f), materials["softPink"], visuals.transform, true);
            CreateCapsule("Long Back Hair Strand L", new Vector3(-0.42f, 1.08f, 0.22f), new Vector3(0.12f, 1.18f, 0.12f), materials["softPink"], visuals.transform, true);
            CreateVisualCube("Left Eye", new Vector3(-0.13f, 1.82f, -0.36f), new Vector3(0.08f, 0.055f, 0.025f), materials["eye"], visuals.transform);
            CreateVisualCube("Right Eye", new Vector3(0.13f, 1.82f, -0.36f), new Vector3(0.08f, 0.055f, 0.025f), materials["eye"], visuals.transform);
            CreateVisualCube("Soft Smile", new Vector3(0f, 1.68f, -0.37f), new Vector3(0.13f, 0.035f, 0.025f), materials["mouth"], visuals.transform);
            CreateVisualCube("White Blouse", new Vector3(0f, 1.18f, -0.05f), new Vector3(0.56f, 0.42f, 0.16f), materials["white"], visuals.transform);
            CreateVisualCube("Navy Cropped Jacket", new Vector3(0f, 1.22f, -0.18f), new Vector3(0.76f, 0.5f, 0.12f), materials["navy"], visuals.transform);
            CreateVisualCube("Jacket Gold Trim", new Vector3(0f, 1.12f, -0.27f), new Vector3(0.82f, 0.055f, 0.055f), materials["gold"], visuals.transform);
            CreateVisualCube("Pink Ribbon", new Vector3(0f, 1.38f, -0.31f), new Vector3(0.44f, 0.18f, 0.07f), materials["sakura"], visuals.transform);
            CreateVisualCube("Ribbon Knot", new Vector3(0f, 1.39f, -0.36f), new Vector3(0.16f, 0.16f, 0.07f), materials["gold"], visuals.transform, Quaternion.Euler(0f, 0f, 45f));
            CreateVisualCube("Layered Skirt Core", new Vector3(0f, 0.62f, 0f), new Vector3(0.88f, 0.34f, 0.82f), materials["uniformRed"], visuals.transform);
            for (var i = -2; i <= 2; i++)
            {
                CreateVisualCube("Plaid Skirt Pleat", new Vector3(i * 0.17f, 0.61f, -0.43f), new Vector3(0.045f, 0.39f, 0.06f), i % 2 == 0 ? materials["black"] : materials["sakura"], visuals.transform);
            }
            CreateVisualCube("Sheer Left Overskirt", new Vector3(-0.46f, 0.58f, 0.16f), new Vector3(0.18f, 0.62f, 0.82f), materials["sheerPink"], visuals.transform, Quaternion.Euler(0f, 0f, -8f));
            CreateVisualCube("Sheer Right Overskirt", new Vector3(0.46f, 0.58f, 0.16f), new Vector3(0.18f, 0.62f, 0.82f), materials["sheerPink"], visuals.transform, Quaternion.Euler(0f, 0f, 8f));
            CreateVisualCube("Back Tail Fabric", new Vector3(0f, 0.62f, 0.52f), new Vector3(0.72f, 0.74f, 0.14f), materials["sheerPink"], visuals.transform);
            CreateVisualCube("Left Sleeve", new Vector3(-0.48f, 1.08f, -0.03f), new Vector3(0.18f, 0.58f, 0.18f), materials["white"], visuals.transform, Quaternion.Euler(0f, 0f, -14f));
            CreateVisualCube("Right Sleeve", new Vector3(0.48f, 1.08f, -0.03f), new Vector3(0.18f, 0.58f, 0.18f), materials["white"], visuals.transform, Quaternion.Euler(0f, 0f, 14f));
            CreateVisualCube("Left Sleeve Cuff", new Vector3(-0.56f, 0.78f, -0.04f), new Vector3(0.22f, 0.08f, 0.2f), materials["gold"], visuals.transform, Quaternion.Euler(0f, 0f, -14f));
            CreateVisualCube("Right Sleeve Cuff", new Vector3(0.56f, 0.78f, -0.04f), new Vector3(0.22f, 0.08f, 0.2f), materials["gold"], visuals.transform, Quaternion.Euler(0f, 0f, 14f));
            CreateCapsule("Left Stocking", new Vector3(-0.18f, 0.28f, 0f), new Vector3(0.16f, 0.55f, 0.16f), materials["black"], visuals.transform, true);
            CreateCapsule("Right Stocking", new Vector3(0.18f, 0.28f, 0f), new Vector3(0.16f, 0.55f, 0.16f), materials["black"], visuals.transform, true);
            CreateVisualCube("Left Shoe", new Vector3(-0.18f, 0.04f, -0.08f), new Vector3(0.2f, 0.11f, 0.34f), materials["trimDark"], visuals.transform);
            CreateVisualCube("Right Shoe", new Vector3(0.18f, 0.04f, -0.08f), new Vector3(0.2f, 0.11f, 0.34f), materials["trimDark"], visuals.transform);
            BuildHairFlower(visuals.transform, materials, new Vector3(-0.36f, 1.96f, -0.17f));
            CreateVisualCube("Gold Belt", new Vector3(0f, 0.88f, -0.28f), new Vector3(0.72f, 0.08f, 0.07f), materials["gold"], visuals.transform);
            CreateVisualCube("Belt Sakura Charm", new Vector3(0.34f, 0.76f, -0.31f), new Vector3(0.12f, 0.2f, 0.05f), materials["sakura"], visuals.transform);
            CreateVisualCube("Katana Sheath", new Vector3(0.72f, 0.84f, 0.08f), new Vector3(0.08f, 1.3f, 0.08f), materials["trimDark"], visuals.transform, Quaternion.Euler(0f, 0f, -34f));
            CreateVisualCube("Katana Blade Glint", new Vector3(0.91f, 1.16f, -0.04f), new Vector3(0.045f, 1.05f, 0.035f), materials["blade"], visuals.transform, Quaternion.Euler(0f, 0f, -34f));
            CreateVisualCube("Katana Guard", new Vector3(0.58f, 0.55f, 0.06f), new Vector3(0.26f, 0.05f, 0.08f), materials["gold"], visuals.transform, Quaternion.Euler(0f, 0f, -34f));

            var skillObject = new GameObject("Sakura Frost Burst Skill");
            skillObject.transform.SetParent(player.transform, false);
            skillObject.transform.localPosition = Vector3.zero;
            skillObject.AddComponent<SkillEffect>().Configure(materials["burst"], 48, 3.2f);

            return player;
        }

        private static void BuildHairFlower(Transform parent, Dictionary<string, Material> materials, Vector3 position)
        {
            var flower = NewGroup("Sakura Hair Flower", parent);
            flower.transform.localPosition = position;
            for (var i = 0; i < 5; i++)
            {
                var angle = i * 72f * Mathf.Deg2Rad;
                CreateSphere(
                    "Hair Flower Petal",
                    new Vector3(Mathf.Sin(angle) * 0.09f, Mathf.Cos(angle) * 0.09f, 0f),
                    Vector3.one * 0.11f,
                    materials["softPink"],
                    flower.transform,
                    true);
            }

            CreateSphere("Hair Flower Core", Vector3.zero, Vector3.one * 0.08f, materials["gold"], flower.transform, true);
            CreateCylinder("Hair Ornament Cord", new Vector3(0.08f, -0.18f, 0.02f), new Vector3(0.025f, 0.34f, 0.025f), materials["gold"], flower.transform);
            CreateSphere("Hair Ornament Tassel", new Vector3(0.08f, -0.38f, 0.02f), Vector3.one * 0.08f, materials["sakura"], flower.transform, true);
        }

        private static GameObject BuildEnemy(Transform parent, Dictionary<string, Material> materials, Transform target)
        {
            var enemy = new GameObject("Training Sentinel");
            enemy.transform.SetParent(parent, false);
            enemy.transform.position = new Vector3(0f, 0.08f, 2.7f);
            var controller = enemy.AddComponent<CharacterController>();
            controller.center = new Vector3(0f, 0.8f, 0f);
            controller.height = 1.6f;
            controller.radius = 0.33f;

            var health = enemy.AddComponent<Health>();
            health.ConfigureMaxHealth(100);
            var ai = enemy.AddComponent<EnemyController>();
            ai.SetTarget(target);

            var visuals = NewGroup("Sentinel Visuals", enemy.transform);
            CreateCapsule("Navy Core", new Vector3(0f, 0.78f, 0f), new Vector3(0.46f, 0.82f, 0.46f), materials["indigo"], visuals.transform, true);
            CreateSphere("Ice Sensor", new Vector3(0f, 1.42f, -0.02f), Vector3.one * 0.35f, materials["ice"], visuals.transform, true);
            CreateCube("Gold Guard", new Vector3(0f, 1.05f, -0.35f), new Vector3(0.8f, 0.16f, 0.1f), materials["gold"], visuals.transform);
            CreateCube("Pink Sigil", new Vector3(0f, 1.25f, -0.43f), new Vector3(0.38f, 0.38f, 0.08f), materials["sakura"], visuals.transform);
            return enemy;
        }

        private static Camera BuildCamera(Transform target)
        {
            var cameraObject = new GameObject("Third Person Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = new Vector3(0f, 4.2f, -9f);
            cameraObject.transform.rotation = Quaternion.Euler(24f, 0f, 0f);
            var camera = cameraObject.AddComponent<Camera>();
            camera.fieldOfView = 54f;
            camera.nearClipPlane = 0.08f;
            camera.farClipPlane = 120f;
            var orbit = cameraObject.AddComponent<ThirdPersonCamera>();
            orbit.SetTarget(target);
            return camera;
        }

        private static GameHud BuildHud(Health playerHealth, Health enemyHealth, PlayerCombat playerCombat)
        {
            var canvasObject = new GameObject("Fusion RPG HUD");
            var canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasObject.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasObject.AddComponent<GraphicRaycaster>();

            var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf") ?? Font.CreateDynamicFontFromOSFont("Arial", 18);
            var playerFill = CreateHudBar(canvasObject.transform, "Player HP", new Vector2(24f, -24f), new Color(0.12f, 0.22f, 0.35f, 0.82f), SakuraPink);
            var enemyFill = CreateHudBar(canvasObject.transform, "Enemy HP", new Vector2(24f, -62f), new Color(0.12f, 0.22f, 0.35f, 0.82f), IceBlue);
            var skillFill = CreateHudBar(canvasObject.transform, "Sakura Frost Burst", new Vector2(24f, -100f), new Color(0.12f, 0.22f, 0.35f, 0.82f), Gold);
            var objective = CreateHudText(canvasObject.transform, "Objective", "Sakura Frost Burst ready", font, new Vector2(24f, -136f), 18, TextAnchor.UpperLeft);
            var complete = CreateHudText(canvasObject.transform, "Completion", string.Empty, font, new Vector2(0f, -44f), 36, TextAnchor.UpperCenter);
            StretchTop(complete.rectTransform);
            complete.gameObject.SetActive(false);

            var hud = canvasObject.AddComponent<GameHud>();
            hud.ConfigureForPrototype(playerFill, enemyFill, skillFill, objective, complete);
            hud.Bind(playerHealth, enemyHealth, playerCombat);
            return hud;
        }

        private static Image CreateHudBar(Transform parent, string name, Vector2 anchoredPosition, Color backgroundColor, Color fillColor)
        {
            var background = new GameObject(name);
            background.transform.SetParent(parent, false);
            var bgRect = background.AddComponent<RectTransform>();
            bgRect.anchorMin = new Vector2(0f, 1f);
            bgRect.anchorMax = new Vector2(0f, 1f);
            bgRect.pivot = new Vector2(0f, 1f);
            bgRect.anchoredPosition = anchoredPosition;
            bgRect.sizeDelta = new Vector2(260f, 18f);
            var bg = background.AddComponent<Image>();
            bg.color = backgroundColor;

            var fillObject = new GameObject("Fill");
            fillObject.transform.SetParent(background.transform, false);
            var fillRect = fillObject.AddComponent<RectTransform>();
            fillRect.anchorMin = Vector2.zero;
            fillRect.anchorMax = Vector2.one;
            fillRect.offsetMin = new Vector2(2f, 2f);
            fillRect.offsetMax = new Vector2(-2f, -2f);
            var fill = fillObject.AddComponent<Image>();
            fill.color = fillColor;
            fill.type = Image.Type.Filled;
            fill.fillMethod = Image.FillMethod.Horizontal;
            fill.fillOrigin = (int)Image.OriginHorizontal.Left;
            fill.fillAmount = 1f;
            return fill;
        }

        private static Text CreateHudText(Transform parent, string name, string text, Font font, Vector2 anchoredPosition, int size, TextAnchor alignment)
        {
            var obj = new GameObject(name);
            obj.transform.SetParent(parent, false);
            var rect = obj.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = anchoredPosition;
            rect.sizeDelta = new Vector2(620f, 72f);
            var label = obj.AddComponent<Text>();
            label.text = text;
            label.font = font;
            label.fontSize = size;
            label.alignment = alignment;
            label.color = new Color(0.9f, 0.97f, 1f, 1f);
            return label;
        }

        private static void StretchTop(RectTransform rect)
        {
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.pivot = new Vector2(0.5f, 1f);
            rect.sizeDelta = new Vector2(0f, 90f);
        }

        private static GameObject CreateCube(string name, Vector3 position, Vector3 scale, Material material, Transform parent, Quaternion? rotation = null)
        {
            return CreatePrimitive(PrimitiveType.Cube, name, position, scale, material, parent, rotation, false);
        }

        private static GameObject CreateVisualCube(string name, Vector3 position, Vector3 scale, Material material, Transform parent, Quaternion? rotation = null)
        {
            return CreatePrimitive(PrimitiveType.Cube, name, position, scale, material, parent, rotation, true);
        }

        private static GameObject CreateQuad(string name, Vector3 position, Vector3 scale, Material material, Transform parent, Quaternion? rotation = null)
        {
            return CreatePrimitive(PrimitiveType.Quad, name, position, scale, material, parent, rotation, true);
        }

        private static GameObject CreateGabledRoof(string name, Vector3 position, float width, float depth, float height, Material material, Transform parent)
        {
            var obj = new GameObject(name);
            obj.transform.SetParent(parent, false);
            obj.transform.localPosition = position;

            var halfWidth = width * 0.5f;
            var halfDepth = depth * 0.5f;
            var halfHeight = height * 0.5f;
            var vertices = new[]
            {
                new Vector3(-halfWidth, -halfHeight, -halfDepth),
                new Vector3(-halfWidth, halfHeight, 0f),
                new Vector3(-halfWidth, -halfHeight, halfDepth),
                new Vector3(halfWidth, -halfHeight, -halfDepth),
                new Vector3(halfWidth, halfHeight, 0f),
                new Vector3(halfWidth, -halfHeight, halfDepth)
            };
            var triangles = new[]
            {
                0, 1, 2,
                3, 5, 4,
                0, 3, 4,
                0, 4, 1,
                1, 4, 5,
                1, 5, 2,
                0, 2, 5,
                0, 5, 3
            };

            var mesh = new Mesh
            {
                name = name + " Mesh",
                vertices = vertices,
                triangles = triangles
            };
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();

            obj.AddComponent<MeshFilter>().sharedMesh = mesh;
            obj.AddComponent<MeshRenderer>().sharedMaterial = material;
            return obj;
        }

        private static GameObject CreateSphere(string name, Vector3 position, Vector3 scale, Material material, Transform parent, bool removeCollider = false)
        {
            return CreatePrimitive(PrimitiveType.Sphere, name, position, scale, material, parent, null, removeCollider);
        }

        private static GameObject CreateCapsule(string name, Vector3 position, Vector3 scale, Material material, Transform parent, bool removeCollider = false)
        {
            return CreatePrimitive(PrimitiveType.Capsule, name, position, scale, material, parent, null, removeCollider);
        }

        private static GameObject CreateCylinder(string name, Vector3 position, Vector3 scale, Material material, Transform parent, Quaternion? rotation = null)
        {
            return CreatePrimitive(PrimitiveType.Cylinder, name, position, scale, material, parent, rotation, false);
        }

        private static GameObject CreatePrimitive(
            PrimitiveType type,
            string name,
            Vector3 position,
            Vector3 scale,
            Material material,
            Transform parent,
            Quaternion? rotation,
            bool removeCollider)
        {
            var obj = GameObject.CreatePrimitive(type);
            obj.name = name;
            obj.transform.SetParent(parent, false);
            obj.transform.localPosition = position;
            obj.transform.localScale = scale;
            if (rotation.HasValue)
            {
                obj.transform.localRotation = rotation.Value;
            }

            var renderer = obj.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = material;
            }

            if (removeCollider)
            {
                var collider = obj.GetComponent<Collider>();
                if (collider != null)
                {
                    UnityEngine.Object.DestroyImmediate(collider);
                }
            }

            return obj;
        }
    }
}

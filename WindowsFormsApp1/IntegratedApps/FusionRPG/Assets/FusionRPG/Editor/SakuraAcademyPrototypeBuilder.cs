using System;
using System.Collections.Generic;
using System.IO;
using FusionRPG;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace FusionRPG.EditorTools
{
    public static class SakuraAcademyPrototypeBuilder
    {
        private const string ScenePath = "Assets/FusionRPG/Scenes/SakuraAcademyPrototype.unity";
        private const string BuildPath = "Build/FusionRPG.exe";
        private const string MaterialsFolder = "Assets/FusionRPG/Materials";
        private const string CollisionFolder = "Assets/FusionRPG/Collision";
        private const int MaximumCollisionChunkTriangles = 350000;
        private const string AcademyEnvironmentPath = "Assets/FusionRPG/Art/References/sakura_academy_environment.png";
        private const string TempleCourtyardGlbPath = "Assets/FusionRPG/Art/Models/traditional_temple_courtyard.glb";
        private const string TempleCourtyardBaseColorPath = "Assets/FusionRPG/Art/Models/Textures/traditional_temple_courtyard_basecolor.jpg";
        private const string TempleCourtyardNormalPath = "Assets/FusionRPG/Art/Models/Textures/traditional_temple_courtyard_normal.jpg";
        private const string PinkCharacterGlbPath = "Assets/FusionRPG/Art/Models/pink_fantasy_character.glb";
        private const string PinkCharacterBaseColorPath = "Assets/FusionRPG/Art/Models/Textures/pink_fantasy_character_basecolor.jpg";
        private const string PinkCharacterNormalPath = "Assets/FusionRPG/Art/Models/Textures/pink_fantasy_character_normal.jpg";
        private const string LesserEnemyGlbPath = "Assets/FusionRPG/Art/Models/lesser_sakura_beast.glb";
        private const string LesserEnemyBaseColorPath = "Assets/FusionRPG/Art/Models/Textures/lesser_sakura_beast_basecolor.jpg";
        private const string LesserEnemyNormalPath = "Assets/FusionRPG/Art/Models/Textures/lesser_sakura_beast_normal.jpg";
        private const string BossEnemyGlbPath = "Assets/FusionRPG/Art/Models/crimson_sakura_beast_boss.glb";
        private const string BossEnemyBaseColorPath = "Assets/FusionRPG/Art/Models/Textures/crimson_sakura_beast_boss_basecolor.jpg";
        private const string BossEnemyNormalPath = "Assets/FusionRPG/Art/Models/Textures/crimson_sakura_beast_boss_normal.jpg";
        private const string FlowerExplosionPrefabPath = "Assets/ImagyVFX/Prefabs/Flowers/Common/FlowerExplostionParticles.prefab";
        private const string FlowerParticlesPrefabPath = "Assets/ImagyVFX/Prefabs/Flowers/Common/FlowerParticles.prefab";
        private const string FlowerPetalTexturePath = "Assets/ImagyVFX/Textures/Flowers/PetalMultiple.psd";
        private const string PreviewOutputPath = "../../../output/fusion-rpg-unity-preview.png";
        private const float ImportedCourtyardTargetSize = 52f;
        private const float ImportedCharacterTargetHeight = 1.12f;
        private const float ImportedLesserEnemyTargetHeight = 1.35f;
        private const float ImportedBossTargetHeight = 3.05f;

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
            AssetDatabase.Refresh();
            var materials = CreateMaterials();
            EnsureFxResources();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "SakuraAcademyPrototype";

            RenderSettings.ambientLight = new Color(0.46f, 0.52f, 0.62f, 1f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.68f, 0.76f, 0.86f, 1f);
            RenderSettings.fogDensity = 0.006f;

            var root = new GameObject("Sakura Academy Prototype");
            var environment = NewGroup("Environment", root.transform);
            var gameplay = NewGroup("Gameplay", root.transform);

            BuildLighting();
            BuildCourtyard(environment.transform, materials);

            var combatVfx = BuildCompatibleCombatVfx(materials["combatVfx"]);
            var player = BuildPlayer(gameplay.transform, materials);
            SnapCharacterToImportedGround(player);
            var camera = BuildCamera(player.transform);
            player.GetComponent<PlayerController>().SetCamera(camera);

            var skillEffect = player.GetComponentInChildren<SkillEffect>();
            var playerCombat = player.GetComponent<PlayerCombat>();
            playerCombat.ConfigureForPrototype(skillEffect, ~0);
            playerCombat.ConfigureVfx(
                combatVfx.hit,
                combatVfx.projectile,
                combatVfx.area,
                combatVfx.dash,
                combatVfx.ultimate,
                materials["burst"]);

            var waveOne = new[]
            {
                BuildLesserEnemy(gameplay.transform, materials, combatVfx.enemy, player.transform, "緋櫻幼獸・壹", new Vector3(-5f, 0.08f, 17f), 95, 2.75f, 12),
                BuildLesserEnemy(gameplay.transform, materials, combatVfx.enemy, player.transform, "緋櫻幼獸・貳", new Vector3(-13f, 0.08f, 17f), 95, 2.75f, 12)
            };
            var waveTwo = new[]
            {
                BuildLesserEnemy(gameplay.transform, materials, combatVfx.enemy, player.transform, "緋櫻獸・迅", new Vector3(-7f, 0.08f, 15f), 135, 3.2f, 16),
                BuildLesserEnemy(gameplay.transform, materials, combatVfx.enemy, player.transform, "緋櫻獸・牙", new Vector3(-13f, 0.08f, 13f), 150, 2.85f, 19),
                BuildLesserEnemy(gameplay.transform, materials, combatVfx.enemy, player.transform, "緋櫻獸・影", new Vector3(-11f, 0.08f, 17f), 125, 3.45f, 15)
            };
            var boss = BuildBoss(gameplay.transform, materials, combatVfx.boss, player.transform, new Vector3(-5f, 0.08f, 15f));

            foreach (var enemy in waveOne)
            {
                SnapCharacterToImportedGround(enemy);
                enemy.SetActive(false);
            }
            foreach (var enemy in waveTwo)
            {
                SnapCharacterToImportedGround(enemy);
                enemy.SetActive(false);
            }
            SnapCharacterToImportedGround(boss);
            boss.SetActive(false);

            var targetSelection = camera.gameObject.AddComponent<TargetSelectionController>();
            targetSelection.Configure(camera);
            var hud = BuildHud(player.GetComponent<Health>(), playerCombat, targetSelection, boss.GetComponent<Health>());
            var managerObject = new GameObject("Prototype Game Manager");
            managerObject.AddComponent<DisplayBootstrap>();
            managerObject.AddComponent<RuntimeSmokeCapture>();
            var manager = managerObject.AddComponent<PrototypeGameManager>();
            manager.ConfigureEncounter(player.GetComponent<Health>(), playerCombat, targetSelection, hud, waveOne, waveTwo, boss);

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

            var enemies = UnityEngine.Object.FindObjectsByType<EnemyController>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            for (var i = 0; i < enemies.Length; i++)
            {
                enemies[i].gameObject.SetActive(i < 2);
            }

            camera.transform.position = new Vector3(-11f, 3.3f, 20.3f);
            camera.transform.rotation = Quaternion.LookRotation(new Vector3(-11f, 0.9f, 15f) - camera.transform.position, Vector3.up);
            camera.fieldOfView = 56f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.67f, 0.77f, 0.84f, 1f);

            CaptureCameraToPng(camera, PreviewOutputPath);
        }

        public static void CapturePrototypeTopDown()
        {
            if (!File.Exists(ScenePath))
            {
                BuildPrototypeScene();
            }

            EditorSceneManager.OpenScene(ScenePath);
            var camera = Camera.main ?? UnityEngine.Object.FindFirstObjectByType<Camera>();
            if (camera == null)
            {
                throw new InvalidOperationException("Cannot capture Fusion RPG top-down preview because no camera exists in the prototype scene.");
            }

            camera.transform.position = new Vector3(0f, 68f, 0f);
            camera.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            camera.orthographic = true;
            camera.orthographicSize = 28f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.67f, 0.77f, 0.84f, 1f);

            CaptureCameraToPng(camera, "../../../output/fusion-rpg-unity-topdown.png");
        }

        public static void LogOpenSpawnCandidates()
        {
            if (!File.Exists(ScenePath))
            {
                BuildPrototypeScene();
            }

            EditorSceneManager.OpenScene(ScenePath);
            var environment = GameObject.Find("Environment");
            if (environment == null)
            {
                throw new InvalidOperationException("Cannot scan spawn candidates because the Environment root is missing.");
            }

            const float cellSize = 2f;
            var cells = new Dictionary<long, SpawnCell>();
            foreach (var meshFilter in environment.GetComponentsInChildren<MeshFilter>())
            {
                var mesh = meshFilter.sharedMesh;
                if (mesh == null)
                {
                    continue;
                }

                var vertices = mesh.vertices;
                var sampleStep = Mathf.Max(1, vertices.Length / 250000);
                for (var i = 0; i < vertices.Length; i += sampleStep)
                {
                    var world = meshFilter.transform.TransformPoint(vertices[i]);
                    var xi = Mathf.FloorToInt(world.x / cellSize);
                    var zi = Mathf.FloorToInt(world.z / cellSize);
                    var key = ((long)xi << 32) ^ (uint)zi;
                    if (!cells.TryGetValue(key, out var cell))
                    {
                        cell = new SpawnCell(xi, zi);
                        cells.Add(key, cell);
                    }

                    if (world.y >= -0.25f && world.y <= 0.45f)
                    {
                        cell.lowVertices++;
                    }
                    else if (world.y >= 1.05f)
                    {
                        cell.highVertices++;
                    }
                }
            }

            var candidates = new List<SpawnCell>(cells.Values);
            candidates.RemoveAll(cell => cell.lowVertices < 40 || cell.highVertices > 8);
            candidates.Sort((left, right) => right.Score.CompareTo(left.Score));

            var count = Mathf.Min(20, candidates.Count);
            for (var i = 0; i < count; i++)
            {
                var cell = candidates[i];
                var center = cell.GetCenter(cellSize);
                Debug.Log("Open spawn candidate " + i + ": " + center + ", low=" + cell.lowVertices + ", high=" + cell.highVertices + ", score=" + cell.Score);
            }
        }

        private static void CaptureCameraToPng(Camera camera, string relativeOutputPath)
        {
            var renderTexture = new RenderTexture(1280, 720, 24);
            var previousTarget = camera.targetTexture;
            var previousActive = RenderTexture.active;
            var previousOrthographic = camera.orthographic;
            camera.targetTexture = renderTexture;
            RenderTexture.active = renderTexture;
            camera.Render();

            var texture = new Texture2D(1280, 720, TextureFormat.RGB24, false);
            texture.ReadPixels(new Rect(0, 0, 1280, 720), 0, 0);
            texture.Apply();

            var outputPath = Path.GetFullPath(Path.Combine(Application.dataPath, relativeOutputPath));
            var directory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllBytes(outputPath, texture.EncodeToPNG());
            camera.targetTexture = previousTarget;
            camera.orthographic = previousOrthographic;
            RenderTexture.active = previousActive;
            UnityEngine.Object.DestroyImmediate(renderTexture);
            UnityEngine.Object.DestroyImmediate(texture);
            Debug.Log("Fusion RPG preview captured at " + outputPath);
        }

        private sealed class SpawnCell
        {
            private readonly int xIndex;
            private readonly int zIndex;

            public int lowVertices;
            public int highVertices;

            public SpawnCell(int xIndex, int zIndex)
            {
                this.xIndex = xIndex;
                this.zIndex = zIndex;
            }

            public int Score => lowVertices - highVertices * 16;

            public Vector3 GetCenter(float cellSize)
            {
                return new Vector3((xIndex + 0.5f) * cellSize, 0.08f, (zIndex + 0.5f) * cellSize);
            }
        }

        private static void EnsureFolders()
        {
            var folders = new[]
            {
                "Assets/FusionRPG/Art",
                "Assets/FusionRPG/Art/Models",
                "Assets/FusionRPG/Art/Models/Textures",
                "Assets/FusionRPG/Art/References",
                "Assets/FusionRPG/Materials",
                "Assets/FusionRPG/Collision",
                "Assets/FusionRPG/Prefabs",
                "Assets/FusionRPG/Resources",
                "Assets/FusionRPG/Resources/Fx",
                "Assets/FusionRPG/Scenes",
                "Assets/FusionRPG/UI"
            };

            foreach (var folder in folders)
            {
                Directory.CreateDirectory(folder);
            }
        }

        private static void EnsureFxResources()
        {
            Directory.CreateDirectory("Assets/FusionRPG/Resources/Fx");
            const string path = "Assets/FusionRPG/Resources/Fx/MAT_FxAdditive.mat";
            var shader =
                Shader.Find("Legacy Shaders/Particles/Additive") ??
                Shader.Find("Particles/Standard Unlit") ??
                Shader.Find("Sprites/Default") ??
                Shader.Find("Unlit/Color");
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }

            material.shader = shader;
            if (material.HasProperty("_TintColor")) material.SetColor("_TintColor", Color.white);
            if (material.HasProperty("_Color")) material.SetColor("_Color", Color.white);
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", Color.white);
            EditorUtility.SetDirty(material);
            AssetDatabase.SaveAssets();
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
                ["templeCourtyard"] = SaveTempleCourtyardMaterial(),
                ["pinkCharacter"] = SavePinkCharacterMaterial(),
                ["lesserEnemy"] = SaveImportedModelMaterial("MAT_LesserSakuraBeast", LesserEnemyBaseColorPath, LesserEnemyNormalPath, 0.3f),
                ["bossEnemy"] = SaveImportedModelMaterial("MAT_CrimsonSakuraBeast", BossEnemyBaseColorPath, BossEnemyNormalPath, 0.48f),
                ["combatVfx"] = SaveParticleMaterial(),
                ["target"] = SaveMaterial("MAT_TargetSelection", new Color(0.35f, 0.95f, 1f, 0.72f), 0f, 0.92f, true),
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

        private static Material SaveTempleCourtyardMaterial()
        {
            var path = MaterialsFolder + "/MAT_ImportedTempleCourtyard.mat";
            var shader = Shader.Find("Standard") ?? Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Unlit/Texture");
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }

            material.shader = shader;
            var baseColor = AssetDatabase.LoadAssetAtPath<Texture2D>(TempleCourtyardBaseColorPath);
            var normal = AssetDatabase.LoadAssetAtPath<Texture2D>(TempleCourtyardNormalPath);

            if (baseColor != null)
            {
                if (material.HasProperty("_MainTex")) material.SetTexture("_MainTex", baseColor);
                if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", baseColor);
            }

            if (normal != null)
            {
                if (material.HasProperty("_BumpMap")) material.SetTexture("_BumpMap", normal);
                if (material.HasProperty("_BumpScale")) material.SetFloat("_BumpScale", 0.45f);
                material.EnableKeyword("_NORMALMAP");
            }

            if (material.HasProperty("_Color")) material.SetColor("_Color", Color.white);
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", Color.white);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", 0.04f);
            if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", 0.34f);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 0.34f);
            EditorUtility.SetDirty(material);
            return material;
        }

        private static Material SavePinkCharacterMaterial()
        {
            var path = MaterialsFolder + "/MAT_PinkFantasyCharacter.mat";
            var shader = Shader.Find("Standard") ?? Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Unlit/Texture");
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }

            material.shader = shader;
            var baseColor = AssetDatabase.LoadAssetAtPath<Texture2D>(PinkCharacterBaseColorPath);
            var normal = AssetDatabase.LoadAssetAtPath<Texture2D>(PinkCharacterNormalPath);

            if (baseColor != null)
            {
                if (material.HasProperty("_MainTex")) material.SetTexture("_MainTex", baseColor);
                if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", baseColor);
            }

            if (normal != null)
            {
                if (material.HasProperty("_BumpMap")) material.SetTexture("_BumpMap", normal);
                if (material.HasProperty("_BumpScale")) material.SetFloat("_BumpScale", 0.55f);
                material.EnableKeyword("_NORMALMAP");
            }

            if (material.HasProperty("_Color")) material.SetColor("_Color", Color.white);
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", Color.white);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", 0.02f);
            if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", 0.42f);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 0.42f);
            EditorUtility.SetDirty(material);
            return material;
        }

        private static Material SaveImportedModelMaterial(string name, string baseColorPath, string normalPath, float smoothness)
        {
            var path = MaterialsFolder + "/" + name + ".mat";
            var shader = Shader.Find("Standard") ?? Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Unlit/Texture");
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }

            material.shader = shader;
            var baseColor = AssetDatabase.LoadAssetAtPath<Texture2D>(baseColorPath);
            var normal = AssetDatabase.LoadAssetAtPath<Texture2D>(normalPath);
            if (baseColor != null)
            {
                if (material.HasProperty("_MainTex")) material.SetTexture("_MainTex", baseColor);
                if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", baseColor);
            }
            if (normal != null)
            {
                if (material.HasProperty("_BumpMap")) material.SetTexture("_BumpMap", normal);
                if (material.HasProperty("_BumpScale")) material.SetFloat("_BumpScale", 0.5f);
                material.EnableKeyword("_NORMALMAP");
            }

            if (material.HasProperty("_Color")) material.SetColor("_Color", Color.white);
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", Color.white);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", 0.04f);
            if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", smoothness);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            EditorUtility.SetDirty(material);
            return material;
        }

        private static Material SaveParticleMaterial()
        {
            var path = MaterialsFolder + "/MAT_ImagySakuraParticles.mat";
            var shader =
                Shader.Find("Particles/Standard Unlit") ??
                Shader.Find("Universal Render Pipeline/Particles/Unlit") ??
                Shader.Find("Unlit/Transparent") ??
                Shader.Find("Standard");
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }

            material.shader = shader;
            var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(FlowerPetalTexturePath);
            if (texture != null)
            {
                if (material.HasProperty("_MainTex")) material.SetTexture("_MainTex", texture);
                if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", texture);
            }
            if (material.HasProperty("_Color")) material.SetColor("_Color", new Color(1f, 0.48f, 0.75f, 0.9f));
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", new Color(1f, 0.48f, 0.75f, 0.9f));
            material.renderQueue = 3000;
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
            light.intensity = 0.85f;
            sun.transform.rotation = Quaternion.Euler(45f, -38f, 0f);

            var fill = new GameObject("Ice Blue Fill Light");
            var fillLight = fill.AddComponent<Light>();
            fillLight.type = LightType.Point;
            fillLight.color = IceBlue;
            fillLight.intensity = 0.55f;
            fillLight.range = 34f;
            fill.transform.position = new Vector3(-8f, 7f, 3f);
        }

        private static void BuildCourtyard(Transform parent, Dictionary<string, Material> materials)
        {
            if (TryBuildImportedTempleCourtyard(parent, materials["templeCourtyard"]))
            {
                BuildPetalField(parent, materials);
                return;
            }

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

        private static bool TryBuildImportedTempleCourtyard(Transform parent, Material courtyardMaterial)
        {
            var importedPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(TempleCourtyardGlbPath);
            if (importedPrefab == null)
            {
                Debug.LogWarning("Temple courtyard GLB is not available as an imported GameObject yet. Falling back to procedural Sakura Academy blockout.");
                return false;
            }

            var group = NewGroup("Imported Temple Courtyard", parent);
            var instance = PrefabUtility.InstantiatePrefab(importedPrefab, group.transform) as GameObject;
            if (instance == null)
            {
                instance = UnityEngine.Object.Instantiate(importedPrefab, group.transform);
            }

            instance.name = "Traditional Temple Courtyard GLB";
            instance.transform.localPosition = Vector3.zero;
            instance.transform.localRotation = Quaternion.identity;
            instance.transform.localScale = Vector3.one;

            NormalizeImportedModel(group.transform, instance.transform);
            AssignImportedCourtyardMaterial(instance.transform, courtyardMaterial);
            AddMeshColliders(instance.transform);
            SetStaticRecursive(group);

            Debug.Log("Using imported temple courtyard GLB for Sakura Academy terrain.");
            return true;
        }

        private static void AssignImportedCourtyardMaterial(Transform root, Material material)
        {
            if (material == null)
            {
                return;
            }

            foreach (var renderer in root.GetComponentsInChildren<Renderer>())
            {
                renderer.sharedMaterial = material;
            }
        }

        private static void NormalizeImportedModel(Transform group, Transform instance)
        {
            if (!TryGetRendererBounds(group, out var bounds))
            {
                return;
            }

            var horizontalSize = Mathf.Max(bounds.size.x, bounds.size.z);
            if (horizontalSize > 0.01f)
            {
                var scale = ImportedCourtyardTargetSize / horizontalSize;
                instance.localScale *= scale;
            }

            if (!TryGetRendererBounds(group, out bounds))
            {
                return;
            }

            var offset = new Vector3(-bounds.center.x, -bounds.min.y, -bounds.center.z);
            instance.position += offset;
        }

        private static bool TryGetRendererBounds(Transform root, out Bounds bounds)
        {
            var renderers = root.GetComponentsInChildren<Renderer>();
            bounds = new Bounds(root.position, Vector3.zero);
            var hasBounds = false;

            foreach (var renderer in renderers)
            {
                if (!renderer.enabled)
                {
                    continue;
                }

                if (!hasBounds)
                {
                    bounds = renderer.bounds;
                    hasBounds = true;
                }
                else
                {
                    bounds.Encapsulate(renderer.bounds);
                }
            }

            return hasBounds;
        }

        private static void AddMeshColliders(Transform root)
        {
            var meshFilters = root.GetComponentsInChildren<MeshFilter>();
            for (var meshIndex = 0; meshIndex < meshFilters.Length; meshIndex++)
            {
                var meshFilter = meshFilters[meshIndex];
                if (meshFilter.sharedMesh == null)
                {
                    continue;
                }

                var existingCollider = meshFilter.GetComponent<MeshCollider>();
                if (existingCollider != null)
                {
                    UnityEngine.Object.DestroyImmediate(existingCollider);
                }

                var triangleCount = GetMeshTriangleCount(meshFilter.sharedMesh);
                if (triangleCount > MaximumCollisionChunkTriangles)
                {
                    AddExactCollisionChunks(meshFilter, meshIndex);
                    continue;
                }

                var collider = meshFilter.gameObject.AddComponent<MeshCollider>();
                ConfigurePreciseMeshCollider(collider);
                collider.sharedMesh = meshFilter.sharedMesh;
                Debug.Log("Added precise MeshCollider for imported mesh '" + meshFilter.sharedMesh.name + "' (" + triangleCount + " triangles).");
            }
        }

        private static void AddExactCollisionChunks(MeshFilter sourceFilter, int meshIndex)
        {
            var sourceMesh = sourceFilter.sharedMesh;
            var totalTriangles = GetMeshTriangleCount(sourceMesh);
            var expectedChunkCount = Mathf.CeilToInt((float)totalTriangles / MaximumCollisionChunkTriangles);
            var chunks = LoadCollisionChunks(meshIndex, expectedChunkCount, totalTriangles);
            if (chunks == null)
            {
                chunks = GenerateCollisionChunks(sourceMesh, meshIndex, expectedChunkCount);
            }

            for (var i = 0; i < chunks.Count; i++)
            {
                var chunkObject = new GameObject("Exact Collision Chunk " + (i + 1).ToString("00"));
                chunkObject.transform.SetParent(sourceFilter.transform, false);
                var collider = chunkObject.AddComponent<MeshCollider>();
                ConfigurePreciseMeshCollider(collider);
                collider.sharedMesh = chunks[i];
            }

            Debug.Log(
                "Split imported courtyard collider into " + chunks.Count +
                " exact chunks while preserving " + totalTriangles + " triangles.");
        }

        private static List<Mesh> LoadCollisionChunks(int meshIndex, int expectedChunkCount, long expectedTriangles)
        {
            var chunks = new List<Mesh>(expectedChunkCount);
            long triangleCount = 0;
            for (var i = 0; i < expectedChunkCount; i++)
            {
                var chunk = AssetDatabase.LoadAssetAtPath<Mesh>(CollisionChunkPath(meshIndex, i));
                if (chunk == null || GetMeshTriangleCount(chunk) > MaximumCollisionChunkTriangles)
                {
                    return null;
                }

                chunks.Add(chunk);
                triangleCount += GetMeshTriangleCount(chunk);
            }

            return triangleCount == expectedTriangles ? chunks : null;
        }

        private static List<Mesh> GenerateCollisionChunks(Mesh sourceMesh, int meshIndex, int expectedChunkCount)
        {
            for (var i = 0; i < expectedChunkCount + 8; i++)
            {
                AssetDatabase.DeleteAsset(CollisionChunkPath(meshIndex, i));
            }

            var sourceVertices = sourceMesh.vertices;
            var sourceTriangles = sourceMesh.triangles;
            var chunks = new List<Mesh>(expectedChunkCount);
            var indicesPerChunk = MaximumCollisionChunkTriangles * 3;
            for (var chunkIndex = 0; chunkIndex < expectedChunkCount; chunkIndex++)
            {
                var firstIndex = chunkIndex * indicesPerChunk;
                var indexCount = Mathf.Min(indicesPerChunk, sourceTriangles.Length - firstIndex);
                var vertexMap = new Dictionary<int, int>(Mathf.Min(indexCount, 500000));
                var chunkVertices = new List<Vector3>(Mathf.Min(indexCount, 500000));
                var chunkTriangles = new int[indexCount];
                for (var localIndex = 0; localIndex < indexCount; localIndex++)
                {
                    var sourceVertexIndex = sourceTriangles[firstIndex + localIndex];
                    if (!vertexMap.TryGetValue(sourceVertexIndex, out var chunkVertexIndex))
                    {
                        chunkVertexIndex = chunkVertices.Count;
                        vertexMap.Add(sourceVertexIndex, chunkVertexIndex);
                        chunkVertices.Add(sourceVertices[sourceVertexIndex]);
                    }
                    chunkTriangles[localIndex] = chunkVertexIndex;
                }

                var chunkMesh = new Mesh
                {
                    name = "Temple Courtyard Collision " + (chunkIndex + 1).ToString("00"),
                    indexFormat = chunkVertices.Count > 65535
                        ? UnityEngine.Rendering.IndexFormat.UInt32
                        : UnityEngine.Rendering.IndexFormat.UInt16
                };
                chunkMesh.SetVertices(chunkVertices);
                chunkMesh.SetTriangles(chunkTriangles, 0, true);
                chunkMesh.RecalculateBounds();
                AssetDatabase.CreateAsset(chunkMesh, CollisionChunkPath(meshIndex, chunkIndex));
                chunks.Add(chunkMesh);
            }

            return chunks;
        }

        private static string CollisionChunkPath(int meshIndex, int chunkIndex)
        {
            return CollisionFolder + "/TempleCourtyard_" + meshIndex.ToString("00") + "_" + chunkIndex.ToString("00") + ".asset";
        }

        private static void ConfigurePreciseMeshCollider(MeshCollider collider)
        {
            collider.convex = false;
            collider.cookingOptions =
                MeshColliderCookingOptions.CookForFasterSimulation |
                MeshColliderCookingOptions.EnableMeshCleaning |
                MeshColliderCookingOptions.WeldColocatedVertices;
        }

        private static long GetMeshTriangleCount(Mesh mesh)
        {
            long triangleCount = 0;
            for (var subMesh = 0; subMesh < mesh.subMeshCount; subMesh++)
            {
                if (mesh.GetTopology(subMesh) == MeshTopology.Triangles)
                {
                    triangleCount += (long)mesh.GetIndexCount(subMesh) / 3;
                }
            }

            return triangleCount;
        }

        private static void AddGameplayFloor(Transform parent)
        {
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "Imported Courtyard Gameplay Floor";
            floor.transform.SetParent(parent, false);
            floor.transform.localPosition = new Vector3(0f, -0.08f, 0f);
            floor.transform.localScale = new Vector3(54f, 0.12f, 42f);

            var renderer = floor.GetComponent<Renderer>();
            if (renderer != null)
            {
                UnityEngine.Object.DestroyImmediate(renderer);
            }
        }

        private static void SnapCharacterToImportedGround(GameObject actor)
        {
            if (actor == null)
            {
                return;
            }

            Physics.SyncTransforms();
            var origin = actor.transform.position + Vector3.up * 15f;
            var hits = Physics.RaycastAll(origin, Vector3.down, 40f);
            if (hits == null || hits.Length == 0)
            {
                return;
            }

            RaycastHit? bestHit = null;
            foreach (var hit in hits)
            {
                if (hit.collider == null || hit.collider.isTrigger || hit.collider.transform.IsChildOf(actor.transform))
                {
                    continue;
                }

                if (!(hit.collider is MeshCollider))
                {
                    continue;
                }

                if (!bestHit.HasValue || hit.distance < bestHit.Value.distance)
                {
                    bestHit = hit;
                }
            }

            if (!bestHit.HasValue)
            {
                return;
            }

            var controller = actor.GetComponent<CharacterController>();
            var relativeBottom = controller != null ? controller.center.y - controller.height * 0.5f : 0f;
            var position = actor.transform.position;
            position.y = bestHit.Value.point.y - relativeBottom + 0.012f;
            actor.transform.position = position;
        }

        private static void SetStaticRecursive(GameObject obj)
        {
            obj.isStatic = true;
            foreach (Transform child in obj.transform)
            {
                SetStaticRecursive(child.gameObject);
            }
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
            petals.transform.position = new Vector3(0f, 8.5f, 0f);
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
            shape.scale = new Vector3(44f, 1f, 32f);
            var renderer = petals.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = materials["softPink"];
        }

        private static GameObject BuildPlayer(Transform parent, Dictionary<string, Material> materials)
        {
            var player = new GameObject("Sakuraba Sakura");
            player.transform.SetParent(parent, false);
            player.transform.position = new Vector3(-11f, 0.08f, 15f);
            player.transform.rotation = Quaternion.Euler(0f, 0f, 0f);

            var controller = player.AddComponent<CharacterController>();
            controller.center = new Vector3(0f, 0.6f, 0f);
            controller.height = 1.16f;
            controller.radius = 0.2f;
            controller.skinWidth = 0.025f;
            controller.stepOffset = 0.2f;
            controller.slopeLimit = 55f;
            controller.minMoveDistance = 0f;

            var health = player.AddComponent<Health>();
            health.ConfigureMaxHealth(120);
            player.AddComponent<DamageHitbox>();
            player.AddComponent<PlayerController>();
            player.AddComponent<PlayerCombat>();

            var visuals = NewGroup("Player Character Visuals", player.transform);
            if (!TryBuildImportedPlayerCharacter(visuals.transform, materials["pinkCharacter"]))
            {
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
            }

            player.AddComponent<PlayerModelAnimator>().Configure(player.GetComponent<PlayerController>(), visuals.transform);

            var skillObject = new GameObject("Sakura Frost Burst Skill");
            skillObject.transform.SetParent(player.transform, false);
            skillObject.transform.localPosition = Vector3.zero;
            skillObject.AddComponent<SkillEffect>().Configure(materials["burst"], 48, 3.2f);

            return player;
        }

        private static bool TryBuildImportedPlayerCharacter(Transform parent, Material characterMaterial)
        {
            var importedPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(PinkCharacterGlbPath);
            if (importedPrefab == null)
            {
                Debug.LogWarning("Pink fantasy character GLB is not available as an imported GameObject yet. Falling back to procedural character visuals.");
                return false;
            }

            var instance = PrefabUtility.InstantiatePrefab(importedPrefab, parent) as GameObject;
            if (instance == null)
            {
                instance = UnityEngine.Object.Instantiate(importedPrefab, parent);
            }

            instance.name = "Pink Fantasy Character GLB";
            instance.transform.localPosition = Vector3.zero;
            instance.transform.localRotation = Quaternion.identity;
            instance.transform.localScale = Vector3.one;

            NormalizePlayerCharacterVisual(parent, instance.transform);
            AssignImportedCharacterMaterial(instance.transform, characterMaterial);

            Debug.Log("Using imported pink fantasy character GLB for player visuals.");
            return true;
        }

        private static void NormalizePlayerCharacterVisual(Transform parent, Transform instance)
        {
            if (!TryGetRendererBounds(instance, out var bounds))
            {
                return;
            }

            if (bounds.size.y > 0.01f)
            {
                var scale = ImportedCharacterTargetHeight / bounds.size.y;
                instance.localScale *= scale;
            }

            if (!TryGetRendererBounds(instance, out bounds))
            {
                return;
            }

            var targetBase = parent.position;
            var offset = new Vector3(targetBase.x - bounds.center.x, targetBase.y - bounds.min.y, targetBase.z - bounds.center.z);
            instance.position += offset;

            if (TryGetRendererBounds(instance, out bounds))
            {
                Debug.Log("Imported player character normalized. Bounds size: " + bounds.size + ", center: " + bounds.center + ", scale: " + instance.localScale);
            }
        }

        private static void AssignImportedCharacterMaterial(Transform root, Material material)
        {
            if (material == null)
            {
                return;
            }

            foreach (var renderer in root.GetComponentsInChildren<Renderer>())
            {
                renderer.sharedMaterial = material;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
                renderer.receiveShadows = true;
            }
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

        private static GameObject BuildLesserEnemy(
            Transform parent,
            Dictionary<string, Material> materials,
            GameObject attackVfx,
            Transform target,
            string displayName,
            Vector3 position,
            int maxHealth,
            float speed,
            int damage)
        {
            var enemy = new GameObject(displayName);
            enemy.transform.SetParent(parent, false);
            enemy.transform.position = position;

            var controller = enemy.AddComponent<CharacterController>();
            controller.center = new Vector3(0f, 0.68f, 0f);
            controller.height = 1.32f;
            controller.radius = 0.36f;
            controller.skinWidth = 0.035f;
            controller.stepOffset = 0.22f;
            controller.slopeLimit = 52f;
            controller.minMoveDistance = 0f;

            var health = enemy.AddComponent<Health>();
            health.ConfigureMaxHealth(maxHealth);
            var enemyAttack = enemy.AddComponent<EnemyAttack>();
            enemyAttack.Configure(~0, attackVfx, materials["burst"]);
            var ai = enemy.AddComponent<EnemyController>();
            ai.SetTarget(target);
            ai.Configure(speed, 18f, 1.75f, 0.72f, damage);

            var visuals = NewGroup("Lesser Sakura Beast Visuals", enemy.transform);
            BuildImportedActorVisual(visuals.transform, LesserEnemyGlbPath, materials["lesserEnemy"], ImportedLesserEnemyTargetHeight);
            var animator = enemy.AddComponent<EnemyProceduralAnimator>();
            animator.Configure(visuals.transform);

            AddCompoundHurtboxes(enemy.transform, 1.35f, 0.38f);
            var marker = BuildSelectionMarker(enemy.transform, materials["target"], 1.55f, 0.52f);
            enemy.AddComponent<CombatTarget>().Configure(displayName, marker);
            enemy.AddComponent<EnemyHealthBar>().Configure(health, ImportedLesserEnemyTargetHeight + 0.55f, 1.15f, displayName, new Color(1f, 0.32f, 0.4f, 1f));
            return enemy;
        }

        private static GameObject BuildBoss(
            Transform parent,
            Dictionary<string, Material> materials,
            GameObject attackVfx,
            Transform target,
            Vector3 position)
        {
            var boss = new GameObject("緋櫻獸");
            boss.transform.SetParent(parent, false);
            boss.transform.position = position;

            var controller = boss.AddComponent<CharacterController>();
            controller.center = new Vector3(0f, 1.2f, 0f);
            controller.height = 2.35f;
            controller.radius = 0.86f;
            controller.skinWidth = 0.055f;
            controller.stepOffset = 0.3f;
            controller.slopeLimit = 48f;
            controller.minMoveDistance = 0f;

            var health = boss.AddComponent<Health>();
            health.ConfigureMaxHealth(980);
            var enemyAttack = boss.AddComponent<EnemyAttack>();
            enemyAttack.Configure(~0, attackVfx, materials["burst"]);
            var controllerScript = boss.AddComponent<BossController>();
            controllerScript.SetTarget(target);
            controllerScript.Configure(~0);

            var visuals = NewGroup("Crimson Sakura Beast Visuals", boss.transform);
            BuildImportedActorVisual(visuals.transform, BossEnemyGlbPath, materials["bossEnemy"], ImportedBossTargetHeight);
            var animator = boss.AddComponent<EnemyProceduralAnimator>();
            animator.Configure(visuals.transform);

            AddCompoundHurtboxes(boss.transform, 2.55f, 0.92f);
            var marker = BuildSelectionMarker(boss.transform, materials["target"], 3.25f, 1.15f);
            boss.AddComponent<CombatTarget>().Configure("緋櫻獸", marker);
            boss.AddComponent<EnemyHealthBar>().Configure(health, ImportedBossTargetHeight + 0.7f, 2.4f, "緋櫻獸", new Color(1f, 0.18f, 0.3f, 1f));
            return boss;
        }

        private static void BuildImportedActorVisual(Transform parent, string assetPath, Material material, float targetHeight)
        {
            var importedPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
            if (importedPrefab == null)
            {
                CreateCapsule("Fallback Beast Body", new Vector3(0f, targetHeight * 0.45f, 0f), new Vector3(0.8f, targetHeight * 0.45f, 0.8f), material, parent, true);
                return;
            }

            var instance = PrefabUtility.InstantiatePrefab(importedPrefab, parent) as GameObject;
            if (instance == null)
            {
                instance = UnityEngine.Object.Instantiate(importedPrefab, parent);
            }
            instance.name = Path.GetFileNameWithoutExtension(assetPath);
            instance.transform.localPosition = Vector3.zero;
            instance.transform.localRotation = Quaternion.identity;
            instance.transform.localScale = Vector3.one;

            foreach (var collider in instance.GetComponentsInChildren<Collider>(true))
            {
                UnityEngine.Object.DestroyImmediate(collider);
            }

            NormalizeActorVisual(parent, instance.transform, targetHeight);
            AssignImportedCharacterMaterial(instance.transform, material);
        }

        private static void NormalizeActorVisual(Transform parent, Transform instance, float targetHeight)
        {
            if (!TryGetRendererBounds(instance, out var bounds) || bounds.size.y <= 0.01f)
            {
                return;
            }

            instance.localScale *= targetHeight / bounds.size.y;
            if (!TryGetRendererBounds(instance, out bounds))
            {
                return;
            }

            var targetBase = parent.position;
            instance.position += new Vector3(
                targetBase.x - bounds.center.x,
                targetBase.y - bounds.min.y,
                targetBase.z - bounds.center.z);
        }

        private static void AddCompoundHurtboxes(Transform root, float height, float radius)
        {
            AddHurtbox(root, "Lower Hurtbox", new Vector3(0f, height * 0.26f, 0f), radius * 1.02f, height * 0.48f);
            AddHurtbox(root, "Core Hurtbox", new Vector3(0f, height * 0.58f, 0f), radius, height * 0.52f);
            AddHurtbox(root, "Upper Hurtbox", new Vector3(0f, height * 0.84f, 0f), radius * 0.82f, height * 0.34f);
        }

        private static void AddHurtbox(Transform root, string name, Vector3 center, float radius, float height)
        {
            var hurtbox = new GameObject(name);
            hurtbox.transform.SetParent(root, false);
            hurtbox.transform.localPosition = center;
            var collider = hurtbox.AddComponent<CapsuleCollider>();
            collider.radius = Mathf.Max(0.05f, radius);
            collider.height = Mathf.Max(collider.radius * 2f, height);
            collider.isTrigger = true;
            hurtbox.AddComponent<CombatHurtbox>();
        }

        private static GameObject BuildSelectionMarker(Transform parent, Material material, float height, float radius)
        {
            var marker = CreateCylinder(
                "Target Selection Marker",
                new Vector3(0f, height, 0f),
                new Vector3(radius, 0.025f, radius),
                material,
                parent,
                Quaternion.identity);
            var collider = marker.GetComponent<Collider>();
            if (collider != null)
            {
                UnityEngine.Object.DestroyImmediate(collider);
            }
            marker.SetActive(false);
            return marker;
        }

        private sealed class CombatVfxSet
        {
            public GameObject hit;
            public GameObject projectile;
            public GameObject area;
            public GameObject dash;
            public GameObject ultimate;
            public GameObject enemy;
            public GameObject boss;
        }

        private static CombatVfxSet BuildCompatibleCombatVfx(Material particleMaterial)
        {
            return new CombatVfxSet
            {
                hit = SaveCompatibleVfxPrefab(FlowerExplosionPrefabPath, "VFX_SakuraBasicHit", particleMaterial, new Color(1f, 0.55f, 0.78f, 1f), 0.75f),
                projectile = SaveCompatibleVfxPrefab(FlowerParticlesPrefabPath, "VFX_SakuraProjectile", particleMaterial, new Color(0.55f, 0.92f, 1f, 1f), 0.55f),
                area = SaveCompatibleVfxPrefab(FlowerExplosionPrefabPath, "VFX_SakuraArea", particleMaterial, new Color(1f, 0.42f, 0.72f, 1f), 1.35f),
                dash = SaveCompatibleVfxPrefab(FlowerParticlesPrefabPath, "VFX_SakuraDash", particleMaterial, new Color(0.62f, 0.86f, 1f, 1f), 1.1f),
                ultimate = SaveCompatibleVfxPrefab(FlowerExplosionPrefabPath, "VFX_SakuraUltimate", particleMaterial, new Color(1f, 0.32f, 0.64f, 1f), 2.25f),
                enemy = SaveCompatibleVfxPrefab(FlowerExplosionPrefabPath, "VFX_EnemyAttack", particleMaterial, new Color(0.82f, 0.2f, 0.5f, 1f), 1.05f),
                boss = SaveCompatibleVfxPrefab(FlowerExplosionPrefabPath, "VFX_BossAttack", particleMaterial, new Color(1f, 0.12f, 0.38f, 1f), 1.8f)
            };
        }

        private static GameObject SaveCompatibleVfxPrefab(
            string sourcePath,
            string outputName,
            Material material,
            Color color,
            float scale)
        {
            var source = AssetDatabase.LoadAssetAtPath<GameObject>(sourcePath);
            if (source == null)
            {
                return null;
            }

            var instance = PrefabUtility.InstantiatePrefab(source) as GameObject;
            if (instance == null)
            {
                instance = UnityEngine.Object.Instantiate(source);
            }
            instance.name = outputName;
            instance.transform.localScale *= scale;
            foreach (var particleSystem in instance.GetComponentsInChildren<ParticleSystem>(true))
            {
                var main = particleSystem.main;
                main.startColor = new ParticleSystem.MinMaxGradient(color);
                var renderer = particleSystem.GetComponent<ParticleSystemRenderer>();
                if (renderer != null)
                {
                    renderer.sharedMaterial = material;
                    renderer.trailMaterial = material;
                }
            }

            var outputPath = "Assets/FusionRPG/Prefabs/" + outputName + ".prefab";
            var prefab = PrefabUtility.SaveAsPrefabAsset(instance, outputPath);
            UnityEngine.Object.DestroyImmediate(instance);
            return prefab;
        }

        private static Camera BuildCamera(Transform target)
        {
            var cameraObject = new GameObject("Third Person Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = new Vector3(-11f, 3.3f, 20.3f);
            cameraObject.transform.rotation = Quaternion.Euler(25f, 180f, 0f);
            var camera = cameraObject.AddComponent<Camera>();
            camera.fieldOfView = 50f;
            camera.nearClipPlane = 0.08f;
            camera.farClipPlane = 180f;
            var orbit = cameraObject.AddComponent<ThirdPersonCamera>();
            orbit.SetTarget(target);
            orbit.ConfigureForPrototype(new Vector3(0f, 0.82f, 0f), 5.8f, 25f);
            return camera;
        }

        private static GameHud BuildHud(
            Health playerHealth,
            PlayerCombat playerCombat,
            TargetSelectionController targetSelection,
            Health bossHealth)
        {
            var canvasObject = new GameObject("Fusion RPG HUD");
            var canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasObject.AddComponent<GraphicRaycaster>();
            if (UnityEngine.Object.FindFirstObjectByType<EventSystem>() == null)
            {
                var eventSystem = new GameObject("Event System");
                eventSystem.AddComponent<EventSystem>();
                eventSystem.AddComponent<StandaloneInputModule>();
            }

            var font = Font.CreateDynamicFontFromOSFont(
                new[] { "Microsoft JhengHei UI", "Microsoft JhengHei", "Arial Unicode MS", "Arial" },
                20);
            CreateHudText(canvasObject.transform, "玩家生命標籤", "櫻庭 さくら", font, new Vector2(24f, -18f), 17, TextAnchor.UpperLeft);
            var playerFill = CreateHudBar(canvasObject.transform, "玩家生命", new Vector2(24f, -44f), new Color(0.05f, 0.07f, 0.14f, 0.9f), SakuraPink);
            var manaFill = CreateHudBar(canvasObject.transform, "玩家法力", new Vector2(24f, -66f), new Color(0.05f, 0.07f, 0.14f, 0.9f), new Color(0.32f, 0.62f, 1f, 1f));

            var selectedFill = CreateHudBar(canvasObject.transform, "鎖定目標", new Vector2(24f, -96f), new Color(0.05f, 0.07f, 0.14f, 0.86f), IceBlue);
            var selectedPanel = selectedFill.transform.parent.gameObject;
            var targetText = CreateHudText(selectedPanel.transform, "目標名稱", string.Empty, font, new Vector2(4f, 24f), 14, TextAnchor.LowerLeft);
            targetText.rectTransform.sizeDelta = new Vector2(260f, 22f);

            var objective = CreateHudText(canvasObject.transform, "戰鬥目標", "第一波：擊敗緋櫻幼獸", font, new Vector2(24f, -136f), 18, TextAnchor.UpperLeft);
            var controls = CreateHudText(canvasObject.transform, "操作提示", "方向鍵 移動　A 攻擊　Space 跳躍　Shift 衝刺　滑鼠拖曳視角", font, Vector2.zero, 14, TextAnchor.LowerLeft);
            controls.rectTransform.anchorMin = Vector2.zero;
            controls.rectTransform.anchorMax = Vector2.zero;
            controls.rectTransform.pivot = Vector2.zero;
            controls.rectTransform.anchoredPosition = new Vector2(24f, 20f);
            controls.rectTransform.sizeDelta = new Vector2(680f, 28f);

            var quickFill = CreateSkillGauge(canvasObject.transform, "W 小技能", "W", font, new Vector2(-250f, 24f), IceBlue);
            var areaFill = CreateSkillGauge(canvasObject.transform, "Q 範圍技能", "Q", font, new Vector2(-180f, 24f), SakuraPink);
            var dashFill = CreateSkillGauge(canvasObject.transform, "E 突進", "E", font, new Vector2(-110f, 24f), Gold);
            var ultimateFill = CreateSkillGauge(canvasObject.transform, "R 大招", "R", font, new Vector2(-40f, 24f), new Color(0.84f, 0.38f, 1f, 1f));

            var bossFill = CreateHudBar(canvasObject.transform, "Boss 生命", Vector2.zero, new Color(0.05f, 0.07f, 0.14f, 0.9f), new Color(0.9f, 0.16f, 0.38f, 1f));
            var bossPanel = bossFill.transform.parent.gameObject;
            var bossRect = bossPanel.GetComponent<RectTransform>();
            bossRect.anchorMin = new Vector2(0.5f, 1f);
            bossRect.anchorMax = new Vector2(0.5f, 1f);
            bossRect.pivot = new Vector2(0.5f, 1f);
            bossRect.anchoredPosition = new Vector2(0f, -26f);
            bossRect.sizeDelta = new Vector2(520f, 22f);
            var bossText = CreateHudText(bossPanel.transform, "Boss 名稱", "緋櫻獸　初綻形態", font, new Vector2(0f, 28f), 18, TextAnchor.UpperCenter);
            bossText.rectTransform.anchorMin = new Vector2(0f, 0f);
            bossText.rectTransform.anchorMax = new Vector2(1f, 0f);
            bossText.rectTransform.pivot = new Vector2(0.5f, 0f);
            bossText.rectTransform.sizeDelta = new Vector2(0f, 28f);

            var complete = CreateHudText(canvasObject.transform, "Completion", string.Empty, font, new Vector2(0f, -44f), 36, TextAnchor.UpperCenter);
            StretchTop(complete.rectTransform);
            complete.gameObject.SetActive(false);

            var hud = canvasObject.AddComponent<GameHud>();
            hud.ConfigureCombatHud(
                playerFill,
                manaFill,
                selectedFill,
                bossFill,
                quickFill,
                areaFill,
                dashFill,
                ultimateFill,
                objective,
                targetText,
                bossText,
                complete,
                selectedPanel,
                bossPanel);
            hud.Bind(playerHealth, playerCombat, targetSelection, bossHealth);
            return hud;
        }

        private static Image CreateSkillGauge(
            Transform parent,
            string name,
            string keyLabel,
            Font font,
            Vector2 anchoredPosition,
            Color fillColor)
        {
            var background = new GameObject(name);
            background.transform.SetParent(parent, false);
            var rect = background.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(1f, 0f);
            rect.anchorMax = new Vector2(1f, 0f);
            rect.pivot = new Vector2(1f, 0f);
            rect.anchoredPosition = anchoredPosition;
            rect.sizeDelta = new Vector2(58f, 58f);
            var image = background.AddComponent<Image>();
            image.color = new Color(0.04f, 0.06f, 0.12f, 0.9f);

            var fillObject = new GameObject("Cooldown Fill");
            fillObject.transform.SetParent(background.transform, false);
            var fillRect = fillObject.AddComponent<RectTransform>();
            fillRect.anchorMin = new Vector2(0.08f, 0.08f);
            fillRect.anchorMax = new Vector2(0.92f, 0.92f);
            fillRect.offsetMin = Vector2.zero;
            fillRect.offsetMax = Vector2.zero;
            var fill = fillObject.AddComponent<Image>();
            fill.color = fillColor;
            fill.type = Image.Type.Filled;
            fill.fillMethod = Image.FillMethod.Radial360;
            fill.fillOrigin = 2;
            fill.fillClockwise = true;
            fill.fillAmount = 1f;

            var label = CreateHudText(background.transform, "按鍵", keyLabel, font, Vector2.zero, 24, TextAnchor.MiddleCenter);
            label.rectTransform.anchorMin = Vector2.zero;
            label.rectTransform.anchorMax = Vector2.one;
            label.rectTransform.pivot = new Vector2(0.5f, 0.5f);
            label.rectTransform.anchoredPosition = Vector2.zero;
            label.rectTransform.sizeDelta = Vector2.zero;
            label.color = Color.white;
            return fill;
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

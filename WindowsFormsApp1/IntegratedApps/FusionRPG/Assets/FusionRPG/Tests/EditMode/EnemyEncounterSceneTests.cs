using System.Linq;
using FusionRPG;
using NUnit.Framework;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public sealed class EnemyEncounterSceneTests
{
    private const string ScenePath = "Assets/FusionRPG/Scenes/SakuraAcademyPrototype.unity";
    private const string LesserAssetPath = "Assets/FusionRPG/Art/Models/lesser_sakura_beast.glb";
    private const string BossAssetPath = "Assets/FusionRPG/Art/Models/crimson_sakura_beast_boss.glb";

    [Test]
    public void SuppliedEnemyGlbsImportAsGameObjects()
    {
        Assert.NotNull(AssetDatabase.LoadAssetAtPath<GameObject>(LesserAssetPath));
        Assert.NotNull(AssetDatabase.LoadAssetAtPath<GameObject>(BossAssetPath));
    }

    [Test]
    public void EncounterSceneUsesCompoundPrimitiveHurtboxesForMovingEnemies()
    {
        EditorSceneManager.OpenScene(ScenePath);
        var enemies = Object.FindObjectsByType<EnemyController>(FindObjectsInactive.Include, FindObjectsSortMode.None);

        Assert.GreaterOrEqual(enemies.Length, 5, "The two waves should contain at least five lesser enemies.");
        foreach (var enemy in enemies)
        {
            Assert.NotNull(enemy.GetComponent<CharacterController>(), enemy.name + " needs world collision.");
            Assert.GreaterOrEqual(enemy.GetComponentsInChildren<CombatHurtbox>(true).Length, 3, enemy.name + " needs compound hurtboxes.");
            Assert.IsFalse(
                enemy.GetComponentsInChildren<MeshCollider>(true).Any(collider => !collider.convex),
                enemy.name + " must not move a non-convex high-density MeshCollider.");
        }
    }

    [Test]
    public void BossHasThreePhaseControllerAndDurableHealthPool()
    {
        EditorSceneManager.OpenScene(ScenePath);
        var boss = Object.FindFirstObjectByType<BossController>(FindObjectsInactive.Include);

        Assert.NotNull(boss, "The encounter scene should contain the Crimson Sakura Beast boss.");
        Assert.GreaterOrEqual(boss.GetComponent<Health>().Max, 800, "The boss should not be weaker than regular enemies.");
        Assert.GreaterOrEqual(boss.AttackPatternCount, 3, "The boss needs multiple attack patterns.");
        Assert.AreEqual(BossPhase.PhaseOne, boss.CurrentPhase);
    }

    [Test]
    public void EveryCombatActorStartsOnImportedCourtyardGeometry()
    {
        EditorSceneManager.OpenScene(ScenePath);
        Physics.SyncTransforms();
        var actors = Object.FindObjectsByType<Health>(FindObjectsInactive.Include, FindObjectsSortMode.None)
            .Where(health =>
                health.GetComponent<PlayerController>() != null ||
                health.GetComponent<EnemyController>() != null ||
                health.GetComponent<BossController>() != null)
            .ToArray();

        Assert.GreaterOrEqual(actors.Length, 7);
        foreach (var actor in actors)
        {
            var hit = Physics.RaycastAll(actor.transform.position + Vector3.up * 4f, Vector3.down, 10f)
                .Where(candidate =>
                    candidate.collider != null &&
                    !candidate.collider.isTrigger &&
                    !candidate.collider.transform.IsChildOf(actor.transform))
                .OrderBy(candidate => candidate.distance)
                .FirstOrDefault();

            Assert.NotNull(hit.collider, actor.name + " has no ground below its spawn.");
            Assert.IsInstanceOf<MeshCollider>(hit.collider, actor.name + " should spawn on the precise imported courtyard collider.");
        }
    }
}

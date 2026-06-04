using System.Linq;
using NUnit.Framework;
using UnityEditor.SceneManagement;
using UnityEngine;

public sealed class ImportedCourtyardCollisionTests
{
    private const string ScenePath = "Assets/FusionRPG/Scenes/SakuraAcademyPrototype.unity";

    [SetUp]
    public void OpenPrototypeScene()
    {
        EditorSceneManager.OpenScene(ScenePath);
        Physics.SyncTransforms();
    }

    [Test]
    public void ImportedCourtyardUsesMeshCollidersForEveryMeshFilter()
    {
        var imported = GameObject.Find("Traditional Temple Courtyard GLB");
        Assert.NotNull(imported, "The prototype scene should use the imported courtyard GLB.");
        Assert.IsNull(GameObject.Find("Imported Courtyard Gameplay Floor"), "The imported GLB scene should not rely on a simplified fallback floor.");

        var meshFilters = imported.GetComponentsInChildren<MeshFilter>()
            .Where(filter => filter.sharedMesh != null)
            .ToArray();
        Assert.Greater(meshFilters.Length, 0, "The imported courtyard should contain renderable mesh filters.");

        foreach (var meshFilter in meshFilters)
        {
            var collider = meshFilter.GetComponent<MeshCollider>();
            Assert.NotNull(collider, meshFilter.name + " is missing a precise MeshCollider.");
            Assert.AreSame(meshFilter.sharedMesh, collider.sharedMesh, meshFilter.name + " collider should use the same mesh as the visible GLB geometry.");
            Assert.IsFalse(collider.convex, meshFilter.name + " should use a non-convex static MeshCollider for precise walls and floors.");
            Assert.IsFalse(
                collider.cookingOptions.HasFlag(MeshColliderCookingOptions.UseFastMidphase),
                meshFilter.name + " should disable Fast Midphase because this high-density GLB can otherwise miss wall collisions.");
        }
    }

    [Test]
    public void PlayerStartsOnImportedMeshCollisionInsteadOfFallbackPlane()
    {
        var player = GameObject.Find("Sakuraba Sakura");
        Assert.NotNull(player, "The prototype scene should contain the player.");

        var origin = player.transform.position + Vector3.up * 3f;
        var hit = Physics.RaycastAll(origin, Vector3.down, 8f)
            .Where(candidate => candidate.collider != null && !candidate.collider.transform.IsChildOf(player.transform))
            .OrderBy(candidate => candidate.distance)
            .FirstOrDefault();

        Assert.NotNull(hit.collider, "A raycast under the player should hit the imported courtyard floor.");
        Assert.IsInstanceOf<MeshCollider>(hit.collider, "The player's floor should be the imported courtyard mesh, not a simplified box plane.");
        Assert.AreNotEqual("Imported Courtyard Gameplay Floor", hit.collider.gameObject.name, "The fallback gameplay floor should not be the active ground collision.");
    }

    [Test]
    public void PlayerVisualsHaveRuntimeWalkAnimationDriver()
    {
        var player = GameObject.Find("Sakuraba Sakura");
        Assert.NotNull(player, "The prototype scene should contain the player.");

        var hasWalkDriver = player.GetComponentsInChildren<MonoBehaviour>(true)
            .Any(component => component != null && component.GetType().Name == "PlayerModelAnimator");

        Assert.IsTrue(hasWalkDriver, "The imported GLB player should have a runtime walk animation driver so it does not slide rigidly.");
    }
}

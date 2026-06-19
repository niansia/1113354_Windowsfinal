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
    public void ImportedCourtyardUsesExactChunkedMeshColliders()
    {
        var imported = GameObject.Find("Traditional Temple Courtyard GLB");
        Assert.NotNull(imported, "The prototype scene should use the imported courtyard GLB.");
        Assert.IsNull(GameObject.Find("Imported Courtyard Gameplay Floor"), "The imported GLB scene should not rely on a simplified fallback floor.");

        var meshFilters = imported.GetComponentsInChildren<MeshFilter>()
            .Where(filter => filter.sharedMesh != null)
            .ToArray();
        Assert.Greater(meshFilters.Length, 0, "The imported courtyard should contain renderable mesh filters.");
        var sourceTriangleCount = meshFilters.Sum(filter => TriangleCount(filter.sharedMesh));
        var colliders = imported.GetComponentsInChildren<MeshCollider>();
        Assert.Greater(colliders.Length, 1, "The high-density courtyard collider should be split into exact static chunks.");
        var collisionTriangleCount = 0L;
        foreach (var collider in colliders)
        {
            Assert.NotNull(collider.sharedMesh, collider.name + " has no collision mesh.");
            Assert.IsFalse(collider.convex, collider.name + " should use a non-convex static MeshCollider for precise walls and floors.");
            Assert.IsFalse(
                collider.cookingOptions.HasFlag(MeshColliderCookingOptions.UseFastMidphase),
                collider.name + " should disable Fast Midphase because high-density GLBs can otherwise miss wall collisions.");
            var chunkTriangles = TriangleCount(collider.sharedMesh);
            Assert.LessOrEqual(chunkTriangles, 350000, collider.name + " is still too large for reliable PhysX midphase collision.");
            collisionTriangleCount += chunkTriangles;
        }
        Assert.AreEqual(sourceTriangleCount, collisionTriangleCount, "Chunking must preserve every visible courtyard triangle.");
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

    [Test]
    public void ThirdPersonCameraPullsInFrontOfBlockingGeometry()
    {
        var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        wall.transform.position = new Vector3(0f, 0f, -3f);
        wall.transform.localScale = new Vector3(4f, 4f, 0.5f);
        Physics.SyncTransforms();

        var resolvedDistance = FusionRPG.ThirdPersonCamera.ResolveObstructedDistance(
            Vector3.zero,
            Vector3.back,
            10f,
            0.28f,
            0.12f,
            null,
            ~0);

        Object.DestroyImmediate(wall);
        Assert.Less(resolvedDistance, 3f, "The camera must move in front of a wall instead of rendering from inside it.");
        Assert.Greater(resolvedDistance, 0.35f);
    }

    private static long TriangleCount(Mesh mesh)
    {
        long total = 0;
        for (var subMesh = 0; subMesh < mesh.subMeshCount; subMesh++)
        {
            if (mesh.GetTopology(subMesh) == MeshTopology.Triangles)
            {
                total += (long)mesh.GetIndexCount(subMesh) / 3;
            }
        }
        return total;
    }
}

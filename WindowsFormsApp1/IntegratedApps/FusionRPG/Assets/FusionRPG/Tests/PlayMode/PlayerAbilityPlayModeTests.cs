using System.Collections;
using FusionRPG;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.SceneManagement;

public sealed class PlayerAbilityPlayModeTests
{
    [UnityTest]
    public IEnumerator SweptProjectileHitsTargetBetweenFramesOnlyOnce()
    {
        var target = new GameObject("projectile target");
        target.transform.position = Vector3.zero;
        target.AddComponent<SphereCollider>().radius = 0.5f;
        var health = target.AddComponent<Health>();
        health.ConfigureMaxHealth(100);

        Physics.SyncTransforms();
        var hits = CombatProjectile.Sweep(
            new Vector3(-3f, 0f, 0f),
            new Vector3(3f, 0f, 0f),
            0.2f,
            25,
            ~0,
            null);

        Assert.AreEqual(1, hits);
        Assert.AreEqual(75, health.Current);

        Object.Destroy(target);
        yield return null;
    }

    [UnityTest]
    public IEnumerator EncounterStartsWithOnlyFirstWaveActive()
    {
        SceneManager.LoadScene("SakuraAcademyPrototype");
        yield return null;
        yield return null;

        var lesserEnemies = Object.FindObjectsByType<EnemyController>(FindObjectsInactive.Include, FindObjectsSortMode.None);
        var activeLesserEnemies = 0;
        foreach (var enemy in lesserEnemies)
        {
            if (enemy.gameObject.activeInHierarchy)
            {
                activeLesserEnemies++;
            }
        }

        var boss = Object.FindFirstObjectByType<BossController>(FindObjectsInactive.Include);
        Assert.AreEqual(2, activeLesserEnemies, "Only wave one should be active when the encounter starts.");
        Assert.NotNull(boss);
        Assert.IsFalse(boss.gameObject.activeInHierarchy);
    }
}

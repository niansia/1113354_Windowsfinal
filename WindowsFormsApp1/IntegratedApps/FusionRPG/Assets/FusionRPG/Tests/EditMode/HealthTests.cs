using NUnit.Framework;
using UnityEngine;
using FusionRPG;

public sealed class HealthTests
{
    [Test]
    public void DamageClampsAtZeroAndFiresDeathOnce()
    {
        var go = new GameObject("health");
        var health = go.AddComponent<Health>();
        health.SetMaxHealthForTests(100);
        var deaths = 0;
        health.Died += () => deaths++;

        health.ApplyDamage(35);
        Assert.AreEqual(65, health.Current);

        health.ApplyDamage(1000);
        health.ApplyDamage(10);

        Assert.AreEqual(0, health.Current);
        Assert.AreEqual(1, deaths);
        Object.DestroyImmediate(go);
    }

    [Test]
    public void HealDoesNotExceedMaxHealth()
    {
        var go = new GameObject("health");
        var health = go.AddComponent<Health>();
        health.SetMaxHealthForTests(80);

        health.ApplyDamage(50);
        health.Heal(100);

        Assert.AreEqual(80, health.Current);
        Object.DestroyImmediate(go);
    }

    [Test]
    public void IncomingDamageMultiplierReducesDamageDuringUltimate()
    {
        var go = new GameObject("health");
        var health = go.AddComponent<Health>();
        health.SetMaxHealthForTests(100);

        health.SetIncomingDamageMultiplier(0.4f);
        health.ApplyDamage(25);

        Assert.AreEqual(90, health.Current);
        Object.DestroyImmediate(go);
    }
}

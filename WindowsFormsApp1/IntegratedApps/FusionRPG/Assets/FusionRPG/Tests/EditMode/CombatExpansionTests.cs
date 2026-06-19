using FusionRPG;
using NUnit.Framework;
using UnityEngine;

public sealed class CombatExpansionTests
{
    [Test]
    public void UltimateGaugeFillsClampsAndConsumesOnlyWhenReady()
    {
        var gauge = new UltimateGauge(100);

        Assert.AreEqual(0, gauge.Current);
        Assert.IsFalse(gauge.TryConsume());

        gauge.Gain(35);
        gauge.Gain(90);

        Assert.AreEqual(100, gauge.Current);
        Assert.IsTrue(gauge.IsReady);
        Assert.IsTrue(gauge.TryConsume());
        Assert.AreEqual(0, gauge.Current);
    }

    [Test]
    public void BossPhaseChangesAtThresholdsAndNeverRegresses()
    {
        var phases = new BossPhaseState();

        Assert.AreEqual(BossPhase.PhaseOne, phases.Update(1f));
        Assert.AreEqual(BossPhase.PhaseTwo, phases.Update(0.65f));
        Assert.AreEqual(BossPhase.PhaseThree, phases.Update(0.3f));
        Assert.AreEqual(BossPhase.PhaseThree, phases.Update(0.9f));
    }

    [Test]
    public void EncounterUnlocksBossOnlyAfterBothWavesAreDefeated()
    {
        var encounter = new EncounterProgress(new[] { 2, 3 });

        encounter.Start();
        Assert.AreEqual(1, encounter.CurrentWaveNumber);
        Assert.AreEqual(2, encounter.RemainingEnemies);
        Assert.IsFalse(encounter.IsBossUnlocked);

        encounter.NotifyEnemyDefeated();
        encounter.NotifyEnemyDefeated();
        Assert.AreEqual(2, encounter.CurrentWaveNumber);
        Assert.AreEqual(3, encounter.RemainingEnemies);
        Assert.IsFalse(encounter.IsBossUnlocked);

        encounter.NotifyEnemyDefeated();
        encounter.NotifyEnemyDefeated();
        encounter.NotifyEnemyDefeated();
        Assert.IsTrue(encounter.IsBossUnlocked);
        Assert.AreEqual(0, encounter.RemainingEnemies);
    }

    [Test]
    public void SelectedTargetClearsAfterTargetDies()
    {
        var enemy = new GameObject("target");
        var health = enemy.AddComponent<Health>();
        health.ConfigureMaxHealth(20);
        var targeting = new CombatTargeting();

        targeting.SetTarget(health);
        Assert.AreSame(health, targeting.Selected);

        health.ApplyDamage(20);
        targeting.Refresh();

        Assert.IsNull(targeting.Selected);
        Object.DestroyImmediate(enemy);
    }
}

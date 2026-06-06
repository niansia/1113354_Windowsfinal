using FusionRPG;
using NUnit.Framework;
using UnityEngine;

public sealed class PlayerAbilityTests
{
    [Test]
    public void MovementUsesArrowKeysAndLeavesWasdForCombat()
    {
        Assert.IsTrue(CombatInputBindings.IsMovementKey(KeyCode.UpArrow));
        Assert.IsTrue(CombatInputBindings.IsMovementKey(KeyCode.LeftArrow));
        Assert.IsFalse(CombatInputBindings.IsMovementKey(KeyCode.W));
        Assert.IsFalse(CombatInputBindings.IsMovementKey(KeyCode.A));

        Assert.AreEqual(CombatAction.BasicAttack, CombatInputBindings.ActionFor(KeyCode.A));
        Assert.AreEqual(CombatAction.QuickSkill, CombatInputBindings.ActionFor(KeyCode.W));
        Assert.AreEqual(CombatAction.AreaSkill, CombatInputBindings.ActionFor(KeyCode.Q));
        Assert.AreEqual(CombatAction.DashSkill, CombatInputBindings.ActionFor(KeyCode.E));
        Assert.AreEqual(CombatAction.Ultimate, CombatInputBindings.ActionFor(KeyCode.R));
    }

    [Test]
    public void AbilityCooldownsAdvanceIndependently()
    {
        var cooldowns = new AbilityCooldownSet(2f, 5f, 7f);

        Assert.IsTrue(cooldowns.TryUse(CombatAction.QuickSkill));
        Assert.IsTrue(cooldowns.TryUse(CombatAction.AreaSkill));
        Assert.IsFalse(cooldowns.TryUse(CombatAction.QuickSkill));

        cooldowns.Tick(2.1f);

        Assert.IsTrue(cooldowns.TryUse(CombatAction.QuickSkill));
        Assert.IsFalse(cooldowns.TryUse(CombatAction.AreaSkill));
        Assert.IsTrue(cooldowns.TryUse(CombatAction.DashSkill));
    }

    [Test]
    public void AerialAttackTriggersOnceOnAirborneToGroundedTransition()
    {
        var aerial = new AerialAttackState();

        Assert.IsTrue(aerial.TryArm(false));
        Assert.IsFalse(aerial.TryConsumeLanding(false, false));
        Assert.IsTrue(aerial.TryConsumeLanding(false, true));
        Assert.IsFalse(aerial.TryConsumeLanding(true, true));
    }
}

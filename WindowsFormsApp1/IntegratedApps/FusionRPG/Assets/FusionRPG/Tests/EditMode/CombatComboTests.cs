using FusionRPG;
using NUnit.Framework;

public sealed class CombatComboTests
{
    [Test]
    public void NextHitCyclesThroughThreeHitDamageSequence()
    {
        var combo = new CombatCombo(new[] { 12, 18, 28 }, 0.7f);

        Assert.AreEqual(12, combo.NextHit(0f).Damage);
        Assert.AreEqual(18, combo.NextHit(0.25f).Damage);
        Assert.AreEqual(28, combo.NextHit(0.5f).Damage);
        Assert.AreEqual(12, combo.NextHit(0.75f).Damage);
    }

    [Test]
    public void ComboResetsWhenTimingWindowExpires()
    {
        var combo = new CombatCombo(new[] { 12, 18, 28 }, 0.7f);

        Assert.AreEqual(12, combo.NextHit(0f).Damage);
        Assert.AreEqual(18, combo.NextHit(0.3f).Damage);
        Assert.AreEqual(12, combo.NextHit(1.2f).Damage);
    }
}

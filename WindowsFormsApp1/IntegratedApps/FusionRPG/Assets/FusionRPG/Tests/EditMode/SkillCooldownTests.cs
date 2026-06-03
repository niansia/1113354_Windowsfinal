using FusionRPG;
using NUnit.Framework;

public sealed class SkillCooldownTests
{
    [Test]
    public void SkillStartsReadyAndConsumesCooldownWhenUsed()
    {
        var cooldown = new SkillCooldown(2.5f);

        Assert.IsTrue(cooldown.IsReady);
        Assert.IsTrue(cooldown.TryUse());
        Assert.IsFalse(cooldown.IsReady);
        Assert.AreEqual(1f, cooldown.NormalizedRemaining, 0.001f);
    }

    [Test]
    public void SkillBecomesReadyAfterCooldownTicksDown()
    {
        var cooldown = new SkillCooldown(2f);

        cooldown.TryUse();
        cooldown.Tick(0.5f);
        Assert.IsFalse(cooldown.IsReady);
        Assert.AreEqual(0.75f, cooldown.NormalizedRemaining, 0.001f);

        cooldown.Tick(1.5f);
        Assert.IsTrue(cooldown.IsReady);
        Assert.AreEqual(0f, cooldown.NormalizedRemaining, 0.001f);
    }
}

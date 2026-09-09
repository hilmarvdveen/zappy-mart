using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class PromotionCodeTests
{
    [Fact]
    public void AWorkingCodeAnswersItsRule()
    {
        var outcome = new PromotionCodeBuilder().TakingPercent(10).Build().RuleFor(Money.Euro(1000), Moments.Now);

        Assert.True(outcome.Succeeded);
        Assert.Equal(PromotionKind.Percentage, outcome.Value!.Kind);
    }

    [Fact]
    public void ACodeOutsideItsWindowIsExpired()
    {
        var outcome = new PromotionCodeBuilder().ThatClosed().Build().RuleFor(Money.Euro(1000), Moments.Now);

        Assert.Equal(UserErrorCode.CodeExpired, outcome.Errors.Single().Code);
        Assert.Equal("code", outcome.Errors.Single().Field);
    }

    [Fact]
    public void ACodeAtItsLimitIsExhausted()
    {
        var outcome = new PromotionCodeBuilder().UsedUp().Build().RuleFor(Money.Euro(1000), Moments.Now);

        Assert.Equal(UserErrorCode.CodeExhausted, outcome.Errors.Single().Code);
    }

    [Fact]
    public void ACodeBelowItsMinimumIsRefused()
    {
        var outcome = new PromotionCodeBuilder()
            .TakingCents(500)
            .AskingAtLeast(2500)
            .Build()
            .RuleFor(Money.Euro(2499), Moments.Now);

        Assert.Equal(UserErrorCode.CodeMinimumNotMet, outcome.Errors.Single().Code);
    }

    [Fact]
    public void ACodeIsNormalisedToUpperCase() =>
        Assert.Equal("WELCOME10", PromotionCode.Normalise("  welcome10 "));

    [Fact]
    public void ARecordedUseRaisesTheCount()
    {
        var code = new PromotionCodeBuilder().Build();

        code.RecordUse();

        Assert.Equal(1, code.TimesUsed);
    }
}

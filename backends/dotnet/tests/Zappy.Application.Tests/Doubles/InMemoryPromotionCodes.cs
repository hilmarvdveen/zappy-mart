using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryPromotionCodes(params PromotionCode[] codes) : IPromotionCodeRepository
{
    public IReadOnlyList<PromotionCode> Codes { get; } = codes;

    public Task<PromotionCode?> WithCode(string code, CancellationToken cancellationToken) =>
        Task.FromResult(Codes.SingleOrDefault(candidate => candidate.Code == code));
}

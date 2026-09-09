using Zappy.Domain;

namespace Zappy.Application;

public interface IPromotionCodeRepository
{
    Task<PromotionCode?> WithCode(string code, CancellationToken cancellationToken);
}

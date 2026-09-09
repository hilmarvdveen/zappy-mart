using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class PromotionCodeRepository(ZappyDbContext database) : IPromotionCodeRepository
{
    public async Task<PromotionCode?> WithCode(string code, CancellationToken cancellationToken) =>
        await database.PromotionCodes.SingleOrDefaultAsync(promotionCode => promotionCode.Code == code, cancellationToken);
}

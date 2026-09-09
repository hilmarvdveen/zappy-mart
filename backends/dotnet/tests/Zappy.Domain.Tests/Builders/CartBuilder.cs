using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class CartBuilder
{
    private readonly List<(Product Product, int Quantity)> lines = [];
    private PromotionCode? promotionCode;
    private string? customerId;

    public CartBuilder Holding(Product product, int quantity = 1)
    {
        lines.Add((product, quantity));
        return this;
    }

    public CartBuilder With(PromotionCode code)
    {
        promotionCode = code;
        return this;
    }

    public CartBuilder OwnedBy(string customer)
    {
        customerId = customer;
        return this;
    }

    public Cart Build()
    {
        var cart = new Cart("cart-01", customerId, Moments.Now);
        foreach (var line in lines)
        {
            cart.Add(line.Product, line.Quantity, Moments.Now);
        }

        if (promotionCode is not null)
        {
            cart.Apply(promotionCode, Moments.Now);
        }

        return cart;
    }
}

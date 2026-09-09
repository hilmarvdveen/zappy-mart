namespace Zappy.Domain;

public sealed class Cart
{
    private readonly List<CartLine> lines = [];

    private Cart()
    {
    }

    public Cart(string id, string? customerId, DateTimeOffset moment)
    {
        Id = id;
        CustomerId = customerId;
        UpdatedAt = moment;
    }

    public string Id { get; private set; } = null!;

    public string? CustomerId { get; private set; }

    public IReadOnlyList<CartLine> Lines => lines.OrderBy(line => line.AddedOrder).ToList();

    public string? AppliedPromotionCodeText { get; private set; }

    public PromotionCode? AppliedPromotionCode { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public bool IsEmpty => lines.Count == 0;

    public Money Subtotal => lines.Count == 0
        ? Money.Euro(0)
        : lines.Select(line => line.LineTotal).Aggregate(static (running, next) => running.Plus(next));

    public Totals Totals => Totals.For(Subtotal, AppliedPromotionCode?.Rule);

    public AppliedPromotion? Promotion => AppliedPromotionCode is null
        ? null
        : new AppliedPromotion(AppliedPromotionCode.Code, AppliedPromotionCode.Kind, Totals.Discount);

    public Result<Cart> Add(Product product, int quantity, DateTimeOffset moment)
    {
        if (quantity < 1)
        {
            return Result<Cart>.Refused(
                this,
                UserErrorCode.QuantityInvalid,
                "A quantity is a whole number of one or more.",
                "quantity");
        }

        var existing = lines.SingleOrDefault(line => line.ProductId == product.Id);
        var wanted = (existing?.Quantity ?? 0) + quantity;
        if (!product.HasStockFor(wanted))
        {
            return Result<Cart>.Refused(
                this,
                UserErrorCode.OutOfStock,
                $"{product.Name} has {product.Stock} in stock and {wanted} were asked for.",
                "quantity");
        }

        if (existing is null)
        {
            lines.Add(new CartLine(Identifier.New(), Id, product, quantity)
            {
                AddedOrder = lines.Count == 0 ? 1 : lines.Max(line => line.AddedOrder) + 1
            });
        }
        else
        {
            existing.ChangeQuantityTo(wanted);
        }

        UpdatedAt = moment;
        return Result<Cart>.Success(this);
    }

    public Result<Cart> ChangeLineQuantity(string lineId, int quantity, DateTimeOffset moment)
    {
        var line = lines.SingleOrDefault(candidate => candidate.Id == lineId);
        if (line is null)
        {
            return Result<Cart>.Refused(
                this,
                UserErrorCode.CartLineNotFound,
                "No line with that id is in this cart.",
                "lineId");
        }

        if (quantity < 1)
        {
            return Result<Cart>.Refused(
                this,
                UserErrorCode.QuantityInvalid,
                "A quantity is a whole number of one or more. Remove the line to take the product out.",
                "quantity");
        }

        if (!line.Product.HasStockFor(quantity))
        {
            return Result<Cart>.Refused(
                this,
                UserErrorCode.OutOfStock,
                $"{line.Product.Name} has {line.Product.Stock} in stock and {quantity} were asked for.",
                "quantity");
        }

        line.ChangeQuantityTo(quantity);
        UpdatedAt = moment;
        return Result<Cart>.Success(this);
    }

    public Result<Cart> RemoveLine(string lineId, DateTimeOffset moment)
    {
        var line = lines.SingleOrDefault(candidate => candidate.Id == lineId);
        if (line is null)
        {
            return Result<Cart>.Refused(
                this,
                UserErrorCode.CartLineNotFound,
                "No line with that id is in this cart.",
                "lineId");
        }

        lines.Remove(line);
        UpdatedAt = moment;
        return Result<Cart>.Success(this);
    }

    public Result<Cart> Apply(PromotionCode promotionCode, DateTimeOffset moment)
    {
        var rule = promotionCode.RuleFor(Subtotal, moment);
        if (!rule.Succeeded)
        {
            return Result<Cart>.Refused(this, rule.Errors);
        }

        AppliedPromotionCode = promotionCode;
        AppliedPromotionCodeText = promotionCode.Code;
        UpdatedAt = moment;
        return Result<Cart>.Success(this);
    }

    public Cart RemovePromotion(DateTimeOffset moment)
    {
        if (AppliedPromotionCode is not null)
        {
            AppliedPromotionCode = null;
            AppliedPromotionCodeText = null;
            UpdatedAt = moment;
        }

        return this;
    }

    public CartLine? LineFor(string productId) => lines.SingleOrDefault(line => line.ProductId == productId);

    public void BelongsTo(string customerId, DateTimeOffset moment)
    {
        CustomerId = customerId;
        UpdatedAt = moment;
    }

    public void TakeOver(Cart anonymousCart, DateTimeOffset moment)
    {
        foreach (var line in anonymousCart.Lines)
        {
            Add(line.Product, line.Quantity, moment);
        }

        if (AppliedPromotionCode is null && anonymousCart.AppliedPromotionCode is not null)
        {
            Apply(anonymousCart.AppliedPromotionCode, moment);
        }

        UpdatedAt = moment;
    }

    public void Empty(DateTimeOffset moment)
    {
        lines.Clear();
        AppliedPromotionCode = null;
        AppliedPromotionCodeText = null;
        UpdatedAt = moment;
    }
}

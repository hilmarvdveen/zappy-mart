namespace Zappy.Domain;

public sealed class Order
{
    private readonly List<OrderLine> lines = [];
    private readonly List<DomainEvent> raisedEvents = [];

    private Order()
    {
    }

    private Order(string id, string number, string customerId, Totals totals, string? promotionCode, DateTimeOffset placedAt)
    {
        Id = id;
        Number = number;
        CustomerId = customerId;
        Status = OrderStatus.Paid;
        Subtotal = totals.Subtotal;
        Discount = totals.Discount;
        Shipping = totals.Shipping;
        Total = totals.Total;
        PromotionCode = promotionCode;
        PlacedAt = placedAt;
    }

    public string Id { get; private set; } = null!;

    public string Number { get; private set; } = null!;

    public string CustomerId { get; private set; } = null!;

    public OrderStatus Status { get; private set; }

    public IReadOnlyList<OrderLine> Lines => lines.OrderBy(line => line.Position).ToList();

    public string? PromotionCode { get; private set; }

    public Money Subtotal { get; private set; } = null!;

    public Money Discount { get; private set; } = null!;

    public Money Shipping { get; private set; } = null!;

    public Money Total { get; private set; } = null!;

    public DateTimeOffset PlacedAt { get; private set; }

    public IReadOnlyList<DomainEvent> RaisedEvents => raisedEvents;

    public static Result<Order> Place(Cart cart, string customerId, DateTimeOffset moment)
    {
        if (cart.IsEmpty)
        {
            return Result<Order>.Failure(UserErrorCode.CartEmpty, "The cart has no lines, so there is nothing to order.");
        }

        var withoutStock = cart.Lines.FirstOrDefault(line => !line.Product.HasStockFor(line.Quantity));
        if (withoutStock is not null)
        {
            return Result<Order>.Failure(
                UserErrorCode.OutOfStock,
                $"{withoutStock.Product.Name} has {withoutStock.Product.Stock} in stock and {withoutStock.Quantity} were ordered.");
        }

        var identifier = Identifier.New();
        var order = new Order(
            identifier,
            NumberFor(identifier, moment),
            customerId,
            cart.Totals,
            cart.AppliedPromotionCode?.Code,
            moment);

        var position = 1;
        foreach (var line in cart.Lines)
        {
            line.Product.Reserve(line.Quantity);
            order.lines.Add(new OrderLine(
                Identifier.New(),
                order.Id,
                line.ProductId,
                line.Product.Name,
                line.Product.Price,
                line.Quantity,
                position));
            position += 1;
        }

        order.raisedEvents.Add(new OrderPlaced(order.Id, customerId, order.PromotionCode));
        cart.Empty(moment);
        return Result<Order>.Success(order);
    }

    public void ForgetRaisedEvents() => raisedEvents.Clear();

    private static string NumberFor(string identifier, DateTimeOffset moment) =>
        $"ZAPPY-{moment:yyyyMMdd}-{identifier[..6].ToUpperInvariant()}";
}

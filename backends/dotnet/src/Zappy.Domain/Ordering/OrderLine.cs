namespace Zappy.Domain;

public sealed class OrderLine
{
    private OrderLine()
    {
    }

    public OrderLine(string id, string orderId, string productId, string productName, Money unitPrice, int quantity, int position)
    {
        Id = id;
        OrderId = orderId;
        ProductId = productId;
        ProductName = productName;
        UnitPrice = unitPrice;
        Quantity = quantity;
        Position = position;
    }

    public string Id { get; private set; } = null!;

    public string OrderId { get; private set; } = null!;

    public string ProductId { get; private set; } = null!;

    public string ProductName { get; private set; } = null!;

    public Money UnitPrice { get; private set; } = null!;

    public int Quantity { get; private set; }

    public int Position { get; private set; }

    public Money LineTotal => UnitPrice.Times(Quantity);
}

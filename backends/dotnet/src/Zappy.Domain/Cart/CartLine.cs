namespace Zappy.Domain;

public sealed class CartLine
{
    private CartLine()
    {
    }

    public CartLine(string id, string cartId, Product product, int quantity)
    {
        Id = id;
        CartId = cartId;
        ProductId = product.Id;
        Product = product;
        Quantity = quantity;
    }

    public string Id { get; private set; } = null!;

    public string CartId { get; private set; } = null!;

    public string ProductId { get; private set; } = null!;

    public Product Product { get; private set; } = null!;

    public int Quantity { get; private set; }

    public int AddedOrder { get; internal set; }

    public Money LineTotal => Product.Price.Times(Quantity);

    internal void ChangeQuantityTo(int quantity) => Quantity = quantity;
}

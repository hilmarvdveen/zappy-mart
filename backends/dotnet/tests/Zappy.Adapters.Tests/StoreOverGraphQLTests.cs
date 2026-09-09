using System.Text.Json;

namespace Zappy.Adapters.Tests;

public sealed class StoreOverGraphQLTests(ZappyServer server) : IClassFixture<ZappyServer>
{
    [Fact]
    public async Task TheCatalogueAnswersTheSeedInItsOwnOrder()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(visitor, "{ products(first: 3) { totalCount edges { node { id } } } }");

        Assert.Equal(20, answer.Number("data", "products", "totalCount"));
        Assert.Equal("product-01", answer.Text("data", "products", "edges", "0", "node", "id"));
    }

    [Fact]
    public async Task TheStockFilterLeavesOutWhatIsGone()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(
            visitor,
            "{ products(filter: { inStockOnly: true }, first: 1) { totalCount } }");

        Assert.Equal(19, answer.Number("data", "products", "totalCount"));
    }

    [Fact]
    public async Task AnUnknownSlugAnswersNull()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(visitor, "{ product(slug: \"nothing-like-this\") { id } }");

        Assert.Equal(JsonValueKind.Null, answer.At("data", "product").ValueKind);
    }

    [Fact]
    public async Task AnEmptyCartPaysNothing()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(visitor, "{ cart { subtotal { amount } shipping { amount } total { amount } } }");

        Assert.Equal(0, answer.Number("data", "cart", "subtotal", "amount"));
        Assert.Equal(0, answer.Number("data", "cart", "shipping", "amount"));
        Assert.Equal(0, answer.Number("data", "cart", "total", "amount"));
    }

    [Fact]
    public async Task ACartUnderFiftyEuroPaysShipping()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(
            visitor,
            "mutation { addToCart(productId: \"product-18\", quantity: 2) { cart { subtotal { amount } shipping { amount } total { amount } } errors { code } } }");

        Assert.Equal(1970, answer.Number("data", "addToCart", "cart", "subtotal", "amount"));
        Assert.Equal(495, answer.Number("data", "addToCart", "cart", "shipping", "amount"));
        Assert.Equal(2465, answer.Number("data", "addToCart", "cart", "total", "amount"));
    }

    [Fact]
    public async Task AFreeShippingCodeShowsInTheShippingAndNotInTheDiscount()
    {
        var visitor = await AFreshVisitor();
        await server.Ask(visitor, "mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");

        var answer = await server.Ask(
            visitor,
            "mutation { applyPromotionCode(code: \"freeship\") { cart { promotion { code kind discount { amount } } shipping { amount } total { amount } } errors { code } } }");

        Assert.Equal("FREESHIP", answer.Text("data", "applyPromotionCode", "cart", "promotion", "code"));
        Assert.Equal("FREE_SHIPPING", answer.Text("data", "applyPromotionCode", "cart", "promotion", "kind"));
        Assert.Equal(0, answer.Number("data", "applyPromotionCode", "cart", "promotion", "discount", "amount"));
        Assert.Equal(0, answer.Number("data", "applyPromotionCode", "cart", "shipping", "amount"));
        Assert.Equal(1970, answer.Number("data", "applyPromotionCode", "cart", "total", "amount"));
    }

    [Fact]
    public async Task APercentageRoundsHalfUpAndPassesTheFreeShippingThreshold()
    {
        var visitor = await AFreshVisitor();
        await server.Ask(visitor, "mutation { addToCart(productId: \"product-03\") { errors { code } } }");

        var answer = await server.Ask(
            visitor,
            "mutation { applyPromotionCode(code: \"WELCOME10\") { cart { subtotal { amount } shipping { amount } total { amount } promotion { discount { amount } } } } }");

        Assert.Equal(5599, answer.Number("data", "applyPromotionCode", "cart", "subtotal", "amount"));
        Assert.Equal(560, answer.Number("data", "applyPromotionCode", "cart", "promotion", "discount", "amount"));
        Assert.Equal(0, answer.Number("data", "applyPromotionCode", "cart", "shipping", "amount"));
        Assert.Equal(5039, answer.Number("data", "applyPromotionCode", "cart", "total", "amount"));
    }

    [Fact]
    public async Task TheLastItemInStockIsRefusedTheSecondTime()
    {
        var visitor = await AFreshVisitor();
        await server.Ask(visitor, "mutation { addToCart(productId: \"product-12\") { errors { code } } }");

        var answer = await server.Ask(
            visitor,
            "mutation { addToCart(productId: \"product-12\") { availableStock errors { code field } } }");

        Assert.Equal("OUT_OF_STOCK", answer.FirstErrorCode("data", "addToCart", "errors"));
        Assert.Equal(1, answer.Number("data", "addToCart", "availableStock"));
    }

    [Fact]
    public async Task AnExpiredCodeIsRefusedAndTheCartKeepsWhatItHad()
    {
        var visitor = await AFreshVisitor();
        await server.Ask(visitor, "mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");

        var answer = await server.Ask(
            visitor,
            "mutation { applyPromotionCode(code: \"SUMMER2025\") { cart { lines { quantity } } errors { code message field } } }");

        Assert.Equal("CODE_EXPIRED", answer.FirstErrorCode("data", "applyPromotionCode", "errors"));
        Assert.Equal(2, answer.Number("data", "applyPromotionCode", "cart", "lines", "0", "quantity"));
    }

    private async Task<HttpClient> AFreshVisitor()
    {
        var visitor = server.AVisitor();
        await server.Ask(visitor, "mutation { resetSeed { success loadedProducts } }");
        return visitor;
    }
}

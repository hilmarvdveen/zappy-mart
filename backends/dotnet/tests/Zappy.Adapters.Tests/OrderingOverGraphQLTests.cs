using System.Text.Json;

namespace Zappy.Adapters.Tests;

public sealed class OrderingOverGraphQLTests(ZappyServer server) : IClassFixture<ZappyServer>
{
    [Fact]
    public async Task PlacingAnOrderNeedsASignedInCustomer()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(visitor, "mutation { placeOrder { order { id } errors { code } } }");

        Assert.Equal("NOT_AUTHENTICATED", answer.FirstErrorCode("data", "placeOrder", "errors"));
    }

    [Fact]
    public async Task AnOrderKeepsTheTotalsTheCartShowedAndEmptiesTheCart()
    {
        var visitor = await AFreshVisitor();
        var accessToken = await SignIn(visitor);
        await server.Ask(visitor, AddingTwoShirts, accessToken: accessToken);
        await server.Ask(visitor, ApplyingWelcome, accessToken: accessToken);

        var placed = await server.Ask(visitor, PlacingTheOrderInFull, accessToken: accessToken);
        var cartAfter = await server.Ask(visitor, "{ cart { lines { id } total { amount } } }", accessToken: accessToken);

        Assert.Equal("PAID", placed.Text("data", "placeOrder", "order", "status"));
        Assert.Equal("WELCOME10", placed.Text("data", "placeOrder", "order", "promotionCode"));
        Assert.Equal(1970, placed.Number("data", "placeOrder", "order", "subtotal", "amount"));
        Assert.Equal(197, placed.Number("data", "placeOrder", "order", "discount", "amount"));
        Assert.Equal(495, placed.Number("data", "placeOrder", "order", "shipping", "amount"));
        Assert.Equal(2268, placed.Number("data", "placeOrder", "order", "total", "amount"));
        Assert.Equal(985, placed.Number("data", "placeOrder", "order", "lines", "0", "unitPrice", "amount"));
        Assert.Empty(cartAfter.At("data", "cart", "lines").EnumerateArray());
    }

    [Fact]
    public async Task PlacingTheSameCheckoutTwiceAnswersAnEmptyCart()
    {
        var visitor = await AFreshVisitor();
        var accessToken = await SignIn(visitor);
        await server.Ask(visitor, AddingTwoShirts, accessToken: accessToken);
        await server.Ask(visitor, PlacingTheOrder, accessToken: accessToken);

        var second = await server.Ask(visitor, PlacingTheOrder, accessToken: accessToken);

        Assert.Equal("CART_EMPTY", second.FirstErrorCode("data", "placeOrder", "errors"));
    }

    [Fact]
    public async Task AnOrderReservesTheStock()
    {
        var visitor = await AFreshVisitor();
        var accessToken = await SignIn(visitor);
        await server.Ask(visitor, AddingThreeJackets, accessToken: accessToken);
        await server.Ask(visitor, PlacingTheOrder, accessToken: accessToken);

        var answer = await server.Ask(visitor, "{ product(slug: \"mens-cotton-jacket\") { stock } }");

        Assert.Equal(5, answer.Number("data", "product", "stock"));
    }

    [Fact]
    public async Task TheOrderHistoryIsTheCustomersOwn()
    {
        var visitor = await AFreshVisitor();
        var accessToken = await SignIn(visitor);
        await server.Ask(visitor, AddingTwoShirts, accessToken: accessToken);
        var placed = await server.Ask(visitor, PlacingTheOrder, accessToken: accessToken);
        var orderId = placed.Text("data", "placeOrder", "order", "id");

        var history = await server.Ask(visitor, ReadingTheHistory, accessToken: accessToken);
        var one = await server.Ask(visitor, ReadingOneOrder, new { id = orderId }, accessToken: accessToken);
        var toAStranger = await server.Ask(visitor, ReadingOneOrder, new { id = orderId });

        Assert.Equal(1, history.Number("data", "orders", "totalCount"));
        Assert.Equal(orderId, history.Text("data", "orders", "edges", "0", "node", "id"));
        Assert.False(history.At("data", "orders", "pageInfo", "hasNextPage").GetBoolean());
        Assert.Equal(placed.Text("data", "placeOrder", "order", "number"), one.Text("data", "order", "number"));
        Assert.Equal(JsonValueKind.Null, toAStranger.At("data", "order").ValueKind);
    }

    private const string AddingTwoShirts =
        "mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }";

    private const string AddingThreeJackets =
        "mutation { addToCart(productId: \"product-03\", quantity: 3) { errors { code } } }";

    private const string ApplyingWelcome =
        "mutation { applyPromotionCode(code: \"WELCOME10\") { errors { code } } }";

    private const string PlacingTheOrder =
        "mutation { placeOrder(idempotencyKey: \"checkout-1\") { order { id number } errors { code } } }";

    private const string PlacingTheOrderInFull =
        "mutation { placeOrder(idempotencyKey: \"checkout-1\") { order { number status promotionCode "
        + "subtotal { amount } discount { amount } shipping { amount } total { amount } "
        + "lines { productName quantity unitPrice { amount } lineTotal { amount } } } errors { code } } }";

    private const string ReadingTheHistory =
        "{ orders(first: 5) { totalCount edges { cursor node { id number } } pageInfo { hasNextPage endCursor } } }";

    private const string ReadingOneOrder = "query ($id: ID!) { order(id: $id) { number } }";

    private const string TheLogin =
        "mutation { login(input: { email: \"jane@example.com\", password: \"correct horse battery staple\" }) "
        + "{ accessToken errors { code } } }";

    private async Task<string> SignIn(HttpClient visitor) =>
        (await server.Ask(visitor, TheLogin)).Text("data", "login", "accessToken");

    private async Task<HttpClient> AFreshVisitor()
    {
        var visitor = server.AVisitor();
        await server.Ask(visitor, "mutation { resetSeed { success } }");
        return visitor;
    }
}

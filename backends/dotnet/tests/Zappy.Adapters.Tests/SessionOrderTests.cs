using Microsoft.EntityFrameworkCore;
using Zappy.Adapters.Persistence;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Tests;

public sealed class SessionOrderTests : IDisposable
{
    private static readonly DateTimeOffset Moment = new(2026, 9, 9, 12, 0, 0, TimeSpan.Zero);

    private readonly ASqliteStore store = new();

    [Fact]
    public async Task TwoSessionsOpenedOnTheSameClockReadingListTheNewestFirst()
    {
        var customer = await ACustomer();
        var sessions = new SessionRepository(store.Database);
        var startSession = new StartSession(sessions, store.TokenIssuer, new FrozenClock(Moment));

        var laptop = await startSession.Execute(customer, "Old laptop", TestContext.Current.CancellationToken);
        await store.Database.SaveChangesAsync(TestContext.Current.CancellationToken);
        var phone = await startSession.Execute(customer, "New phone", TestContext.Current.CancellationToken);
        await store.Database.SaveChangesAsync(TestContext.Current.CancellationToken);

        var open = await sessions.OpenOfCustomer(customer.Id, Moment, TestContext.Current.CancellationToken);

        Assert.Equal(phone.SessionId, open[0].Id);
        Assert.Equal(laptop.SessionId, open[1].Id);
        Assert.Equal(open[0].CreatedAt, open[1].CreatedAt);
        Assert.True(open[0].CreationOrder > open[1].CreationOrder);
    }

    [Fact]
    public async Task AMomentKeepsItsFullPrecisionInTheStore()
    {
        var customer = await ACustomer();
        var preciseMoment = new DateTimeOffset(2026, 9, 9, 12, 0, 0, TimeSpan.Zero).AddTicks(1234567);
        var sessions = new SessionRepository(store.Database);
        var startSession = new StartSession(sessions, store.TokenIssuer, new FrozenClock(preciseMoment));

        await startSession.Execute(customer, "Chrome on Windows", TestContext.Current.CancellationToken);
        await store.Database.SaveChangesAsync(TestContext.Current.CancellationToken);
        store.Database.ChangeTracker.Clear();

        var stored = await store.Database.Sessions.SingleAsync(TestContext.Current.CancellationToken);

        Assert.Equal(preciseMoment, stored.CreatedAt);
    }

    public void Dispose() => store.Dispose();

    private async Task<Customer> ACustomer()
    {
        var customer = new Customer(
            "customer-01",
            EmailAddress.Create("jane@example.com")!,
            "Jane Doe",
            "a hash nobody reads here",
            Moment);

        store.Database.Customers.Add(customer);
        await store.Database.SaveChangesAsync(TestContext.Current.CancellationToken);
        return customer;
    }
}

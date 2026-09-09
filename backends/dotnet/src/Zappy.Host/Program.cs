using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Zappy.Adapters.GraphQL;
using Zappy.Adapters.Mail;
using Zappy.Adapters.Persistence;
using Zappy.Adapters.Security;
using Zappy.Host;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddZappyPersistence(builder.Configuration);
builder.Services.AddZappySecurity(builder.Configuration);
builder.Services.AddZappyMail();
builder.Services.AddZappyUseCases();
builder.Services.AddZappyGraphQL(builder.Configuration);

builder.Services.ConfigureOptions<BearerTokenSetup>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddAuthorization();

var application = builder.Build();

await application.PrepareTheStore();

application.UseAuthentication();
application.UseAuthorization();
application.UseMiddleware<OriginCheck>();

application.MapGraphQL(application.Services.GetRequiredService<GraphQLSettings>().Path);

application.MapGet("/health/live", () => Results.Ok(new { status = "live" }));

application.MapGet("/health/ready", async (ZappyDbContext database, CancellationToken cancellationToken) =>
    await database.Database.CanConnectAsync(cancellationToken)
        ? Results.Ok(new { status = "ready" })
        : Results.StatusCode(StatusCodes.Status503ServiceUnavailable));

await application.RunAsync();

public partial class Program;

# The store in C# on .NET 10

Zappy Mart is one small web store built several times over, so that a reader can open a
working application for every stack the articles explain, read it end to end, and build
it themselves. This folder is the C# version: a hexagonal monolith with five modules,
serving `contract/schema.graphql` with Hot Chocolate, storing the store with Entity
Framework Core, and holding the token model of `docs/security.md`.

This README is the walk through. It starts at an empty folder and it ends at a running
store that answers every operation of the contract and passes the shared conformance
suite. Every file is here with its path and its complete content, so a reader can type
the whole thing from top to bottom and get the same store.

## What it does

The store sells the twenty products of `contract/seed/products.json`. A visitor browses
the catalogue, fills a cart, saves products to a wishlist, applies one of five promotion
codes, registers or logs in, and places an order. The rules behind all of that are
written out in `docs/domain.md`, and this backend is one implementation of them.

Three numbers carry most of the rules, and they are worth reading before the code:

| Rule | Where it lives |
|---|---|
| Shipping is 495 cents, and it is zero from a subtotal of 5000 cents, when a free shipping code applies, and on an empty cart | `src/Zappy.Domain/Ordering/Totals.cs` |
| `total = subtotal + shipping - discount`, for all three kinds of code | `src/Zappy.Domain/Ordering/Totals.cs` |
| A percentage discount is rounded half up to whole cents | `src/Zappy.Domain/Promotions/PercentageOffSubtotal.cs` |

## The versions it runs on

Every version below is pinned in `docs/versions.md` with the date it was verified and
the source it came from. The two rows this project added are the .NET runtime patch and
the Argon2id parameters, both read on 9 September 2026.

| Item | Version | Where it comes from |
|---|---|---|
| .NET SDK | 10.0.303 | `dotnet --info` on the machine this was built on |
| .NET runtime | 10.0.11 | `dotnet --list-runtimes`, both `Microsoft.NETCore.App` and `Microsoft.AspNetCore.App` |
| C# | 14 | the language version the .NET 10 SDK ships |
| `HotChocolate.AspNetCore` | 16.6.4 | NuGet, the latest stable of the 16.6 line |
| `Microsoft.EntityFrameworkCore` | 10.0.12 | NuGet |
| `Microsoft.EntityFrameworkCore.Sqlite` | 10.0.12 | NuGet, the default provider |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | 10.0.3 | NuGet, the PostgreSQL profile |
| `Microsoft.EntityFrameworkCore.Design` | 10.0.12 | NuGet, design time only |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 10.0.12 | NuGet |
| `Microsoft.IdentityModel.JsonWebTokens` | 8.22.0 | NuGet |
| `Konscious.Security.Cryptography.Argon2` | 1.3.1 | NuGet |
| `Microsoft.Extensions.*` | 10.0.12 | NuGet, caching, options, configuration binder, logging and dependency injection abstractions |
| `xunit.v3` | 4.0.0 | NuGet, released 15 August 2026 |
| `Microsoft.AspNetCore.Mvc.Testing` | 10.0.12 | NuGet, the in process test server |
| `dotnet-ef` | 10.0.12 | a local tool in `dotnet-tools.json`, so it matches the runtime packages |
| PostgreSQL | 18 | the `postgres:18` image in `compose.yaml` |

The Argon2id parameters come from the OWASP Password Storage Cheat Sheet, read on
9 September 2026, which recommends a minimum of 19 MiB of memory, an iteration count of
2 and one degree of parallelism. The store uses exactly that: `m=19456`, `t=2`, `p=1`.
The cheat sheet lists four other combinations of the same strength, and every one of
them is a configuration change and nothing else, because the parameters travel inside
the hash.

## Running it

The store needs the .NET 10 SDK and nothing else. There is no database to install: the
default provider is SQLite and the file lands in the host folder.

```bash
cd backends/dotnet
dotnet run --project src/Zappy.Host
```

That prints:

```text
Using launch settings from src\Zappy.Host\Properties\launchSettings.json...
Building...
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:8090
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Development
info: Microsoft.Hosting.Lifetime[0]
      Content root path: C:\Src\zappy-mart\backends\dotnet\src\Zappy.Host
```

The store is then on `http://localhost:8090/graphql`. Port 8080 is the port the family's
container images use, and this machine already has it taken, so the C# backend serves on
8090.

Two health endpoints sit beside the graph:

```bash
curl http://localhost:8090/health/live
curl http://localhost:8090/health/ready
```

```json
{"status":"live"}
{"status":"ready"}
```

`live` answers as soon as the process is up. `ready` opens the database, so it answers
503 while the store cannot reach it.

The development profile does three more things than the production one: it generates a
signing key at start, it loads `contract/seed/` into an empty store, and it puts
`resetSeed` on the graph. All three are configuration, and `appsettings.json` holds the
production defaults with every one of them off.

## From an empty folder

These are the commands, in the order they were run. The solution is a classic `.sln`
file, because the .NET 10 SDK now creates the newer `.slnx` format by default and the
family's layout names `Zappy.sln`.

```bash
mkdir -p backends/dotnet
cd backends/dotnet

dotnet new sln --name Zappy --format sln

dotnet new classlib --name Zappy.Domain              --output src/Zappy.Domain              --framework net10.0
dotnet new classlib --name Zappy.Application         --output src/Zappy.Application         --framework net10.0
dotnet new classlib --name Zappy.Adapters.GraphQL    --output src/Zappy.Adapters.GraphQL    --framework net10.0
dotnet new classlib --name Zappy.Adapters.Persistence --output src/Zappy.Adapters.Persistence --framework net10.0
dotnet new classlib --name Zappy.Adapters.Security   --output src/Zappy.Adapters.Security   --framework net10.0
dotnet new classlib --name Zappy.Adapters.Mail       --output src/Zappy.Adapters.Mail       --framework net10.0
dotnet new web      --name Zappy.Host                --output src/Zappy.Host                --framework net10.0

dotnet new xunit --name Zappy.Domain.Tests      --output tests/Zappy.Domain.Tests      --framework net10.0
dotnet new xunit --name Zappy.Application.Tests --output tests/Zappy.Application.Tests --framework net10.0
dotnet new xunit --name Zappy.Adapters.Tests    --output tests/Zappy.Adapters.Tests    --framework net10.0

dotnet sln Zappy.sln add \
  src/Zappy.Domain/Zappy.Domain.csproj \
  src/Zappy.Application/Zappy.Application.csproj \
  src/Zappy.Adapters.GraphQL/Zappy.Adapters.GraphQL.csproj \
  src/Zappy.Adapters.Persistence/Zappy.Adapters.Persistence.csproj \
  src/Zappy.Adapters.Security/Zappy.Adapters.Security.csproj \
  src/Zappy.Adapters.Mail/Zappy.Adapters.Mail.csproj \
  src/Zappy.Host/Zappy.Host.csproj \
  tests/Zappy.Domain.Tests/Zappy.Domain.Tests.csproj \
  tests/Zappy.Application.Tests/Zappy.Application.Tests.csproj \
  tests/Zappy.Adapters.Tests/Zappy.Adapters.Tests.csproj
```

The `xunit` template still writes xunit 2 with the VSTest runner, and the .NET 10 SDK
refuses to run VSTest for a Microsoft Testing Platform project. The three test projects
therefore move to xunit 3 and the platform runner, which is two lines in each project
file, one entry in `global.json` and one package the template added that goes away.

Then the packages. Versions are managed centrally in `Directory.Packages.props`, so
`dotnet add package` writes the reference in the project file and the version in the
central file:

```bash
dotnet add src/Zappy.Adapters.GraphQL package HotChocolate.AspNetCore --version 16.6.4

dotnet add src/Zappy.Adapters.Persistence package Microsoft.EntityFrameworkCore --version 10.0.12
dotnet add src/Zappy.Adapters.Persistence package Microsoft.EntityFrameworkCore.Sqlite --version 10.0.12
dotnet add src/Zappy.Adapters.Persistence package Microsoft.EntityFrameworkCore.Design --version 10.0.12
dotnet add src/Zappy.Adapters.Persistence package Npgsql.EntityFrameworkCore.PostgreSQL --version 10.0.3
dotnet add src/Zappy.Adapters.Persistence package Microsoft.Extensions.Caching.Memory --version 10.0.12
dotnet add src/Zappy.Adapters.Persistence package Microsoft.Extensions.Configuration.Binder --version 10.0.12
dotnet add src/Zappy.Adapters.Persistence package Microsoft.Extensions.DependencyInjection.Abstractions --version 10.0.12
dotnet add src/Zappy.Adapters.Persistence package Microsoft.Extensions.Logging.Abstractions --version 10.0.12
dotnet add src/Zappy.Adapters.Persistence package Microsoft.Extensions.Options --version 10.0.12

dotnet add src/Zappy.Adapters.Security package Konscious.Security.Cryptography.Argon2 --version 1.3.1
dotnet add src/Zappy.Adapters.Security package Microsoft.IdentityModel.JsonWebTokens --version 8.22.0
dotnet add src/Zappy.Adapters.Security package Microsoft.Extensions.Configuration.Binder --version 10.0.12
dotnet add src/Zappy.Adapters.Security package Microsoft.Extensions.DependencyInjection.Abstractions --version 10.0.12
dotnet add src/Zappy.Adapters.Security package Microsoft.Extensions.Options --version 10.0.12

dotnet add src/Zappy.Adapters.Mail package Microsoft.Extensions.DependencyInjection.Abstractions --version 10.0.12
dotnet add src/Zappy.Adapters.Mail package Microsoft.Extensions.Logging.Abstractions --version 10.0.12

dotnet add src/Zappy.Host package Microsoft.AspNetCore.Authentication.JwtBearer --version 10.0.12

dotnet add tests/Zappy.Domain.Tests package xunit.v3 --version 4.0.0
dotnet add tests/Zappy.Application.Tests package xunit.v3 --version 4.0.0
dotnet add tests/Zappy.Adapters.Tests package xunit.v3 --version 4.0.0
dotnet add tests/Zappy.Adapters.Tests package Microsoft.AspNetCore.Mvc.Testing --version 10.0.12
```

And the references between the projects, which are the hexagon written as build edges:

```bash
dotnet add src/Zappy.Application         reference src/Zappy.Domain
dotnet add src/Zappy.Adapters.GraphQL    reference src/Zappy.Application
dotnet add src/Zappy.Adapters.Persistence reference src/Zappy.Application
dotnet add src/Zappy.Adapters.Security   reference src/Zappy.Application
dotnet add src/Zappy.Adapters.Mail       reference src/Zappy.Application
dotnet add src/Zappy.Host                reference src/Zappy.Adapters.GraphQL
dotnet add src/Zappy.Host                reference src/Zappy.Adapters.Persistence
dotnet add src/Zappy.Host                reference src/Zappy.Adapters.Security
dotnet add src/Zappy.Host                reference src/Zappy.Adapters.Mail

dotnet add tests/Zappy.Domain.Tests      reference src/Zappy.Domain
dotnet add tests/Zappy.Application.Tests reference src/Zappy.Application
dotnet add tests/Zappy.Adapters.Tests    reference src/Zappy.Host
```

`Zappy.Domain` has no package reference and no project reference at all. That is the
mechanical test of `docs/principles.md`: the domain compiles without the web and
database packages, because it never learns they exist.

The migration tool is a local tool, pinned to the same version as the runtime packages:

```bash
dotnet new tool-manifest
dotnet tool install dotnet-ef --version 10.0.12
```

## The shape

```
Zappy.Adapters.GraphQL ---.                          .--- Zappy.Adapters.Persistence
                           \                        /
                            >--- Zappy.Application -<---- Zappy.Adapters.Security
                           /            |           \
Zappy.Host ---------------'             |            '--- Zappy.Adapters.Mail
                                        v
                                  Zappy.Domain
```

The arrows are project references and they only point inwards. `Zappy.Application`
declares what it needs from the outside as ports (`IProductRepository`, `IUnitOfWork`,
`IClock`, `ITokenIssuer`, `IPasswordHasher`, `IMailer`, `IRateLimiter`, `ISeedLoader`),
the four adapters implement them, and `Zappy.Host` is the only project that knows all of
them, because wiring is its whole job.

```
backends/dotnet/
  Zappy.sln
  global.json                  the SDK line and the test runner
  Directory.Build.props        nullable, implicit usings, warnings are errors
  Directory.Packages.props     every package version, once
  dotnet-tools.json            dotnet-ef, pinned
  .gitignore                   the SQLite file and the test results the run writes
  compose.yaml                 PostgreSQL 18 for the second profile
  src/
    Zappy.Domain/              Shared, Catalogue, Cart, Promotions, Ordering, Accounts
    Zappy.Application/         one class per use case, plus the ports
    Zappy.Adapters.GraphQL/    the schema binding, the payloads, the cookies, the Origin check
    Zappy.Adapters.Persistence/ the DbContext, the configurations, the repositories, the seed
    Zappy.Adapters.Security/   the token issuer, the Argon2id hasher, the rate limiter
    Zappy.Adapters.Mail/       the console mailer
    Zappy.Host/                Program.cs, the wiring, the health endpoints
  tests/
    Zappy.Domain.Tests/        the rules, with builders
    Zappy.Application.Tests/   the use cases, against in memory doubles
    Zappy.Adapters.Tests/      the database, the schema and the whole store over HTTP
```

### One namespace per project

Every file in `Zappy.Domain` declares `namespace Zappy.Domain`, whatever folder it sits
in, and the same holds for the other projects. The folders are the modules and the
namespace is the project.

The reason is small and stubborn: the cart module is called `Cart` and its aggregate root
is called `Cart` as well, and C# cannot see a type through a namespace of the same name.
Inside `namespace Zappy.Application.Cart` the name `Cart` binds to the namespace
`Zappy.Application.Cart` before it ever reaches the type, and every use case would have
to write the type out in full or alias it. Renaming the aggregate to `ShoppingCart`
would break the one concept one word rule of `docs/principles.md`, because the contract
calls it a cart. One namespace per project costs nothing and keeps both names.

## The build files

`global.json`

```json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestFeature"
  },
  "test": {
    "runner": "Microsoft.Testing.Platform"
  }
}
```

The `test` section is the opt in that the .NET 10 SDK asks for. Without it `dotnet test`
tries the old VSTest path and xunit 3 refuses.

`Directory.Build.props`

```xml
<Project>

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>14.0</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <WarningsNotAsErrors></WarningsNotAsErrors>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <GenerateDocumentationFile>false</GenerateDocumentationFile>
    <InvariantGlobalization>true</InvariantGlobalization>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
    <IsPackable>false</IsPackable>
    <TestingPlatformDotnetTestSupport>true</TestingPlatformDotnetTestSupport>
  </PropertyGroup>

</Project>
```

`TreatWarningsAsErrors` is what makes the zero warning gate a gate and not a hope.
`InvariantGlobalization` keeps the container image small and makes string comparison the
same on every machine, which matters because the catalogue filter lowercases names.

`Directory.Packages.props`

```xml
<Project>

  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
    <CentralPackageTransitivePinningEnabled>true</CentralPackageTransitivePinningEnabled>
  </PropertyGroup>

  <ItemGroup>
    <PackageVersion Include="HotChocolate.AspNetCore" Version="16.6.4" />
    <PackageVersion Include="Konscious.Security.Cryptography.Argon2" Version="1.3.1" />
    <PackageVersion Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.12" />
    <PackageVersion Include="Microsoft.EntityFrameworkCore" Version="10.0.12" />
    <PackageVersion Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.12" />
    <PackageVersion Include="Microsoft.EntityFrameworkCore.Sqlite" Version="10.0.12" />
    <PackageVersion Include="Microsoft.Extensions.Caching.Memory" Version="10.0.12" />
    <PackageVersion Include="Microsoft.Extensions.Configuration.Binder" Version="10.0.12" />
    <PackageVersion Include="Microsoft.Extensions.DependencyInjection.Abstractions" Version="10.0.12" />
    <PackageVersion Include="Microsoft.Extensions.Hosting.Abstractions" Version="10.0.12" />
    <PackageVersion Include="Microsoft.Extensions.Logging.Abstractions" Version="10.0.12" />
    <PackageVersion Include="Microsoft.Extensions.Options" Version="10.0.12" />
    <PackageVersion Include="Microsoft.IdentityModel.JsonWebTokens" Version="8.22.0" />
    <PackageVersion Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.3" />
  </ItemGroup>

  <ItemGroup>
    <PackageVersion Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.12" />
    <PackageVersion Include="xunit.v3" Version="4.0.0" />
  </ItemGroup>

</Project>
```

`.gitignore`

```text
*.db
*.db-shm
*.db-wal
TestResults/
```

### The project files

Seven projects in `src` and three in `tests`. Each one is short, because the versions
live centrally and the target framework lives in `Directory.Build.props`, so a project
file says only what that project depends on. Read them as the hexagon in build form.

`src/Zappy.Domain/Zappy.Domain.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <RootNamespace>Zappy.Domain</RootNamespace>
  </PropertyGroup>

</Project>
```

No package reference and no project reference. That empty file is the shape of the
architecture.

`src/Zappy.Application/Zappy.Application.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <RootNamespace>Zappy.Application</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\Zappy.Domain\Zappy.Domain.csproj" />
  </ItemGroup>

</Project>
```

`src/Zappy.Adapters.Persistence/Zappy.Adapters.Persistence.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <RootNamespace>Zappy.Adapters.Persistence</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" PrivateAssets="all" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" />
    <PackageReference Include="Microsoft.Extensions.Caching.Memory" />
    <PackageReference Include="Microsoft.Extensions.Configuration.Binder" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection.Abstractions" />
    <PackageReference Include="Microsoft.Extensions.Logging.Abstractions" />
    <PackageReference Include="Microsoft.Extensions.Options" />
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Zappy.Application\Zappy.Application.csproj" />
  </ItemGroup>

</Project>
```

`src/Zappy.Adapters.Security/Zappy.Adapters.Security.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <RootNamespace>Zappy.Adapters.Security</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Konscious.Security.Cryptography.Argon2" />
    <PackageReference Include="Microsoft.Extensions.Configuration.Binder" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection.Abstractions" />
    <PackageReference Include="Microsoft.Extensions.Options" />
    <PackageReference Include="Microsoft.IdentityModel.JsonWebTokens" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Zappy.Application\Zappy.Application.csproj" />
  </ItemGroup>

</Project>
```

`src/Zappy.Adapters.Mail/Zappy.Adapters.Mail.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <RootNamespace>Zappy.Adapters.Mail</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.DependencyInjection.Abstractions" />
    <PackageReference Include="Microsoft.Extensions.Logging.Abstractions" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Zappy.Application\Zappy.Application.csproj" />
  </ItemGroup>

</Project>
```

`src/Zappy.Adapters.GraphQL/Zappy.Adapters.GraphQL.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <RootNamespace>Zappy.Adapters.GraphQL</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="HotChocolate.AspNetCore" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Zappy.Application\Zappy.Application.csproj" />
  </ItemGroup>

</Project>
```

The GraphQL adapter takes a framework reference on ASP.NET Core rather than a package,
because it is a class library that reads an HTTP request. The persistence, security and
mail adapters take the four Microsoft extension packages they need and nothing more, so
none of them can reach for an HTTP context by accident.

`src/Zappy.Host/Zappy.Host.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <RootNamespace>Zappy.Host</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Zappy.Adapters.GraphQL\Zappy.Adapters.GraphQL.csproj" />
    <ProjectReference Include="..\Zappy.Adapters.Mail\Zappy.Adapters.Mail.csproj" />
    <ProjectReference Include="..\Zappy.Adapters.Persistence\Zappy.Adapters.Persistence.csproj" />
    <ProjectReference Include="..\Zappy.Adapters.Security\Zappy.Adapters.Security.csproj" />
  </ItemGroup>

</Project>
```

## The domain

The domain is the middle of the hexagon. It holds the rules and the values, it imports
nothing but the base class library, and every one of its types can be constructed in a
test without a database.

### The shared kernel

`docs/domain.md` keeps the shared kernel to three things: `Money`, `EmailAddress` and the
`Result` type every use case answers with. Three more small types live beside them: the
refusal codes the contract fixes, the error shape a client renders, and the base type of
a domain event.

`src/Zappy.Domain/Shared/Money.cs`

```csharp
namespace Zappy.Domain;

public sealed record Money
{
    public const string EuroCurrency = "EUR";

    public Money(int amount, string currency)
    {
        if (amount < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), amount, "An amount of money is never negative.");
        }

        if (string.IsNullOrWhiteSpace(currency))
        {
            throw new ArgumentException("An amount of money always names its currency.", nameof(currency));
        }

        Amount = amount;
        Currency = currency;
    }

    public int Amount { get; }

    public string Currency { get; }

    public bool IsZero => Amount == 0;

    public static Money Euro(int amount) => new(amount, EuroCurrency);

    public static Money ZeroIn(string currency) => new(0, currency);

    public Money Plus(Money other) => new(Amount + AmountOf(other), Currency);

    public Money Minus(Money other) => new(Amount - AmountOf(other), Currency);

    public Money Times(int factor) => new(Amount * factor, Currency);

    public bool IsAtLeast(Money other) => Amount >= AmountOf(other);

    public Money CappedAt(Money ceiling) => IsAtLeast(ceiling) ? ceiling : this;

    public override string ToString() => $"{Amount} {Currency}";

    private int AmountOf(Money other) => other.Currency == Currency
        ? other.Amount
        : throw new InvalidOperationException($"An amount in {Currency} cannot be combined with an amount in {other.Currency}.");
}
```

`Money` is a record, so two amounts of the same value are equal and no test has to reach
for a custom comparison. It refuses to be negative and it refuses to mix currencies,
which is why the totals never need to check either. A discount is a positive amount that
is subtracted, exactly as `contract/schema.graphql` says.

`src/Zappy.Domain/Shared/EmailAddress.cs`

```csharp
namespace Zappy.Domain;

public sealed record EmailAddress
{
    private EmailAddress(string value) => Value = value;

    public string Value { get; }

    public static EmailAddress? Create(string value)
    {
        var normalised = value.Trim().ToLowerInvariant();
        var separator = normalised.IndexOf('@');
        if (separator <= 0 || separator != normalised.LastIndexOf('@') || separator == normalised.Length - 1)
        {
            return null;
        }

        var domain = normalised[(separator + 1)..];
        var dot = domain.IndexOf('.');
        if (dot <= 0 || dot == domain.Length - 1 || normalised.Contains(' '))
        {
            return null;
        }

        return new EmailAddress(normalised);
    }

    public override string ToString() => Value;
}
```

`Create` answers null rather than a `Result`, because a value object that cannot exist is
the whole message. The use case that called it decides which code and which field the
refusal carries, and that keeps the field names of the contract out of the domain.

`src/Zappy.Domain/Shared/UserErrorCode.cs`

```csharp
namespace Zappy.Domain;

public enum UserErrorCode
{
    ProductNotFound,
    OutOfStock,
    QuantityInvalid,
    CartLineNotFound,
    CartEmpty,
    CodeUnknown,
    CodeExpired,
    CodeExhausted,
    CodeMinimumNotMet,
    EmailTaken,
    EmailInvalid,
    PasswordTooShort,
    PasswordTooLong,
    CredentialsInvalid,
    RateLimited,
    SessionInvalid,
    SessionNotFound,
    NotAuthenticated,
    OrderNotFound
}
```

These are the nineteen values of `UserErrorCode` in `contract/schema.graphql`, in the
same order. They live in the domain and not in the GraphQL adapter, because they are
business vocabulary: out of stock, code expired, credentials invalid. Hot Chocolate
serialises `OutOfStock` as `OUT_OF_STOCK` on its own, so there is one list and no mapping
table that can drift. A test compares the served schema with the contract file, which is
what keeps that promise honest.

`src/Zappy.Domain/Shared/UserError.cs`

```csharp
namespace Zappy.Domain;

public sealed record UserError(UserErrorCode Code, string Message, string? Field = null);
```

`src/Zappy.Domain/Shared/Result.cs`

```csharp
namespace Zappy.Domain;

public sealed record Result<TValue>
{
    private Result(TValue? value, IReadOnlyList<UserError> errors)
    {
        Value = value;
        Errors = errors;
    }

    public TValue? Value { get; }

    public IReadOnlyList<UserError> Errors { get; }

    public bool Succeeded => Errors.Count == 0;

    public static Result<TValue> Success(TValue value) => new(value, []);

    public static Result<TValue> Failure(UserErrorCode code, string message, string? field = null) =>
        new(default, [new UserError(code, message, field)]);

    public static Result<TValue> Failure(IReadOnlyList<UserError> errors) => new(default, errors);

    public static Result<TValue> Refused(TValue value, UserErrorCode code, string message, string? field = null) =>
        new(value, [new UserError(code, message, field)]);

    public static Result<TValue> Refused(TValue value, IReadOnlyList<UserError> errors) => new(value, errors);
}
```

`Result` is sealed and it carries both a value and a list of errors, because some
refusals answer with something anyway. `Refused` is the shape the cart uses: the change
did not happen and the cart still comes back, which is what the contract promises for
every cart mutation.

`src/Zappy.Domain/Shared/DomainEvent.cs`

```csharp
namespace Zappy.Domain;

public abstract record DomainEvent;
```

`src/Zappy.Domain/Shared/Identifier.cs`

```csharp
namespace Zappy.Domain;

public static class Identifier
{
    public static string New() => Guid.CreateVersion7().ToString("n");
}
```

Version 7 identifiers sort by the moment they were made, which makes a database index on
them behave and a page of them read in the order they were created.

### Catalogue

`src/Zappy.Domain/Catalogue/Category.cs`

```csharp
namespace Zappy.Domain;

public sealed class Category
{
    private Category()
    {
    }

    public Category(string id, string name, string slug, int catalogueOrder)
    {
        Id = id;
        Name = name;
        Slug = slug;
        CatalogueOrder = catalogueOrder;
    }

    public string Id { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string Slug { get; private set; } = null!;

    public int CatalogueOrder { get; private set; }
}
```

`src/Zappy.Domain/Catalogue/Product.cs`

```csharp
namespace Zappy.Domain;

public sealed class Product
{
    private Product()
    {
    }

    public Product(
        string id,
        string name,
        string slug,
        string description,
        Money price,
        string categorySlug,
        int stock,
        string? imageUrl,
        int catalogueOrder)
    {
        Id = id;
        Name = name;
        Slug = slug;
        Description = description;
        Price = price;
        CategorySlug = categorySlug;
        Stock = stock;
        ImageUrl = imageUrl;
        CatalogueOrder = catalogueOrder;
    }

    public string Id { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string Slug { get; private set; } = null!;

    public string Description { get; private set; } = null!;

    public Money Price { get; private set; } = null!;

    public string CategorySlug { get; private set; } = null!;

    public Category Category { get; private set; } = null!;

    public int Stock { get; private set; }

    public string? ImageUrl { get; private set; }

    public int CatalogueOrder { get; private set; }

    public bool HasStockFor(int quantity) => Stock >= quantity;

    public void Reserve(int quantity)
    {
        if (!HasStockFor(quantity))
        {
            throw new InvalidOperationException($"{Name} has {Stock} in stock and {quantity} were asked for.");
        }

        Stock -= quantity;
    }
}
```

Every entity in this domain has a private parameterless constructor beside its real one.
That one is for Entity Framework Core, which needs a way to make an instance before it
fills it, and the `= null!` on the reference properties is what tells the compiler so.
The real constructor is the only way the rest of the code can make a product.

`Reserve` throws rather than answering a result, because the caller already asked
`HasStockFor`. An exception here means a bug and not a rule saying no, which is the line
`docs/patterns.md` draws around the result type.

`src/Zappy.Domain/Catalogue/ProductSpecification.cs`

```csharp
using System.Linq.Expressions;

namespace Zappy.Domain;

public sealed record ProductSpecification(string? CategorySlug, string? NameContains, bool InStockOnly)
{
    public static readonly ProductSpecification WholeCatalogue = new(null, null, false);

    public IReadOnlyList<Expression<Func<Product, bool>>> Parts()
    {
        var parts = new List<Expression<Func<Product, bool>>>();

        if (!string.IsNullOrWhiteSpace(CategorySlug))
        {
            var slug = CategorySlug;
            parts.Add(product => product.CategorySlug == slug);
        }

        if (!string.IsNullOrWhiteSpace(NameContains))
        {
            var text = NameContains.ToLowerInvariant();
            parts.Add(product => product.Name.ToLower().Contains(text));
        }

        if (InStockOnly)
        {
            parts.Add(product => product.Stock > 0);
        }

        return parts;
    }

    public bool IsSatisfiedBy(Product product) => Parts().All(part => part.Compile().Invoke(product));
}
```

This is the specification pattern, and it earns its place twice. `Parts` answers a list
of expressions, so the repository can hand them to Entity Framework Core one after the
other and the filter runs in SQL. `IsSatisfiedBy` compiles the same expressions, so a
test can check the filter without a database. One rule, two readers.

### Cart

`src/Zappy.Domain/Cart/CartLine.cs`

```csharp
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
```

A line holds the product itself and not a copy of its price, because the cart shows
today's price while the visitor shops. The order is where prices are copied, and
`OrderLine` below is where that happens.

`src/Zappy.Domain/Cart/Cart.cs`

```csharp
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
```

Every method that a rule can refuse answers a `Result<Cart>` with the cart in it, so the
adapter never has to guess what to send back. `TakeOver` is the merge on login: the
customer's cart takes the lines of the anonymous cart, quantities add up, and the
customer's own promotion code wins when both have one.

### Promotions

`src/Zappy.Domain/Promotions/PromotionKind.cs`

```csharp
namespace Zappy.Domain;

public enum PromotionKind
{
    Percentage,
    FixedAmount,
    FreeShipping
}
```

`src/Zappy.Domain/Promotions/PromotionRule.cs`

```csharp
namespace Zappy.Domain;

public abstract record PromotionRule
{
    public abstract PromotionKind Kind { get; }

    public abstract Money DiscountFor(Money subtotal);

    public virtual Money ShippingFor(Money shippingBeforeThePromotion) => shippingBeforeThePromotion;
}
```

The strategy has two questions and one default. `DiscountFor` is the money off, and
`ShippingFor` gets the shipping the cart would otherwise pay and hands it back
unchanged. Only free shipping overrides it, so the threshold rule stays in one place and
the free shipping rule stays in one place.

`src/Zappy.Domain/Promotions/PercentageOffSubtotal.cs`

```csharp
namespace Zappy.Domain;

public sealed record PercentageOffSubtotal(int Percentage) : PromotionRule
{
    public override PromotionKind Kind => PromotionKind.Percentage;

    public override Money DiscountFor(Money subtotal)
    {
        var hundredths = (long)subtotal.Amount * Percentage;
        var roundedHalfUp = (int)((hundredths + 50) / 100);
        return new Money(roundedHalfUp, subtotal.Currency).CappedAt(subtotal);
    }
}
```

Rounded half up, in integers, with a `long` in the middle so a large cart cannot
overflow. Ten percent of 5599 is 559.9 and the answer is 560, which is the row
`contract/seed/seed.md` works through.

`src/Zappy.Domain/Promotions/FixedAmountOffSubtotal.cs`

```csharp
namespace Zappy.Domain;

public sealed record FixedAmountOffSubtotal(Money Amount) : PromotionRule
{
    public override PromotionKind Kind => PromotionKind.FixedAmount;

    public override Money DiscountFor(Money subtotal) => Amount.CappedAt(subtotal);
}
```

`src/Zappy.Domain/Promotions/FreeShipping.cs`

```csharp
namespace Zappy.Domain;

public sealed record FreeShipping : PromotionRule
{
    public override PromotionKind Kind => PromotionKind.FreeShipping;

    public override Money DiscountFor(Money subtotal) => Money.ZeroIn(subtotal.Currency);

    public override Money ShippingFor(Money shippingBeforeThePromotion) =>
        Money.ZeroIn(shippingBeforeThePromotion.Currency);
}
```

`src/Zappy.Domain/Promotions/AppliedPromotion.cs`

```csharp
namespace Zappy.Domain;

public sealed record AppliedPromotion(string Code, PromotionKind Kind, Money Discount);
```

`src/Zappy.Domain/Promotions/PromotionCode.cs`

```csharp
namespace Zappy.Domain;

public sealed class PromotionCode
{
    private PromotionCode()
    {
    }

    public PromotionCode(
        string code,
        PromotionKind kind,
        int? percentage,
        Money? amount,
        Money? minimumSubtotal,
        DateTimeOffset validFrom,
        DateTimeOffset validUntil,
        int? usageLimit,
        int timesUsed)
    {
        Code = code.Trim().ToUpperInvariant();
        Kind = kind;
        Percentage = percentage;
        Amount = amount;
        MinimumSubtotal = minimumSubtotal;
        ValidFrom = validFrom;
        ValidUntil = validUntil;
        UsageLimit = usageLimit;
        TimesUsed = timesUsed;
    }

    public string Code { get; private set; } = null!;

    public PromotionKind Kind { get; private set; }

    public int? Percentage { get; private set; }

    public Money? Amount { get; private set; }

    public Money? MinimumSubtotal { get; private set; }

    public DateTimeOffset ValidFrom { get; private set; }

    public DateTimeOffset ValidUntil { get; private set; }

    public int? UsageLimit { get; private set; }

    public int TimesUsed { get; private set; }

    public PromotionRule Rule => Kind switch
    {
        PromotionKind.Percentage => new PercentageOffSubtotal(Percentage ?? 0),
        PromotionKind.FixedAmount => new FixedAmountOffSubtotal(Amount ?? Money.Euro(0)),
        PromotionKind.FreeShipping => new FreeShipping(),
        _ => throw new InvalidOperationException($"{Code} carries the unknown kind {Kind}.")
    };

    public static string Normalise(string code) => code.Trim().ToUpperInvariant();

    public Result<PromotionRule> RuleFor(Money subtotal, DateTimeOffset moment)
    {
        if (moment < ValidFrom || moment > ValidUntil)
        {
            return Result<PromotionRule>.Failure(
                UserErrorCode.CodeExpired,
                $"The promotion code {Code} is outside its validity window.",
                "code");
        }

        if (UsageLimit is not null && TimesUsed >= UsageLimit)
        {
            return Result<PromotionRule>.Failure(
                UserErrorCode.CodeExhausted,
                $"The promotion code {Code} has reached its usage limit.",
                "code");
        }

        if (MinimumSubtotal is not null && !subtotal.IsAtLeast(MinimumSubtotal))
        {
            return Result<PromotionRule>.Failure(
                UserErrorCode.CodeMinimumNotMet,
                $"The promotion code {Code} asks for a subtotal of at least {MinimumSubtotal}.",
                "code");
        }

        return Result<PromotionRule>.Success(Rule);
    }

    public void RecordUse() => TimesUsed += 1;
}
```

`RuleFor` is where the four refusals of a promotion code live, in the order the contract
lists them: outside its window, at its limit, below its minimum, and otherwise the rule
itself. `Normalise` is the one place that decides `welcome10` and `WELCOME10` are the
same code.

### Ordering

`src/Zappy.Domain/Ordering/Totals.cs`

```csharp
namespace Zappy.Domain;

public sealed record Totals(Money Subtotal, Money Shipping, Money Discount, Money Total)
{
    public static readonly Money StandardShipping = Money.Euro(495);

    public static readonly Money FreeShippingFrom = Money.Euro(5000);

    public static Totals For(Money subtotal, PromotionRule? promotionRule)
    {
        var nothing = Money.ZeroIn(subtotal.Currency);
        var discount = promotionRule is null ? nothing : promotionRule.DiscountFor(subtotal).CappedAt(subtotal);
        var charged = subtotal.IsZero || subtotal.IsAtLeast(FreeShippingFrom) ? nothing : StandardShipping;
        var shipping = promotionRule is null ? charged : promotionRule.ShippingFor(charged);
        return new Totals(subtotal, shipping, discount, subtotal.Plus(shipping).Minus(discount));
    }
}
```

Nine lines carry the whole of the money rules. The shipping charge is 495 cents, it is
nothing on an empty cart and nothing from a subtotal of 5000, the promotion may take it
away, the discount never passes the subtotal, and the total is the equation the contract
prints. Both the cart and the order ask this one method, so the checkout screen and the
confirmation mail can never disagree.

`src/Zappy.Domain/Ordering/OrderStatus.cs`

```csharp
namespace Zappy.Domain;

public enum OrderStatus
{
    Placed,
    Paid,
    Cancelled
}
```

`src/Zappy.Domain/Ordering/OrderLine.cs`

```csharp
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
```

`src/Zappy.Domain/Ordering/OrderPlaced.cs`

```csharp
namespace Zappy.Domain;

public sealed record OrderPlaced(string OrderId, string CustomerId, string? PromotionCode) : DomainEvent;
```

`src/Zappy.Domain/Ordering/Order.cs`

```csharp
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
```

`Order.Place` is the factory: the only way an order comes into being, from a cart, at a
moment. It refuses an empty cart, it refuses the whole order when one line has lost its
stock, and only then does it reserve, copy the names and the prices, take the totals the
cart showed, empty the cart and raise `OrderPlaced`.

Reserving inside the factory is deliberate. `docs/patterns.md` describes stock
reservation as something that reacts to the event, and `docs/domain.md` says no order is
placed at all when one line cannot be reserved. Those two cannot both hold, so the
domain wins: the reservation is part of placing the order and inside the same
transaction, and the event drives the two reactions `docs/domain.md` names, the
confirmation mail and the promotion counter.

### Accounts

`src/Zappy.Domain/Accounts/Customer.cs`

```csharp
namespace Zappy.Domain;

public sealed class Customer
{
    private Customer()
    {
    }

    public Customer(string id, EmailAddress email, string name, string passwordHash, DateTimeOffset createdAt)
    {
        Id = id;
        Email = email;
        Name = name;
        PasswordHash = passwordHash;
        CreatedAt = createdAt;
    }

    public string Id { get; private set; } = null!;

    public EmailAddress Email { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string PasswordHash { get; private set; } = null!;

    public DateTimeOffset CreatedAt { get; private set; }
}
```

`src/Zappy.Domain/Accounts/PasswordPolicy.cs`

```csharp
namespace Zappy.Domain;

public static class PasswordPolicy
{
    public const int MinimumLength = 12;

    public const int MaximumLength = 128;

    public static IReadOnlyList<UserError> Check(string password)
    {
        if (password.Length < MinimumLength)
        {
            return
            [
                new UserError(
                    UserErrorCode.PasswordTooShort,
                    $"A password is at least {MinimumLength} characters.",
                    "input.password")
            ];
        }

        if (password.Length > MaximumLength)
        {
            return
            [
                new UserError(
                    UserErrorCode.PasswordTooLong,
                    $"A password is at most {MaximumLength} characters.",
                    "input.password")
            ];
        }

        return [];
    }
}
```

`src/Zappy.Domain/Accounts/Session.cs`

```csharp
namespace Zappy.Domain;

public sealed class Session
{
    private Session()
    {
    }

    public Session(
        string id,
        string customerId,
        string device,
        int creationOrder,
        DateTimeOffset createdAt,
        DateTimeOffset expiresAt)
    {
        Id = id;
        CreationOrder = creationOrder;
        CustomerId = customerId;
        Device = device;
        CreatedAt = createdAt;
        LastUsedAt = createdAt;
        ExpiresAt = expiresAt;
    }

    public string Id { get; private set; } = null!;

    public string CustomerId { get; private set; } = null!;

    public string Device { get; private set; } = null!;

    public int CreationOrder { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset LastUsedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public bool IsOpenAt(DateTimeOffset moment) => RevokedAt is null && moment < ExpiresAt;

    public void Revoke(DateTimeOffset moment) => RevokedAt ??= moment;

    public void RecordUse(DateTimeOffset moment) => LastUsedAt = moment;
}
```

A session carries a creation order beside its moment. Two logins on a fast machine can
land on the same clock reading, and a list that only sorts by the moment then puts them
in whichever order the database felt like. The creation order is the tiebreaker, so the
device that just logged in is always first.

`src/Zappy.Domain/Accounts/RefreshToken.cs`

```csharp
namespace Zappy.Domain;

public sealed class RefreshToken
{
    private RefreshToken()
    {
    }

    public RefreshToken(string id, string sessionId, string tokenHash, DateTimeOffset createdAt, DateTimeOffset expiresAt)
    {
        Id = id;
        SessionId = sessionId;
        TokenHash = tokenHash;
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
    }

    public string Id { get; private set; } = null!;

    public string SessionId { get; private set; } = null!;

    public string TokenHash { get; private set; } = null!;

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RotatedAt { get; private set; }

    public bool WasAlreadyUsed => RotatedAt is not null;

    public bool HasExpiredAt(DateTimeOffset moment) => moment >= ExpiresAt;

    public void Rotate(DateTimeOffset moment) => RotatedAt = moment;
}
```

One row per token that was ever issued for a session, with the moment it was rotated.
That is what makes a replay visible: a token that comes back with `RotatedAt` filled in
has been used before, which means it leaked.

`src/Zappy.Domain/Accounts/WishlistEntry.cs`

```csharp
namespace Zappy.Domain;

public sealed class WishlistEntry
{
    private WishlistEntry()
    {
    }

    public WishlistEntry(string ownerId, string productId, DateTimeOffset addedAt)
    {
        OwnerId = ownerId;
        ProductId = productId;
        AddedAt = addedAt;
    }

    public string OwnerId { get; private set; } = null!;

    public string ProductId { get; private set; } = null!;

    public DateTimeOffset AddedAt { get; private set; }
}
```

The owner of a wishlist entry is either a customer or an anonymous cart. That is the one
sentence that makes an anonymous wishlist work: the `zappy_cart` cookie names the cart,
and the cart names the wishlist.

## The application

One class per use case, one method called `Execute`, and no service layer beside them.
The ports sit next to the use cases that need them.

### The ports and the shared pieces

`src/Zappy.Application/Shared/IUnitOfWork.cs`

```csharp
namespace Zappy.Application;

public interface IUnitOfWork
{
    Task<TResult> RunInOneTransaction<TResult>(
        Func<CancellationToken, Task<TResult>> work,
        CancellationToken cancellationToken);
}
```

One transaction per use case, handed a piece of work. Everything a use case changes goes
in or nothing does.

`src/Zappy.Application/Shared/IClock.cs`

```csharp
namespace Zappy.Application;

public interface IClock
{
    DateTimeOffset Now { get; }
}
```

`src/Zappy.Application/Shared/Page.cs`

```csharp
namespace Zappy.Application;

public sealed record Page<TItem>(IReadOnlyList<TItem> Items, bool HasNextPage, int TotalCount)
{
    public static Page<TItem> Empty { get; } = new([], false, 0);
}
```

`src/Zappy.Application/Shared/PageSize.cs`

```csharp
namespace Zappy.Application;

public static class PageSize
{
    public const int Maximum = 100;

    public static int Clamp(int? asked, int fallback) => Math.Clamp(asked ?? fallback, 1, Maximum);
}
```

`src/Zappy.Application/Shared/Cursor.cs`

```csharp
using System.Text;

namespace Zappy.Application;

public static class Cursor
{
    public static string For(string id) => Convert.ToBase64String(Encoding.UTF8.GetBytes(id));

    public static string? IdentifierIn(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor))
        {
            return null;
        }

        Span<byte> decoded = new byte[cursor.Length];
        return Convert.TryFromBase64String(cursor, decoded, out var written)
            ? Encoding.UTF8.GetString(decoded[..written])
            : null;
    }
}
```

A cursor is the identifier of the last item on the page, base64 encoded. One place
encodes it and one place reads it back, which is why the GraphQL layer and the
repositories never disagree about what a cursor is.

`src/Zappy.Application/Shared/Visitor.cs`

```csharp
namespace Zappy.Application;

public sealed record Visitor(string? CustomerId, string? SessionId, string? AnonymousCartId)
{
    public static readonly Visitor Anonymous = new(null, null, null);

    public bool IsSignedIn => CustomerId is not null;
}
```

The visitor is the whole of the request that a use case is allowed to know: who is
signed in, on which session, and which anonymous cart the cookie names. Nothing ambient,
nothing static, and a use case test can make one in a line.

`src/Zappy.Application/Shared/IDomainEventHandler.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface IDomainEventHandler<in TDomainEvent>
    where TDomainEvent : DomainEvent
{
    Task Handle(TDomainEvent domainEvent, CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Shared/IDomainEventDispatcher.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface IDomainEventDispatcher
{
    Task Dispatch(IReadOnlyList<DomainEvent> raisedEvents, CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Shared/DomainEventDispatcher.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class DomainEventDispatcher(IEnumerable<IDomainEventHandler<OrderPlaced>> orderPlacedHandlers)
    : IDomainEventDispatcher
{
    public async Task Dispatch(IReadOnlyList<DomainEvent> raisedEvents, CancellationToken cancellationToken)
    {
        foreach (var orderPlaced in raisedEvents.OfType<OrderPlaced>())
        {
            foreach (var handler in orderPlacedHandlers)
            {
                await handler.Handle(orderPlaced, cancellationToken);
            }
        }
    }
}
```

The dispatcher names the one event this store has. A second event adds a constructor
parameter and a loop, and that is cheaper to read than the reflection a mediator library
would need.

`src/Zappy.Application/Catalogue/IProductRepository.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface IProductRepository
{
    Task<Page<Product>> Matching(
        ProductSpecification specification,
        int first,
        string? afterProductId,
        CancellationToken cancellationToken);

    Task<Product?> WithSlug(string slug, CancellationToken cancellationToken);

    Task<Product?> WithId(string id, CancellationToken cancellationToken);

    Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Catalogue/ICategoryRepository.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> InCatalogueOrder(CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Cart/ICartRepository.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface ICartRepository
{
    Task<Cart?> WithId(string id, CancellationToken cancellationToken);

    Task<Cart?> OfCustomer(string customerId, CancellationToken cancellationToken);

    Task Add(Cart cart, CancellationToken cancellationToken);

    Task Remove(Cart cart, CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Promotions/IPromotionCodeRepository.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface IPromotionCodeRepository
{
    Task<PromotionCode?> WithCode(string code, CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Ordering/IOrderRepository.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface IOrderRepository
{
    Task Add(Order order, CancellationToken cancellationToken);

    Task<Page<Order>> OfCustomer(
        string customerId,
        int first,
        string? afterOrderId,
        CancellationToken cancellationToken);

    Task<Order?> OfCustomerWithId(string customerId, string orderId, CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Ordering/IMailer.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface IMailer
{
    Task SendOrderConfirmation(
        EmailAddress recipient,
        string customerName,
        Order order,
        CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Accounts/ICustomerRepository.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface ICustomerRepository
{
    Task<Customer?> WithEmail(EmailAddress email, CancellationToken cancellationToken);

    Task<Customer?> WithId(string id, CancellationToken cancellationToken);

    Task Add(Customer customer, CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Accounts/ISessionRepository.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface ISessionRepository
{
    Task Add(Session session, RefreshToken refreshToken, CancellationToken cancellationToken);

    Task AddRefreshToken(RefreshToken refreshToken, CancellationToken cancellationToken);

    Task<int> NextCreationOrderFor(string customerId, CancellationToken cancellationToken);

    Task<Session?> WithId(string sessionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Session>> OpenOfCustomer(
        string customerId,
        DateTimeOffset moment,
        CancellationToken cancellationToken);

    Task<RefreshToken?> WithTokenHash(string tokenHash, CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Accounts/IWishlistRepository.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public interface IWishlistRepository
{
    Task<IReadOnlyList<WishlistEntry>> OfOwner(string ownerId, CancellationToken cancellationToken);

    Task Add(WishlistEntry entry, CancellationToken cancellationToken);

    Task Remove(string ownerId, string productId, CancellationToken cancellationToken);
}
```

`src/Zappy.Application/Accounts/ITokenIssuer.cs`

```csharp
namespace Zappy.Application;

public interface ITokenIssuer
{
    AccessToken IssueAccessToken(string customerId, string sessionId, DateTimeOffset moment);

    string IssueRefreshToken();

    string HashRefreshToken(string refreshToken);
}
```

`src/Zappy.Application/Accounts/AccessToken.cs`

```csharp
namespace Zappy.Application;

public sealed record AccessToken(string Value, DateTimeOffset ExpiresAt);
```

`src/Zappy.Application/Accounts/IPasswordHasher.cs`

```csharp
namespace Zappy.Application;

public interface IPasswordHasher
{
    string Hash(string password);

    bool Matches(string password, string hash);
}
```

`src/Zappy.Application/Accounts/IRateLimiter.cs`

```csharp
namespace Zappy.Application;

public interface IRateLimiter
{
    bool AllowsAttempt(string key, DateTimeOffset moment);

    void Forget();
}
```

`src/Zappy.Application/Development/ISeedLoader.cs`

```csharp
namespace Zappy.Application;

public interface ISeedLoader
{
    Task<int> LoadFreshSeed(CancellationToken cancellationToken);
}
```

There is no `IRepository<T>`. Every port carries the three or four reads its use cases
actually need, named after what they answer. `WithSlug`, `OfCustomer` and `Matching` say
more than `GetById` ever could, and a generic base would hide exactly the queries that
matter.

### The catalogue use cases

`src/Zappy.Application/Catalogue/ListProducts.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class ListProducts(IProductRepository products)
{
    public const int DefaultPageSize = 24;

    public Task<Page<Product>> Execute(
        ProductSpecification specification,
        int? first,
        string? after,
        CancellationToken cancellationToken) =>
        products.Matching(
            specification,
            PageSize.Clamp(first, DefaultPageSize),
            Cursor.IdentifierIn(after),
            cancellationToken);
}
```

`src/Zappy.Application/Catalogue/FindProduct.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class FindProduct(IProductRepository products)
{
    public Task<Product?> Execute(string slug, CancellationToken cancellationToken) =>
        products.WithSlug(slug, cancellationToken);
}
```

`src/Zappy.Application/Catalogue/ListCategories.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class ListCategories(ICategoryRepository categories)
{
    public Task<IReadOnlyList<Category>> Execute(CancellationToken cancellationToken) =>
        categories.InCatalogueOrder(cancellationToken);
}
```

### The cart use cases

`src/Zappy.Application/Cart/CartResult.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed record CartResult(Cart Cart, int? AvailableStock, IReadOnlyList<UserError> Errors)
{
    public static CartResult Changed(Cart cart) => new(cart, null, []);

    public static CartResult Refused(Cart cart, IReadOnlyList<UserError> errors, Product? product = null) =>
        new(cart, errors.Any(error => error.Code == UserErrorCode.OutOfStock) ? product?.Stock : null, errors);
}
```

The generic result cannot carry the third field the contract asks of a cart mutation, so
the cart answers with its own record. `availableStock` is filled only when an
`OUT_OF_STOCK` refusal is in the list, which is what lets a client say how many are left
without a second query.

`src/Zappy.Application/Cart/VisitorCart.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class VisitorCart(ICartRepository carts, IClock clock)
{
    public async Task<Cart?> Find(Visitor visitor, CancellationToken cancellationToken)
    {
        if (visitor.CustomerId is not null)
        {
            return await carts.OfCustomer(visitor.CustomerId, cancellationToken);
        }

        if (visitor.AnonymousCartId is null)
        {
            return null;
        }

        var anonymousCart = await carts.WithId(visitor.AnonymousCartId, cancellationToken);
        return anonymousCart?.CustomerId is null ? anonymousCart : null;
    }

    public async Task<Cart> FindOrStartOne(Visitor visitor, CancellationToken cancellationToken)
    {
        var found = await Find(visitor, cancellationToken);
        if (found is not null)
        {
            return found;
        }

        var started = new Cart(Identifier.New(), visitor.CustomerId, clock.Now);
        await carts.Add(started, cancellationToken);
        return started;
    }

    public Cart EmptyOne(Visitor visitor) => new(Identifier.New(), visitor.CustomerId, clock.Now);
}
```

One place answers the question every cart use case starts with. A signed in customer has
their own cart, an anonymous visitor has the cart their cookie names, and a cookie that
points at a cart which already belongs to a customer is ignored, so a shared browser
cannot hand one visitor another visitor's cart.

`src/Zappy.Application/Cart/ReadCart.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class ReadCart(VisitorCart visitorCart)
{
    public async Task<Cart> Execute(Visitor visitor, CancellationToken cancellationToken) =>
        await visitorCart.Find(visitor, cancellationToken) ?? visitorCart.EmptyOne(visitor);
}
```

`src/Zappy.Application/Cart/AddToCart.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class AddToCart(
    VisitorCart visitorCart,
    IProductRepository products,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<CartResult> Execute(
        Visitor visitor,
        string productId,
        int? quantity,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var cart = await visitorCart.FindOrStartOne(visitor, token);
                var product = await products.WithId(productId, token);
                if (product is null)
                {
                    return CartResult.Refused(
                        cart,
                        [new UserError(UserErrorCode.ProductNotFound, "No product with that id exists.", "productId")]);
                }

                var outcome = cart.Add(product, quantity ?? 1, clock.Now);
                return outcome.Succeeded
                    ? CartResult.Changed(cart)
                    : CartResult.Refused(cart, outcome.Errors, product);
            },
            cancellationToken);
}
```

`src/Zappy.Application/Cart/ChangeCartLineQuantity.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class ChangeCartLineQuantity(VisitorCart visitorCart, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<CartResult> Execute(
        Visitor visitor,
        string lineId,
        int quantity,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var cart = await visitorCart.FindOrStartOne(visitor, token);
                var outcome = cart.ChangeLineQuantity(lineId, quantity, clock.Now);
                return outcome.Succeeded
                    ? CartResult.Changed(cart)
                    : CartResult.Refused(cart, outcome.Errors, cart.Lines.SingleOrDefault(line => line.Id == lineId)?.Product);
            },
            cancellationToken);
}
```

`src/Zappy.Application/Cart/RemoveCartLine.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class RemoveCartLine(VisitorCart visitorCart, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<CartResult> Execute(Visitor visitor, string lineId, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var cart = await visitorCart.FindOrStartOne(visitor, token);
                var outcome = cart.RemoveLine(lineId, clock.Now);
                return outcome.Succeeded ? CartResult.Changed(cart) : CartResult.Refused(cart, outcome.Errors);
            },
            cancellationToken);
}
```

`src/Zappy.Application/Cart/ApplyPromotionCode.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class ApplyPromotionCode(
    VisitorCart visitorCart,
    IPromotionCodeRepository promotionCodes,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<CartResult> Execute(Visitor visitor, string code, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var cart = await visitorCart.FindOrStartOne(visitor, token);
                var promotionCode = await promotionCodes.WithCode(PromotionCode.Normalise(code), token);
                if (promotionCode is null)
                {
                    return CartResult.Refused(
                        cart,
                        [new UserError(UserErrorCode.CodeUnknown, "No promotion code with that text exists.", "code")]);
                }

                var outcome = cart.Apply(promotionCode, clock.Now);
                return outcome.Succeeded ? CartResult.Changed(cart) : CartResult.Refused(cart, outcome.Errors);
            },
            cancellationToken);
}
```

`src/Zappy.Application/Cart/RemovePromotionCode.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class RemovePromotionCode(VisitorCart visitorCart, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<CartResult> Execute(Visitor visitor, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token => CartResult.Changed((await visitorCart.FindOrStartOne(visitor, token)).RemovePromotion(clock.Now)),
            cancellationToken);
}
```

### The account use cases

`src/Zappy.Application/Accounts/SessionLifetime.cs`

```csharp
namespace Zappy.Application;

public static class SessionLifetime
{
    public static readonly TimeSpan AccessToken = TimeSpan.FromMinutes(15);

    public static readonly TimeSpan RefreshToken = TimeSpan.FromDays(30);
}
```

`src/Zappy.Application/Accounts/Authentication.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed record Authentication(
    Customer Customer,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt,
    string SessionId);
```

`src/Zappy.Application/Accounts/StartSession.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class StartSession(ISessionRepository sessions, ITokenIssuer tokenIssuer, IClock clock)
{
    public async Task<Authentication> Execute(Customer customer, string device, CancellationToken cancellationToken)
    {
        var now = clock.Now;
        var session = new Session(
            Identifier.New(),
            customer.Id,
            device,
            await sessions.NextCreationOrderFor(customer.Id, cancellationToken),
            now,
            now.Add(SessionLifetime.RefreshToken));
        var refreshToken = tokenIssuer.IssueRefreshToken();
        var storedToken = new RefreshToken(
            Identifier.New(),
            session.Id,
            tokenIssuer.HashRefreshToken(refreshToken),
            now,
            session.ExpiresAt);

        await sessions.Add(session, storedToken, cancellationToken);

        var accessToken = tokenIssuer.IssueAccessToken(customer.Id, session.Id, now);
        return new Authentication(
            customer,
            accessToken.Value,
            accessToken.ExpiresAt,
            refreshToken,
            session.ExpiresAt,
            session.Id);
    }
}
```

`src/Zappy.Application/Accounts/MergeAnonymousCart.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class MergeAnonymousCart(ICartRepository carts, IClock clock)
{
    public async Task Execute(Customer customer, Visitor visitor, CancellationToken cancellationToken)
    {
        if (visitor.AnonymousCartId is null)
        {
            return;
        }

        var anonymousCart = await carts.WithId(visitor.AnonymousCartId, cancellationToken);
        if (anonymousCart is null || anonymousCart.CustomerId is not null)
        {
            return;
        }

        var customerCart = await carts.OfCustomer(customer.Id, cancellationToken);
        if (customerCart is null)
        {
            anonymousCart.BelongsTo(customer.Id, clock.Now);
            return;
        }

        customerCart.TakeOver(anonymousCart, clock.Now);
        await carts.Remove(anonymousCart, cancellationToken);
    }
}
```

`src/Zappy.Application/Accounts/MergeAnonymousWishlist.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class MergeAnonymousWishlist(IWishlistRepository wishlist)
{
    public async Task Execute(Customer customer, Visitor visitor, CancellationToken cancellationToken)
    {
        if (visitor.AnonymousCartId is null)
        {
            return;
        }

        var anonymousEntries = await wishlist.OfOwner(visitor.AnonymousCartId, cancellationToken);
        if (anonymousEntries.Count == 0)
        {
            return;
        }

        var alreadySaved = await wishlist.OfOwner(customer.Id, cancellationToken);
        foreach (var entry in anonymousEntries)
        {
            await wishlist.Remove(visitor.AnonymousCartId, entry.ProductId, cancellationToken);
            if (alreadySaved.All(saved => saved.ProductId != entry.ProductId))
            {
                await wishlist.Add(new WishlistEntry(customer.Id, entry.ProductId, entry.AddedAt), cancellationToken);
            }
        }
    }
}
```

The wishlist merge adds and never replaces. An entry the customer already had keeps its
own moment, and an entry only the browser had moves across.

`src/Zappy.Application/Accounts/RegisterCustomer.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class RegisterCustomer(
    ICustomerRepository customers,
    IPasswordHasher passwordHasher,
    IRateLimiter rateLimiter,
    StartSession startSession,
    MergeAnonymousCart mergeAnonymousCart,
    MergeAnonymousWishlist mergeAnonymousWishlist,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<Result<Authentication>> Execute(
        Visitor visitor,
        string email,
        string name,
        string password,
        string device,
        string clientAddress,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var now = clock.Now;
                if (!rateLimiter.AllowsAttempt($"register:{clientAddress}", now) ||
                    !rateLimiter.AllowsAttempt($"register:{email.Trim().ToLowerInvariant()}", now))
                {
                    return Result<Authentication>.Failure(
                        UserErrorCode.RateLimited,
                        "Too many attempts in a short time. Wait a moment and try again.");
                }

                var emailAddress = EmailAddress.Create(email);
                if (emailAddress is null)
                {
                    return Result<Authentication>.Failure(
                        UserErrorCode.EmailInvalid,
                        "The email address is not a valid address.",
                        "input.email");
                }

                var passwordErrors = PasswordPolicy.Check(password);
                if (passwordErrors.Count > 0)
                {
                    return Result<Authentication>.Failure(passwordErrors);
                }

                if (await customers.WithEmail(emailAddress, token) is not null)
                {
                    return Result<Authentication>.Failure(
                        UserErrorCode.EmailTaken,
                        "A customer with that email address is already registered.",
                        "input.email");
                }

                var customer = new Customer(
                    Identifier.New(),
                    emailAddress,
                    name.Trim(),
                    passwordHasher.Hash(password),
                    now);

                await customers.Add(customer, token);
                var authentication = await startSession.Execute(customer, device, token);
                await mergeAnonymousWishlist.Execute(customer, visitor, token);
                await mergeAnonymousCart.Execute(customer, visitor, token);
                return Result<Authentication>.Success(authentication);
            },
            cancellationToken);
}
```

`src/Zappy.Application/Accounts/LogIn.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class LogIn(
    ICustomerRepository customers,
    IPasswordHasher passwordHasher,
    IRateLimiter rateLimiter,
    StartSession startSession,
    MergeAnonymousCart mergeAnonymousCart,
    MergeAnonymousWishlist mergeAnonymousWishlist,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<Result<Authentication>> Execute(
        Visitor visitor,
        string email,
        string password,
        string device,
        string clientAddress,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var now = clock.Now;
                if (!rateLimiter.AllowsAttempt($"login:{clientAddress}", now) ||
                    !rateLimiter.AllowsAttempt($"login:{email.Trim().ToLowerInvariant()}", now))
                {
                    return Result<Authentication>.Failure(
                        UserErrorCode.RateLimited,
                        "Too many attempts in a short time. Wait a moment and try again.");
                }

                var emailAddress = EmailAddress.Create(email);
                var customer = emailAddress is null ? null : await customers.WithEmail(emailAddress, token);
                if (customer is null)
                {
                    passwordHasher.Hash(password);
                    return WrongCredentials();
                }

                if (!passwordHasher.Matches(password, customer.PasswordHash))
                {
                    return WrongCredentials();
                }

                var authentication = await startSession.Execute(customer, device, token);
                await mergeAnonymousWishlist.Execute(customer, visitor, token);
                await mergeAnonymousCart.Execute(customer, visitor, token);
                return Result<Authentication>.Success(authentication);
            },
            cancellationToken);

    private static Result<Authentication> WrongCredentials() =>
        Result<Authentication>.Failure(
            UserErrorCode.CredentialsInvalid,
            "The email address and the password together do not match a customer.");
}
```

A login that finds no customer still hashes the password it was given and throws the
answer away. That is what makes the timing the same whether the address is registered or
not, and the single `CREDENTIALS_INVALID` code is what makes the answer the same.

`src/Zappy.Application/Accounts/RefreshSession.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class RefreshSession(
    ISessionRepository sessions,
    ICustomerRepository customers,
    ITokenIssuer tokenIssuer,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<Result<Authentication>> Execute(string? presentedRefreshToken, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                if (string.IsNullOrWhiteSpace(presentedRefreshToken))
                {
                    return Unusable();
                }

                var now = clock.Now;
                var stored = await sessions.WithTokenHash(tokenIssuer.HashRefreshToken(presentedRefreshToken), token);
                if (stored is null)
                {
                    return Unusable();
                }

                var session = await sessions.WithId(stored.SessionId, token);
                if (session is null)
                {
                    return Unusable();
                }

                if (stored.WasAlreadyUsed)
                {
                    session.Revoke(now);
                    return Unusable();
                }

                if (stored.HasExpiredAt(now) || !session.IsOpenAt(now))
                {
                    return Unusable();
                }

                var customer = await customers.WithId(session.CustomerId, token);
                if (customer is null)
                {
                    return Unusable();
                }

                stored.Rotate(now);
                session.RecordUse(now);

                var replacement = tokenIssuer.IssueRefreshToken();
                await sessions.AddRefreshToken(
                    new RefreshToken(
                        Identifier.New(),
                        session.Id,
                        tokenIssuer.HashRefreshToken(replacement),
                        now,
                        session.ExpiresAt),
                    token);

                var accessToken = tokenIssuer.IssueAccessToken(customer.Id, session.Id, now);
                return Result<Authentication>.Success(new Authentication(
                    customer,
                    accessToken.Value,
                    accessToken.ExpiresAt,
                    replacement,
                    session.ExpiresAt,
                    session.Id));
            },
            cancellationToken);

    private static Result<Authentication> Unusable() =>
        Result<Authentication>.Failure(
            UserErrorCode.SessionInvalid,
            "The refresh token is unknown, expired or was already used.");
}
```

Rotation and reuse detection in one method. A token that was already used revokes the
session it belongs to, which ends every device of that family at once, and every other
failure answers the same `SESSION_INVALID` so the reply says nothing an attacker can use.

`src/Zappy.Application/Accounts/LogOut.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class LogOut(ISessionRepository sessions, ITokenIssuer tokenIssuer, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<bool> Execute(Visitor visitor, string? presentedRefreshToken, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var session = await SessionOfTheRequest(visitor, presentedRefreshToken, token);
                session?.Revoke(clock.Now);
                return true;
            },
            cancellationToken);

    private async Task<Session?> SessionOfTheRequest(
        Visitor visitor,
        string? presentedRefreshToken,
        CancellationToken cancellationToken)
    {
        if (visitor.SessionId is not null)
        {
            return await sessions.WithId(visitor.SessionId, cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(presentedRefreshToken))
        {
            return null;
        }

        var stored = await sessions.WithTokenHash(tokenIssuer.HashRefreshToken(presentedRefreshToken), cancellationToken);
        return stored is null ? null : await sessions.WithId(stored.SessionId, cancellationToken);
    }
}
```

`src/Zappy.Application/Accounts/RevokeSession.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class RevokeSession(ISessionRepository sessions, IUnitOfWork unitOfWork, IClock clock)
{
    public Task<Result<IReadOnlyList<Session>>> Execute(
        Visitor visitor,
        string sessionId,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                if (visitor.CustomerId is null)
                {
                    return Result<IReadOnlyList<Session>>.Refused(
                        [],
                        UserErrorCode.NotAuthenticated,
                        "This operation needs a signed in customer.");
                }

                var now = clock.Now;
                var session = await sessions.WithId(sessionId, token);
                if (session is null || session.CustomerId != visitor.CustomerId)
                {
                    return Result<IReadOnlyList<Session>>.Refused(
                        await sessions.OpenOfCustomer(visitor.CustomerId, now, token),
                        UserErrorCode.SessionNotFound,
                        "No session with that id belongs to the signed in customer.",
                        "sessionId");
                }

                session.Revoke(now);
                var stillOpen = await sessions.OpenOfCustomer(visitor.CustomerId, now, token);
                return Result<IReadOnlyList<Session>>.Success(
                    [.. stillOpen.Where(candidate => candidate.IsOpenAt(now))]);
            },
            cancellationToken);
}
```

`src/Zappy.Application/Accounts/ReadCustomer.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class ReadCustomer(ICustomerRepository customers)
{
    public async Task<Customer?> Execute(Visitor visitor, CancellationToken cancellationToken) =>
        visitor.CustomerId is null ? null : await customers.WithId(visitor.CustomerId, cancellationToken);
}
```

`src/Zappy.Application/Accounts/ListSessions.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class ListSessions(ISessionRepository sessions, IClock clock)
{
    public async Task<IReadOnlyList<Session>> Execute(string customerId, CancellationToken cancellationToken) =>
        await sessions.OpenOfCustomer(customerId, clock.Now, cancellationToken);
}
```

`src/Zappy.Application/Accounts/WishlistOwner.cs`

```csharp
namespace Zappy.Application;

public sealed class WishlistOwner(VisitorCart visitorCart)
{
    public async Task<string?> Find(Visitor visitor, CancellationToken cancellationToken) =>
        visitor.CustomerId ?? (await visitorCart.Find(visitor, cancellationToken))?.Id;

    public async Task<string> FindOrStartOne(Visitor visitor, CancellationToken cancellationToken) =>
        visitor.CustomerId ?? (await visitorCart.FindOrStartOne(visitor, cancellationToken)).Id;
}
```

`src/Zappy.Application/Accounts/WishlistProducts.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class WishlistProducts(IProductRepository products)
{
    public async Task<IReadOnlyList<Product>> For(
        IReadOnlyList<WishlistEntry> entries,
        CancellationToken cancellationToken)
    {
        if (entries.Count == 0)
        {
            return [];
        }

        var saved = await products.WithIds([.. entries.Select(entry => entry.ProductId)], cancellationToken);
        return
        [
            .. entries
                .OrderByDescending(entry => entry.AddedAt)
                .Select(entry => saved.SingleOrDefault(product => product.Id == entry.ProductId))
                .OfType<Product>()
        ];
    }
}
```

`src/Zappy.Application/Accounts/WishlistResult.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed record WishlistResult(
    IReadOnlyList<Product> Products,
    string? AnonymousCartId,
    IReadOnlyList<UserError> Errors)
{
    public static WishlistResult Changed(IReadOnlyList<Product> products, string? anonymousCartId) =>
        new(products, anonymousCartId, []);

    public static WishlistResult Refused(
        IReadOnlyList<Product> products,
        string? anonymousCartId,
        UserErrorCode code,
        string message,
        string? field = null) =>
        new(products, anonymousCartId, [new UserError(code, message, field)]);
}
```

`src/Zappy.Application/Accounts/ReadWishlist.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class ReadWishlist(IWishlistRepository wishlist, WishlistProducts wishlistProducts)
{
    public async Task<IReadOnlyList<Product>> Execute(string? ownerId, CancellationToken cancellationToken) =>
        ownerId is null
            ? []
            : await wishlistProducts.For(await wishlist.OfOwner(ownerId, cancellationToken), cancellationToken);
}
```

`src/Zappy.Application/Accounts/AddToWishlist.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class AddToWishlist(
    IWishlistRepository wishlist,
    IProductRepository products,
    WishlistOwner wishlistOwner,
    WishlistProducts wishlistProducts,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<WishlistResult> Execute(Visitor visitor, string productId, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var ownerId = await wishlistOwner.FindOrStartOne(visitor, token);
                var anonymousCartId = visitor.IsSignedIn ? null : ownerId;
                var entries = (await wishlist.OfOwner(ownerId, token)).ToList();

                var product = await products.WithId(productId, token);
                if (product is null)
                {
                    return WishlistResult.Refused(
                        await wishlistProducts.For(entries, token),
                        anonymousCartId,
                        UserErrorCode.ProductNotFound,
                        "No product with that id exists.",
                        "productId");
                }

                if (entries.All(entry => entry.ProductId != productId))
                {
                    var added = new WishlistEntry(ownerId, productId, clock.Now);
                    await wishlist.Add(added, token);
                    entries.Add(added);
                }

                return WishlistResult.Changed(await wishlistProducts.For(entries, token), anonymousCartId);
            },
            cancellationToken);
}
```

`src/Zappy.Application/Accounts/RemoveFromWishlist.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class RemoveFromWishlist(
    IWishlistRepository wishlist,
    WishlistOwner wishlistOwner,
    WishlistProducts wishlistProducts,
    IUnitOfWork unitOfWork)
{
    public Task<WishlistResult> Execute(Visitor visitor, string productId, CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var ownerId = await wishlistOwner.Find(visitor, token);
                if (ownerId is null)
                {
                    return WishlistResult.Changed([], null);
                }

                var anonymousCartId = visitor.IsSignedIn ? null : ownerId;
                var entries = (await wishlist.OfOwner(ownerId, token)).ToList();
                await wishlist.Remove(ownerId, productId, token);
                entries.RemoveAll(entry => entry.ProductId == productId);

                return WishlistResult.Changed(await wishlistProducts.For(entries, token), anonymousCartId);
            },
            cancellationToken);
}
```

The two wishlist mutations build their answer from the entries they know rather than
reading the table again. Entity Framework Core has not saved anything yet at that point,
so a second read would answer the list as it was before the change.

### The ordering use cases

`src/Zappy.Application/Ordering/PlaceOrder.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class PlaceOrder(
    VisitorCart visitorCart,
    IOrderRepository orders,
    IDomainEventDispatcher dispatcher,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public async Task<Result<Order>> Execute(
        Visitor visitor,
        string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        var placed = await unitOfWork.RunInOneTransaction(
            async token =>
            {
                if (visitor.CustomerId is null)
                {
                    return Result<Order>.Failure(
                        UserErrorCode.NotAuthenticated,
                        "This operation needs a signed in customer.");
                }

                var cart = await visitorCart.Find(visitor, token);
                if (cart is null || cart.IsEmpty)
                {
                    return Result<Order>.Failure(
                        UserErrorCode.CartEmpty,
                        "The cart has no lines, so there is nothing to order.");
                }

                var order = Order.Place(cart, visitor.CustomerId, clock.Now);
                if (order.Value is not null)
                {
                    await orders.Add(order.Value, token);
                }

                return order;
            },
            cancellationToken);

        if (placed.Value is not null)
        {
            await dispatcher.Dispatch(placed.Value.RaisedEvents, cancellationToken);
            placed.Value.ForgetRaisedEvents();
        }

        return placed;
    }
}
```

The transaction closes before the event is dispatched, which is the order
`docs/patterns.md` asks for. A crash in between loses the confirmation mail and the
promotion count, and that is the honest limit of an in process dispatcher. The federated
backend of `docs/federation.md` is where an outbox answers the same question properly.

`src/Zappy.Application/Ordering/ListOrders.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class ListOrders(IOrderRepository orders)
{
    public const int DefaultPageSize = 10;

    public async Task<Page<Order>> Execute(
        Visitor visitor,
        int? first,
        string? after,
        CancellationToken cancellationToken) =>
        visitor.CustomerId is null
            ? Page<Order>.Empty
            : await orders.OfCustomer(
                visitor.CustomerId,
                PageSize.Clamp(first, DefaultPageSize),
                Cursor.IdentifierIn(after),
                cancellationToken);
}
```

`src/Zappy.Application/Ordering/FindOrder.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class FindOrder(IOrderRepository orders)
{
    public async Task<Order?> Execute(Visitor visitor, string orderId, CancellationToken cancellationToken) =>
        visitor.CustomerId is null
            ? null
            : await orders.OfCustomerWithId(visitor.CustomerId, orderId, cancellationToken);
}
```

`src/Zappy.Application/Ordering/SendOrderConfirmation.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class SendOrderConfirmation(
    IOrderRepository orders,
    ICustomerRepository customers,
    IMailer mailer) : IDomainEventHandler<OrderPlaced>
{
    public async Task Handle(OrderPlaced orderPlaced, CancellationToken cancellationToken)
    {
        var customer = await customers.WithId(orderPlaced.CustomerId, cancellationToken);
        if (customer is null)
        {
            return;
        }

        var order = await orders.OfCustomerWithId(orderPlaced.CustomerId, orderPlaced.OrderId, cancellationToken);
        if (order is null)
        {
            return;
        }

        await mailer.SendOrderConfirmation(customer.Email, customer.Name, order, cancellationToken);
    }
}
```

`src/Zappy.Application/Promotions/RecordPromotionUse.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Application;

public sealed class RecordPromotionUse(IPromotionCodeRepository promotionCodes, IUnitOfWork unitOfWork)
    : IDomainEventHandler<OrderPlaced>
{
    public async Task Handle(OrderPlaced orderPlaced, CancellationToken cancellationToken)
    {
        if (orderPlaced.PromotionCode is null)
        {
            return;
        }

        await unitOfWork.RunInOneTransaction(
            async token =>
            {
                var promotionCode = await promotionCodes.WithCode(orderPlaced.PromotionCode, token);
                promotionCode?.RecordUse();
                return true;
            },
            cancellationToken);
    }
}
```

Two handlers of one event, in two modules, and the ordering module knows neither of them.

### The development use case

`src/Zappy.Application/Development/ResetSeed.cs`

```csharp
namespace Zappy.Application;

public sealed class ResetSeed(ISeedLoader seedLoader, IRateLimiter rateLimiter)
{
    public async Task<int> Execute(CancellationToken cancellationToken)
    {
        rateLimiter.Forget();
        return await seedLoader.LoadFreshSeed(cancellationToken);
    }
}
```

The reset clears the rate limiter as well. A conformance run makes a dozen login
attempts in a few seconds, and a limiter that remembered them would refuse the last of
them for a reason that has nothing to do with the scenario.

## The persistence adapter

The store keeps its data in Entity Framework Core. SQLite is the default, because the
tutorial has to run without Docker, and PostgreSQL 18 is a profile the configuration
picks.

### One model, two providers

`src/Zappy.Adapters.Persistence/ZappyDbContext.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public abstract class ZappyDbContext(DbContextOptions options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<Cart> Carts => Set<Cart>();

    public DbSet<CartLine> CartLines => Set<CartLine>();

    public DbSet<PromotionCode> PromotionCodes => Set<PromotionCode>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<OrderLine> OrderLines => Set<OrderLine>();

    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<Session> Sessions => Set<Session>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<WishlistEntry> WishlistEntries => Set<WishlistEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ZappyDbContext).Assembly);
}
```

`src/Zappy.Adapters.Persistence/SqliteZappyDbContext.cs`

```csharp
using Microsoft.EntityFrameworkCore;

namespace Zappy.Adapters.Persistence;

public sealed class SqliteZappyDbContext(DbContextOptions<SqliteZappyDbContext> options) : ZappyDbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var moments = modelBuilder.Model
            .GetEntityTypes()
            .SelectMany(entity => entity.GetProperties())
            .Where(property => property.ClrType == typeof(DateTimeOffset)
                || property.ClrType == typeof(DateTimeOffset?));

        foreach (var moment in moments)
        {
            moment.SetValueConverter(new MomentAsTicks());
        }
    }
}
```

`src/Zappy.Adapters.Persistence/PostgreSqlZappyDbContext.cs`

```csharp
using Microsoft.EntityFrameworkCore;

namespace Zappy.Adapters.Persistence;

public sealed class PostgreSqlZappyDbContext(DbContextOptions<PostgreSqlZappyDbContext> options) : ZappyDbContext(options);
```

`src/Zappy.Adapters.Persistence/MomentAsTicks.cs`

```csharp
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Zappy.Adapters.Persistence;

public sealed class MomentAsTicks : ValueConverter<DateTimeOffset, long>
{
    public MomentAsTicks()
        : base(moment => moment.UtcTicks, ticks => new DateTimeOffset(ticks, TimeSpan.Zero))
    {
    }
}
```

The two derived contexts exist because migrations are provider specific. Entity Framework
Core finds every migration in the assembly and matches it to a context, so one context
per provider gives one migration folder per provider and no collision. `ZappyDbContext`
is abstract and holds the model, and dependency injection registers it as the service
type with the provider's context as the implementation, so every repository still takes
`ZappyDbContext`.

The SQLite context adds one rule of its own. SQLite cannot sort by a `DateTimeOffset`,
and this store sorts sessions, wishlist entries and orders by a moment, so on SQLite
every moment is stored as UTC ticks. That keeps the full precision the sessions need for
their order and makes the comparison an integer comparison. PostgreSQL keeps its
`timestamptz` and needs none of it.

### The configurations

`src/Zappy.Adapters.Persistence/Configurations/CategoryConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(category => category.Id);
        builder.Property(category => category.Id).HasMaxLength(64);
        builder.Property(category => category.Name).HasMaxLength(120).IsRequired();
        builder.Property(category => category.Slug).HasMaxLength(120).IsRequired();
        builder.HasAlternateKey(category => category.Slug);
    }
}
```

`src/Zappy.Adapters.Persistence/Configurations/ProductConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(product => product.Id);
        builder.Property(product => product.Id).HasMaxLength(64);
        builder.Property(product => product.Name).HasMaxLength(240).IsRequired();
        builder.Property(product => product.Slug).HasMaxLength(240).IsRequired();
        builder.Property(product => product.Description).IsRequired();
        builder.Property(product => product.CategorySlug).HasMaxLength(120).IsRequired();
        builder.Property(product => product.ImageUrl).HasMaxLength(400);
        builder.HasIndex(product => product.Slug).IsUnique();

        builder.ComplexProperty(product => product.Price, price =>
        {
            price.Property(money => money.Amount).HasColumnName("PriceAmount");
            price.Property(money => money.Currency).HasColumnName("PriceCurrency").HasMaxLength(3);
        });

        builder
            .HasOne(product => product.Category)
            .WithMany()
            .HasForeignKey(product => product.CategorySlug)
            .HasPrincipalKey(category => category.Slug)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

`Money` is a complex property and not an owned entity. An owned entity is tracked by
reference, and an order that pays no shipping and has no discount would hand the change
tracker the same zero twice, which it refuses. A complex property is a value, which is
what `Money` is, and two equal amounts in two columns are no longer a puzzle.

`src/Zappy.Adapters.Persistence/Configurations/PromotionCodeConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class PromotionCodeConfiguration : IEntityTypeConfiguration<PromotionCode>
{
    public void Configure(EntityTypeBuilder<PromotionCode> builder)
    {
        builder.HasKey(promotionCode => promotionCode.Code);
        builder.Property(promotionCode => promotionCode.Code).HasMaxLength(64);
        builder.Property(promotionCode => promotionCode.Kind).HasConversion<string>().HasMaxLength(32);

        builder.ComplexProperty(promotionCode => promotionCode.Amount, amount =>
        {
            amount.Property(money => money.Amount).HasColumnName("AmountValue");
            amount.Property(money => money.Currency).HasColumnName("AmountCurrency").HasMaxLength(3);
        });

        builder.ComplexProperty(promotionCode => promotionCode.MinimumSubtotal, minimum =>
        {
            minimum.Property(money => money.Amount).HasColumnName("MinimumSubtotalValue");
            minimum.Property(money => money.Currency).HasColumnName("MinimumSubtotalCurrency").HasMaxLength(3);
        });
    }
}
```

`src/Zappy.Adapters.Persistence/Configurations/CartConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CartConfiguration : IEntityTypeConfiguration<Cart>
{
    public void Configure(EntityTypeBuilder<Cart> builder)
    {
        builder.HasKey(cart => cart.Id);
        builder.Property(cart => cart.Id).HasMaxLength(64);
        builder.Property(cart => cart.CustomerId).HasMaxLength(64);
        builder.Property(cart => cart.AppliedPromotionCodeText).HasMaxLength(64);
        builder.HasIndex(cart => cart.CustomerId);

        builder.HasMany(cart => cart.Lines).WithOne().HasForeignKey(line => line.CartId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(cart => cart.Lines).UsePropertyAccessMode(PropertyAccessMode.Field);

        builder
            .HasOne(cart => cart.AppliedPromotionCode)
            .WithMany()
            .HasForeignKey(cart => cart.AppliedPromotionCodeText)
            .HasPrincipalKey(promotionCode => promotionCode.Code)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

`src/Zappy.Adapters.Persistence/Configurations/CartLineConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CartLineConfiguration : IEntityTypeConfiguration<CartLine>
{
    public void Configure(EntityTypeBuilder<CartLine> builder)
    {
        builder.HasKey(line => line.Id);
        builder.Property(line => line.Id).HasMaxLength(64);
        builder.Property(line => line.CartId).HasMaxLength(64);
        builder.Property(line => line.ProductId).HasMaxLength(64);
        builder.HasIndex(line => new { line.CartId, line.ProductId }).IsUnique();

        builder
            .HasOne(line => line.Product)
            .WithMany()
            .HasForeignKey(line => line.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

`src/Zappy.Adapters.Persistence/Configurations/OrderConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(order => order.Id);
        builder.Property(order => order.Id).HasMaxLength(64);
        builder.Property(order => order.Number).HasMaxLength(64).IsRequired();
        builder.Property(order => order.CustomerId).HasMaxLength(64).IsRequired();
        builder.Property(order => order.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(order => order.PromotionCode).HasMaxLength(64);
        builder.HasIndex(order => order.Number).IsUnique();
        builder.HasIndex(order => new { order.CustomerId, order.PlacedAt });

        builder.Ignore(order => order.RaisedEvents);

        MoneyColumns(builder, order => order.Subtotal, "Subtotal");
        MoneyColumns(builder, order => order.Discount, "Discount");
        MoneyColumns(builder, order => order.Shipping, "Shipping");
        MoneyColumns(builder, order => order.Total, "Total");

        builder.HasMany(order => order.Lines).WithOne().HasForeignKey(line => line.OrderId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void MoneyColumns(
        EntityTypeBuilder<Order> builder,
        System.Linq.Expressions.Expression<Func<Order, Money?>> amount,
        string columnPrefix)
    {
        builder.ComplexProperty(amount, money =>
        {
            money.Property(value => value.Amount).HasColumnName($"{columnPrefix}Amount");
            money.Property(value => value.Currency).HasColumnName($"{columnPrefix}Currency").HasMaxLength(3);
        });
    }
}
```

`src/Zappy.Adapters.Persistence/Configurations/OrderLineConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class OrderLineConfiguration : IEntityTypeConfiguration<OrderLine>
{
    public void Configure(EntityTypeBuilder<OrderLine> builder)
    {
        builder.HasKey(line => line.Id);
        builder.Property(line => line.Id).HasMaxLength(64);
        builder.Property(line => line.OrderId).HasMaxLength(64);
        builder.Property(line => line.ProductId).HasMaxLength(64).IsRequired();
        builder.Property(line => line.ProductName).HasMaxLength(240).IsRequired();

        builder.ComplexProperty(line => line.UnitPrice, price =>
        {
            price.Property(money => money.Amount).HasColumnName("UnitPriceAmount");
            price.Property(money => money.Currency).HasColumnName("UnitPriceCurrency").HasMaxLength(3);
        });
    }
}
```

`src/Zappy.Adapters.Persistence/Configurations/CustomerConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.HasKey(customer => customer.Id);
        builder.Property(customer => customer.Id).HasMaxLength(64);
        builder.Property(customer => customer.Name).HasMaxLength(240).IsRequired();
        builder.Property(customer => customer.PasswordHash).HasMaxLength(512).IsRequired();
        builder
            .Property(customer => customer.Email)
            .HasConversion(email => email.Value, value => EmailAddress.Create(value)!)
            .HasMaxLength(320)
            .IsRequired();
        builder.HasIndex(customer => customer.Email).IsUnique();
    }
}
```

An email address is one column with a converter, because it is one value. The unique
index on it is the rule of `docs/domain.md` written where the database can hold it.

`src/Zappy.Adapters.Persistence/Configurations/SessionConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> builder)
    {
        builder.HasKey(session => session.Id);
        builder.Property(session => session.Id).HasMaxLength(64);
        builder.Property(session => session.CustomerId).HasMaxLength(64).IsRequired();
        builder.Property(session => session.Device).HasMaxLength(240).IsRequired();
        builder.HasIndex(session => new { session.CustomerId, session.CreationOrder });

        builder
            .HasOne<Customer>()
            .WithMany()
            .HasForeignKey(session => session.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

`src/Zappy.Adapters.Persistence/Configurations/RefreshTokenConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(refreshToken => refreshToken.Id);
        builder.Property(refreshToken => refreshToken.Id).HasMaxLength(64);
        builder.Property(refreshToken => refreshToken.SessionId).HasMaxLength(64).IsRequired();
        builder.Property(refreshToken => refreshToken.TokenHash).HasMaxLength(128).IsRequired();
        builder.HasIndex(refreshToken => refreshToken.TokenHash).IsUnique();

        builder
            .HasOne<Session>()
            .WithMany()
            .HasForeignKey(refreshToken => refreshToken.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

`src/Zappy.Adapters.Persistence/Configurations/WishlistEntryConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class WishlistEntryConfiguration : IEntityTypeConfiguration<WishlistEntry>
{
    public void Configure(EntityTypeBuilder<WishlistEntry> builder)
    {
        builder.HasKey(entry => new { entry.OwnerId, entry.ProductId });
        builder.Property(entry => entry.OwnerId).HasMaxLength(64);
        builder.Property(entry => entry.ProductId).HasMaxLength(64);

        builder
            .HasOne<Product>()
            .WithMany()
            .HasForeignKey(entry => entry.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

The wishlist entry has a foreign key to the product and none to the customer, because
its owner can be an anonymous cart.

### The repositories

`src/Zappy.Adapters.Persistence/Catalogue/ProductRepository.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class ProductRepository(ZappyDbContext database) : IProductRepository
{
    public async Task<Page<Product>> Matching(
        ProductSpecification specification,
        int first,
        string? afterProductId,
        CancellationToken cancellationToken)
    {
        var matching = specification.Parts().Aggregate(
            InCatalogueOrder(),
            (narrowed, part) => narrowed.Where(part));

        var totalCount = await matching.CountAsync(cancellationToken);

        var startAfter = afterProductId is null
            ? null
            : await database.Products
                .AsNoTracking()
                .Where(product => product.Id == afterProductId)
                .Select(product => (int?)product.CatalogueOrder)
                .SingleOrDefaultAsync(cancellationToken);

        if (startAfter is not null)
        {
            matching = matching.Where(product => product.CatalogueOrder > startAfter);
        }

        var page = await matching.Take(first + 1).ToListAsync(cancellationToken);
        return new Page<Product>([.. page.Take(first)], page.Count > first, totalCount);
    }

    public async Task<Product?> WithSlug(string slug, CancellationToken cancellationToken) =>
        await InCatalogueOrder().SingleOrDefaultAsync(product => product.Slug == slug, cancellationToken);

    public async Task<Product?> WithId(string id, CancellationToken cancellationToken) =>
        await database.Products
            .Include(product => product.Category)
            .SingleOrDefaultAsync(product => product.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken) =>
        ids.Count == 0
            ? []
            : await InCatalogueOrder().Where(product => ids.Contains(product.Id)).ToListAsync(cancellationToken);

    private IQueryable<Product> InCatalogueOrder() =>
        database.Products
            .AsNoTracking()
            .Include(product => product.Category)
            .OrderBy(product => product.CatalogueOrder);
}
```

The specification arrives as a list of expressions and leaves as a `WHERE` clause. The
catalogue reads are untracked, because nothing writes through them, and `WithId` is
tracked, because `AddToCart` and `Order.Place` change what it answers.

`src/Zappy.Adapters.Persistence/Catalogue/ProductCatalogueVersion.cs`

```csharp
namespace Zappy.Adapters.Persistence;

public sealed class ProductCatalogueVersion
{
    private long current;

    public long Current => Interlocked.Read(ref current);

    public void Bump() => Interlocked.Increment(ref current);
}
```

`src/Zappy.Adapters.Persistence/Catalogue/CachedProductRepository.cs`

```csharp
using Microsoft.Extensions.Caching.Memory;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CachedProductRepository(
    IProductRepository catalogue,
    IMemoryCache cache,
    ProductCatalogueVersion version) : IProductRepository
{
    private static readonly TimeSpan HowLongAPageStaysFresh = TimeSpan.FromMinutes(5);

    public Task<Page<Product>> Matching(
        ProductSpecification specification,
        int first,
        string? afterProductId,
        CancellationToken cancellationToken) =>
        Remember(
            $"products:{version.Current}:{specification}:{first}:{afterProductId}",
            () => catalogue.Matching(specification, first, afterProductId, cancellationToken));

    public Task<Product?> WithSlug(string slug, CancellationToken cancellationToken) =>
        Remember($"product:{version.Current}:{slug}", () => catalogue.WithSlug(slug, cancellationToken));

    public Task<Product?> WithId(string id, CancellationToken cancellationToken) =>
        catalogue.WithId(id, cancellationToken);

    public Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken) =>
        catalogue.WithIds(ids, cancellationToken);

    private Task<TAnswer> Remember<TAnswer>(string key, Func<Task<TAnswer>> read) =>
        cache.GetOrCreateAsync(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = HowLongAPageStaysFresh;
            return read();
        })!;
}
```

The decorator is the whole of the caching. It wraps the repository, the repository never
learns about it, and the version in the key is what keeps it honest: a placed order
changes stock, the unit of work bumps the version, and the next catalogue read misses on
purpose. The two reads a mutation uses are passed straight through, because a cached
entity is a detached entity and a mutation needs a tracked one.

`src/Zappy.Adapters.Persistence/Catalogue/CategoryRepository.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CategoryRepository(ZappyDbContext database) : ICategoryRepository
{
    public async Task<IReadOnlyList<Category>> InCatalogueOrder(CancellationToken cancellationToken) =>
        await database.Categories
            .AsNoTracking()
            .OrderBy(category => category.CatalogueOrder)
            .ToListAsync(cancellationToken);
}
```

`src/Zappy.Adapters.Persistence/Cart/CartRepository.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CartRepository(ZappyDbContext database) : ICartRepository
{
    public async Task<Cart?> WithId(string id, CancellationToken cancellationToken) =>
        await WithLinesAndPromotion().SingleOrDefaultAsync(cart => cart.Id == id, cancellationToken);

    public async Task<Cart?> OfCustomer(string customerId, CancellationToken cancellationToken) =>
        await WithLinesAndPromotion().FirstOrDefaultAsync(cart => cart.CustomerId == customerId, cancellationToken);

    public async Task Add(Cart cart, CancellationToken cancellationToken) =>
        await database.Carts.AddAsync(cart, cancellationToken);

    public Task Remove(Cart cart, CancellationToken cancellationToken)
    {
        database.Carts.Remove(cart);
        return Task.CompletedTask;
    }

    private IQueryable<Cart> WithLinesAndPromotion() =>
        database.Carts
            .Include(cart => cart.Lines)
            .ThenInclude(line => line.Product)
            .ThenInclude(product => product.Category)
            .Include(cart => cart.AppliedPromotionCode);
}
```

`src/Zappy.Adapters.Persistence/Promotions/PromotionCodeRepository.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class PromotionCodeRepository(ZappyDbContext database) : IPromotionCodeRepository
{
    public async Task<PromotionCode?> WithCode(string code, CancellationToken cancellationToken) =>
        await database.PromotionCodes.SingleOrDefaultAsync(promotionCode => promotionCode.Code == code, cancellationToken);
}
```

`src/Zappy.Adapters.Persistence/Ordering/OrderRepository.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class OrderRepository(ZappyDbContext database) : IOrderRepository
{
    public async Task Add(Order order, CancellationToken cancellationToken) =>
        await database.Orders.AddAsync(order, cancellationToken);

    public async Task<Page<Order>> OfCustomer(
        string customerId,
        int first,
        string? afterOrderId,
        CancellationToken cancellationToken)
    {
        var newestFirst = WithLines()
            .Where(order => order.CustomerId == customerId)
            .OrderByDescending(order => order.PlacedAt)
            .ThenByDescending(order => order.Id);

        var totalCount = await database.Orders.CountAsync(order => order.CustomerId == customerId, cancellationToken);

        IQueryable<Order> matching = newestFirst;
        if (afterOrderId is not null)
        {
            var startAfter = await database.Orders
                .AsNoTracking()
                .Where(order => order.Id == afterOrderId)
                .Select(order => (DateTimeOffset?)order.PlacedAt)
                .SingleOrDefaultAsync(cancellationToken);

            if (startAfter is not null)
            {
                matching = matching.Where(order => order.PlacedAt < startAfter);
            }
        }

        var page = await matching.Take(first + 1).ToListAsync(cancellationToken);
        return new Page<Order>([.. page.Take(first)], page.Count > first, totalCount);
    }

    public async Task<Order?> OfCustomerWithId(string customerId, string orderId, CancellationToken cancellationToken) =>
        await WithLines().SingleOrDefaultAsync(
            order => order.Id == orderId && order.CustomerId == customerId,
            cancellationToken);

    private IQueryable<Order> WithLines() => database.Orders.AsNoTracking().Include(order => order.Lines);
}
```

`src/Zappy.Adapters.Persistence/Accounts/CustomerRepository.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CustomerRepository(ZappyDbContext database) : ICustomerRepository
{
    public async Task<Customer?> WithEmail(EmailAddress email, CancellationToken cancellationToken) =>
        await database.Customers.SingleOrDefaultAsync(customer => customer.Email == email, cancellationToken);

    public async Task<Customer?> WithId(string id, CancellationToken cancellationToken) =>
        await database.Customers.SingleOrDefaultAsync(customer => customer.Id == id, cancellationToken);

    public async Task Add(Customer customer, CancellationToken cancellationToken) =>
        await database.Customers.AddAsync(customer, cancellationToken);
}
```

`src/Zappy.Adapters.Persistence/Accounts/SessionRepository.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class SessionRepository(ZappyDbContext database) : ISessionRepository
{
    public async Task Add(Session session, RefreshToken refreshToken, CancellationToken cancellationToken)
    {
        await database.Sessions.AddAsync(session, cancellationToken);
        await database.RefreshTokens.AddAsync(refreshToken, cancellationToken);
    }

    public async Task AddRefreshToken(RefreshToken refreshToken, CancellationToken cancellationToken) =>
        await database.RefreshTokens.AddAsync(refreshToken, cancellationToken);

    public async Task<int> NextCreationOrderFor(string customerId, CancellationToken cancellationToken)
    {
        var highest = await database.Sessions
            .Where(session => session.CustomerId == customerId)
            .Select(session => (int?)session.CreationOrder)
            .MaxAsync(cancellationToken);

        return (highest ?? 0) + 1;
    }

    public async Task<Session?> WithId(string sessionId, CancellationToken cancellationToken) =>
        await database.Sessions.SingleOrDefaultAsync(session => session.Id == sessionId, cancellationToken);

    public async Task<IReadOnlyList<Session>> OpenOfCustomer(
        string customerId,
        DateTimeOffset moment,
        CancellationToken cancellationToken) =>
        await database.Sessions
            .Where(session => session.CustomerId == customerId)
            .Where(session => session.RevokedAt == null)
            .Where(session => session.ExpiresAt > moment)
            .OrderByDescending(session => session.CreatedAt)
            .ThenByDescending(session => session.CreationOrder)
            .ToListAsync(cancellationToken);

    public async Task<RefreshToken?> WithTokenHash(string tokenHash, CancellationToken cancellationToken) =>
        await database.RefreshTokens.SingleOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);
}
```

`src/Zappy.Adapters.Persistence/Accounts/WishlistRepository.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class WishlistRepository(ZappyDbContext database) : IWishlistRepository
{
    public async Task<IReadOnlyList<WishlistEntry>> OfOwner(string ownerId, CancellationToken cancellationToken) =>
        await database.WishlistEntries
            .Where(entry => entry.OwnerId == ownerId)
            .OrderByDescending(entry => entry.AddedAt)
            .ToListAsync(cancellationToken);

    public async Task Add(WishlistEntry entry, CancellationToken cancellationToken) =>
        await database.WishlistEntries.AddAsync(entry, cancellationToken);

    public async Task Remove(string ownerId, string productId, CancellationToken cancellationToken)
    {
        var entry = await database.WishlistEntries.SingleOrDefaultAsync(
            candidate => candidate.OwnerId == ownerId && candidate.ProductId == productId,
            cancellationToken);

        if (entry is not null)
        {
            database.WishlistEntries.Remove(entry);
        }
    }
}
```

### The unit of work

`src/Zappy.Adapters.Persistence/UnitOfWork.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class UnitOfWork(ZappyDbContext database, ProductCatalogueVersion catalogueVersion) : IUnitOfWork
{
    public async Task<TResult> RunInOneTransaction<TResult>(
        Func<CancellationToken, Task<TResult>> work,
        CancellationToken cancellationToken)
    {
        if (database.Database.CurrentTransaction is not null)
        {
            return await work(cancellationToken);
        }

        TResult result;
        bool catalogueChanged;

        await using (var transaction = await database.Database.BeginTransactionAsync(cancellationToken))
        {
            result = await work(cancellationToken);
            catalogueChanged = database.ChangeTracker
                .Entries<Product>()
                .Any(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted);

            await database.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        if (catalogueChanged)
        {
            catalogueVersion.Bump();
        }

        return result;
    }
}
```

Begin, run, save, commit. The catalogue version is bumped after the commit and only when
a product actually changed, which is the one thing the cache needs to know.

### The seed

`src/Zappy.Adapters.Persistence/Seed/SeedSettings.cs`

```csharp
namespace Zappy.Adapters.Persistence;

public sealed class SeedSettings
{
    public const string Section = "Seed";

    public string? Directory { get; set; }

    public bool LoadAtStart { get; set; }
}
```

`src/Zappy.Adapters.Persistence/Seed/SeedDirectory.cs`

```csharp
namespace Zappy.Adapters.Persistence;

public static class SeedDirectory
{
    public static string Find(string? configured)
    {
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return Path.GetFullPath(configured);
        }

        var folder = new DirectoryInfo(AppContext.BaseDirectory);
        while (folder is not null)
        {
            var candidate = Path.Combine(folder.FullName, "contract", "seed");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }

            folder = folder.Parent;
        }

        throw new DirectoryNotFoundException(
            "The seed folder contract/seed was not found above the running assembly. Set Seed:Directory in configuration.");
    }
}
```

`src/Zappy.Adapters.Persistence/Seed/SeedFiles.cs`

```csharp
namespace Zappy.Adapters.Persistence;

public sealed record SeedMoney(int Amount, string Currency);

public sealed record SeedCategory(string Id, string Name, string Slug);

public sealed record SeedProduct(
    string Id,
    string Name,
    string Slug,
    string Description,
    SeedMoney Price,
    string CategorySlug,
    int Stock,
    string? ImageUrl);

public sealed record SeedPromotionCode(
    string Code,
    string Kind,
    int? Percentage,
    SeedMoney? Amount,
    SeedMoney? MinimumSubtotal,
    DateTimeOffset ValidFrom,
    DateTimeOffset ValidUntil,
    int? UsageLimit,
    int TimesUsed);

public sealed record SeedCustomer(
    string Id,
    string Email,
    string Name,
    string Password,
    DateTimeOffset CreatedAt,
    IReadOnlyList<string> Wishlist);
```

`src/Zappy.Adapters.Persistence/Seed/SeedLoader.cs`

```csharp
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class SeedLoader(
    ZappyDbContext database,
    IPasswordHasher passwordHasher,
    ProductCatalogueVersion catalogueVersion,
    SeedSettings settings) : ISeedLoader
{
    private static readonly JsonSerializerOptions ReadingOptions = new(JsonSerializerDefaults.Web);

    public async Task<int> LoadFreshSeed(CancellationToken cancellationToken)
    {
        await EmptyTheStore(cancellationToken);

        var folder = SeedDirectory.Find(settings.Directory);
        var categories = await Read<SeedCategory>(Path.Combine(folder, "categories.json"), cancellationToken);
        var products = await Read<SeedProduct>(Path.Combine(folder, "products.json"), cancellationToken);
        var promotionCodes = await Read<SeedPromotionCode>(Path.Combine(folder, "promotion-codes.json"), cancellationToken);
        var customers = await Read<SeedCustomer>(Path.Combine(folder, "customers.json"), cancellationToken);

        for (var position = 0; position < categories.Count; position += 1)
        {
            var category = categories[position];
            database.Categories.Add(new Category(category.Id, category.Name, category.Slug, position + 1));
        }

        for (var position = 0; position < products.Count; position += 1)
        {
            var product = products[position];
            database.Products.Add(new Product(
                product.Id,
                product.Name,
                product.Slug,
                product.Description,
                new Money(product.Price.Amount, product.Price.Currency),
                product.CategorySlug,
                product.Stock,
                product.ImageUrl,
                position + 1));
        }

        foreach (var promotionCode in promotionCodes)
        {
            database.PromotionCodes.Add(new PromotionCode(
                promotionCode.Code,
                KindOf(promotionCode.Kind),
                promotionCode.Percentage,
                MoneyOf(promotionCode.Amount),
                MoneyOf(promotionCode.MinimumSubtotal),
                promotionCode.ValidFrom,
                promotionCode.ValidUntil,
                promotionCode.UsageLimit,
                promotionCode.TimesUsed));
        }

        foreach (var customer in customers)
        {
            var email = EmailAddress.Create(customer.Email)
                ?? throw new InvalidOperationException($"The seed customer {customer.Id} has an invalid email address.");

            database.Customers.Add(new Customer(
                customer.Id,
                email,
                customer.Name,
                passwordHasher.Hash(customer.Password),
                customer.CreatedAt));

            foreach (var productId in customer.Wishlist)
            {
                database.WishlistEntries.Add(new WishlistEntry(customer.Id, productId, customer.CreatedAt));
            }
        }

        await database.SaveChangesAsync(cancellationToken);
        catalogueVersion.Bump();
        return products.Count;
    }

    private async Task EmptyTheStore(CancellationToken cancellationToken)
    {
        await database.OrderLines.ExecuteDeleteAsync(cancellationToken);
        await database.Orders.ExecuteDeleteAsync(cancellationToken);
        await database.CartLines.ExecuteDeleteAsync(cancellationToken);
        await database.Carts.ExecuteDeleteAsync(cancellationToken);
        await database.WishlistEntries.ExecuteDeleteAsync(cancellationToken);
        await database.RefreshTokens.ExecuteDeleteAsync(cancellationToken);
        await database.Sessions.ExecuteDeleteAsync(cancellationToken);
        await database.Customers.ExecuteDeleteAsync(cancellationToken);
        await database.Products.ExecuteDeleteAsync(cancellationToken);
        await database.PromotionCodes.ExecuteDeleteAsync(cancellationToken);
        await database.Categories.ExecuteDeleteAsync(cancellationToken);
        database.ChangeTracker.Clear();
    }

    private static async Task<IReadOnlyList<TSeed>> Read<TSeed>(string path, CancellationToken cancellationToken)
    {
        await using var file = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<List<TSeed>>(file, ReadingOptions, cancellationToken)
            ?? throw new InvalidOperationException($"The seed file {path} holds no list.");
    }

    private static Money? MoneyOf(SeedMoney? money) => money is null ? null : new Money(money.Amount, money.Currency);

    private static PromotionKind KindOf(string kind) => kind switch
    {
        "PERCENTAGE" => PromotionKind.Percentage,
        "FIXED_AMOUNT" => PromotionKind.FixedAmount,
        "FREE_SHIPPING" => PromotionKind.FreeShipping,
        _ => throw new InvalidOperationException($"The seed names the unknown promotion kind {kind}.")
    };
}
```

The loader empties every table in foreign key order, reads the four files of
`contract/seed/`, and hashes the customer's password with the same Argon2id hasher that
registration uses. The clear password of `contract/seed/customers.json` exists in that
file and nowhere else.

### Configuration and wiring

`src/Zappy.Adapters.Persistence/DatabaseSettings.cs`

```csharp
namespace Zappy.Adapters.Persistence;

public sealed class DatabaseSettings
{
    public const string Section = "Database";

    public const string Sqlite = "Sqlite";

    public const string PostgreSql = "PostgreSql";

    public string Provider { get; set; } = Sqlite;

    public string ConnectionString { get; set; } = "Data Source=zappy-mart.db";

    public bool RunsOnPostgreSql => string.Equals(Provider, PostgreSql, StringComparison.OrdinalIgnoreCase);
}
```

`src/Zappy.Adapters.Persistence/PersistenceServices.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Zappy.Application;

namespace Zappy.Adapters.Persistence;

public static class PersistenceServices
{
    public static IServiceCollection AddZappyPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var database = new DatabaseSettings();
        configuration.GetSection(DatabaseSettings.Section).Bind(database);

        var seed = new SeedSettings();
        configuration.GetSection(SeedSettings.Section).Bind(seed);

        services.AddSingleton(database);
        services.AddSingleton(seed);
        services.AddSingleton<ProductCatalogueVersion>();
        services.AddMemoryCache();

        if (database.RunsOnPostgreSql)
        {
            services.AddDbContext<ZappyDbContext, PostgreSqlZappyDbContext>(
                options => options.UseNpgsql(database.ConnectionString));
        }
        else
        {
            services.AddDbContext<ZappyDbContext, SqliteZappyDbContext>(
                options => options.UseSqlite(database.ConnectionString));
        }

        services.AddScoped<ProductRepository>();
        services.AddScoped<IProductRepository>(provider => new CachedProductRepository(
            provider.GetRequiredService<ProductRepository>(),
            provider.GetRequiredService<IMemoryCache>(),
            provider.GetRequiredService<ProductCatalogueVersion>()));

        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ICartRepository, CartRepository>();
        services.AddScoped<IPromotionCodeRepository, PromotionCodeRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();
        services.AddScoped<IWishlistRepository, WishlistRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ISeedLoader, SeedLoader>();

        return services;
    }
}
```

The decorator is registered by hand, in four lines, without a library. That is the whole
of it: register the real repository as itself, and register the port as a function that
wraps it.

### Design time and migrations

`src/Zappy.Adapters.Persistence/SqliteDesignTimeFactory.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Zappy.Adapters.Persistence;

public sealed class SqliteDesignTimeFactory : IDesignTimeDbContextFactory<SqliteZappyDbContext>
{
    public SqliteZappyDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<SqliteZappyDbContext>()
            .UseSqlite("Data Source=design-time.db")
            .Options);
}
```

`src/Zappy.Adapters.Persistence/PostgreSqlDesignTimeFactory.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Zappy.Adapters.Persistence;

public sealed class PostgreSqlDesignTimeFactory : IDesignTimeDbContextFactory<PostgreSqlZappyDbContext>
{
    public PostgreSqlZappyDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<PostgreSqlZappyDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=zappy;Username=zappy;Password=zappy")
            .Options);
}
```

The two factories let `dotnet ef` build a context without starting the application, so
the migration for either provider is one command:

```bash
dotnet dotnet-ef migrations add TheStore \
  --project src/Zappy.Adapters.Persistence \
  --context SqliteZappyDbContext \
  --output-dir Migrations/Sqlite

dotnet dotnet-ef migrations add TheStore \
  --project src/Zappy.Adapters.Persistence \
  --context PostgreSqlZappyDbContext \
  --output-dir Migrations/PostgreSql
```

Both migrations are in the repository under
`src/Zappy.Adapters.Persistence/Migrations/`, generated by the tool and not written by
hand, which is why they are the only source files this walk through does not print, next
to `Zappy.sln` itself. The host applies them at start.

## The security adapter

`src/Zappy.Adapters.Security/SecuritySettings.cs`

```csharp
namespace Zappy.Adapters.Security;

public sealed class SecuritySettings
{
    public const string Section = "Security";

    public string Issuer { get; set; } = "https://zappy-mart.localhost";

    public string Audience { get; set; } = "zappy-mart";

    public string? PrivateKeyPem { get; set; }

    public int Argon2MemoryKibibytes { get; set; } = 19456;

    public int Argon2Iterations { get; set; } = 2;

    public int Argon2Parallelism { get; set; } = 1;

    public int LoginAttemptsAllowed { get; set; } = 20;

    public int LoginAttemptWindowMinutes { get; set; } = 5;
}
```

`src/Zappy.Adapters.Security/SigningKeys.cs`

```csharp
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace Zappy.Adapters.Security;

public sealed class SigningKeys : IDisposable
{
    private readonly RSA rsa = RSA.Create(2048);

    public SigningKeys(SecuritySettings settings)
    {
        if (!string.IsNullOrWhiteSpace(settings.PrivateKeyPem))
        {
            rsa.ImportFromPem(settings.PrivateKeyPem);
        }

        Key = new RsaSecurityKey(rsa)
        {
            KeyId = Convert.ToHexString(SHA256.HashData(rsa.ExportRSAPublicKey()))[..16]
        };
    }

    public RsaSecurityKey Key { get; }

    public string PublicKeyPem => rsa.ExportSubjectPublicKeyInfoPem();

    public void Dispose() => rsa.Dispose();
}
```

An RSA key pair is generated at start when configuration carries no private key, which
is what the development profile does. Production sets `Security:PrivateKeyPem` and every
instance then verifies what the others signed.

`src/Zappy.Adapters.Security/JwtTokenIssuer.cs`

```csharp
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Zappy.Application;

namespace Zappy.Adapters.Security;

public sealed class JwtTokenIssuer(SigningKeys keys, SecuritySettings settings) : ITokenIssuer
{
    private static readonly JsonWebTokenHandler Handler = new();

    public AccessToken IssueAccessToken(string customerId, string sessionId, DateTimeOffset moment)
    {
        var issuedAt = WholeSeconds(moment);
        var expiresAt = WholeSeconds(moment.Add(SessionLifetime.AccessToken));

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            IssuedAt = issuedAt.UtcDateTime,
            NotBefore = issuedAt.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            Claims = new Dictionary<string, object>
            {
                ["sub"] = customerId,
                ["sid"] = sessionId
            },
            SigningCredentials = new SigningCredentials(keys.Key, SecurityAlgorithms.RsaSha256)
        };

        return new AccessToken(Handler.CreateToken(descriptor), expiresAt);
    }

    public string IssueRefreshToken() => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));

    public string HashRefreshToken(string refreshToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken))).ToLowerInvariant();

    private static DateTimeOffset WholeSeconds(DateTimeOffset moment) =>
        new(moment.Ticks - (moment.Ticks % TimeSpan.TicksPerSecond), moment.Offset);
}
```

The access token is an RS256 JSON Web Token with the customer id, the session id and
fifteen minutes of life, and nothing personal. The refresh token is 32 random bytes and
carries no meaning at all, so only its hash is stored.

`src/Zappy.Adapters.Security/Argon2idPasswordHasher.cs`

```csharp
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;
using Zappy.Application;

namespace Zappy.Adapters.Security;

public sealed class Argon2idPasswordHasher(SecuritySettings settings) : IPasswordHasher
{
    private const int SaltLength = 16;

    private const int HashLength = 32;

    private const string Algorithm = "argon2id";

    private const string Version = "v=19";

    private const char Separator = '$';

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltLength);
        var hash = Compute(
            password,
            salt,
            settings.Argon2MemoryKibibytes,
            settings.Argon2Iterations,
            settings.Argon2Parallelism);

        var parameters = string.Format(
            CultureInfo.InvariantCulture,
            "m={0},t={1},p={2}",
            settings.Argon2MemoryKibibytes,
            settings.Argon2Iterations,
            settings.Argon2Parallelism);

        var salted = Convert.ToBase64String(salt);
        var hashed = Convert.ToBase64String(hash);
        return string.Join(Separator, string.Empty, Algorithm, Version, parameters, salted, hashed);
    }

    public bool Matches(string password, string hash)
    {
        var parts = hash.Split(Separator, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 5 || parts[0] != Algorithm)
        {
            return false;
        }

        var chosen = parts[2].Split(',');
        if (chosen.Length != 3)
        {
            return false;
        }

        var memoryKibibytes = ValueOf(chosen[0]);
        var iterations = ValueOf(chosen[1]);
        var parallelism = ValueOf(chosen[2]);
        if (memoryKibibytes is null || iterations is null || parallelism is null)
        {
            return false;
        }

        var salt = Convert.FromBase64String(parts[3]);
        var stored = Convert.FromBase64String(parts[4]);
        var computed = Compute(password, salt, memoryKibibytes.Value, iterations.Value, parallelism.Value);
        return CryptographicOperations.FixedTimeEquals(stored, computed);
    }

    private static int? ValueOf(string setting) =>
        int.TryParse(setting.AsSpan(setting.IndexOf('=') + 1), CultureInfo.InvariantCulture, out var value)
            ? value
            : null;

    private static byte[] Compute(string password, byte[] salt, int memoryKibibytes, int iterations, int parallelism)
    {
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            MemorySize = memoryKibibytes,
            Iterations = iterations,
            DegreeOfParallelism = parallelism
        };

        return argon2.GetBytes(HashLength);
    }
}
```

The hash is a standard Argon2 encoded string, so it carries the parameters it was made
with. Raising the memory cost tomorrow leaves every hash of today verifiable, which is
what makes the parameters a configuration value and not a migration.

`src/Zappy.Adapters.Security/InMemoryRateLimiter.cs`

```csharp
using Zappy.Application;

namespace Zappy.Adapters.Security;

public sealed class InMemoryRateLimiter(SecuritySettings settings) : IRateLimiter
{
    private readonly Dictionary<string, List<DateTimeOffset>> attemptsByKey = [];

    private readonly Lock guard = new();

    public bool AllowsAttempt(string key, DateTimeOffset moment)
    {
        var window = TimeSpan.FromMinutes(settings.LoginAttemptWindowMinutes);

        lock (guard)
        {
            if (!attemptsByKey.TryGetValue(key, out var attempts))
            {
                attempts = [];
                attemptsByKey[key] = attempts;
            }

            attempts.RemoveAll(attempt => moment - attempt > window);
            if (attempts.Count >= settings.LoginAttemptsAllowed)
            {
                return false;
            }

            attempts.Add(moment);
            return true;
        }
    }

    public void Forget()
    {
        lock (guard)
        {
            attemptsByKey.Clear();
        }
    }
}
```

A sliding window per key, in memory, keyed by address and by email address. One process
holds it, which is the honest limit: a second instance would need a shared store, and
the federated backend is where that conversation happens.

`src/Zappy.Adapters.Security/SecurityServices.cs`

```csharp
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Zappy.Application;

namespace Zappy.Adapters.Security;

public static class SecurityServices
{
    public static IServiceCollection AddZappySecurity(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = new SecuritySettings();
        configuration.GetSection(SecuritySettings.Section).Bind(settings);

        services.AddSingleton(settings);
        services.AddSingleton<SigningKeys>();
        services.AddSingleton<ITokenIssuer, JwtTokenIssuer>();
        services.AddSingleton<IPasswordHasher, Argon2idPasswordHasher>();
        services.AddSingleton<IRateLimiter, InMemoryRateLimiter>();

        return services;
    }
}
```

## The mail adapter

`src/Zappy.Adapters.Mail/ConsoleMailer.cs`

```csharp
using System.Globalization;
using System.Text;
using Microsoft.Extensions.Logging;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Mail;

public sealed class ConsoleMailer(ILogger<ConsoleMailer> log) : IMailer
{
    public Task SendOrderConfirmation(
        EmailAddress recipient,
        string customerName,
        Order order,
        CancellationToken cancellationToken)
    {
        log.LogInformation(
            "Order confirmation for {OrderNumber} goes to a customer of Zappy Mart:\n{Body}",
            order.Number,
            BodyFor(customerName, order));

        return Task.CompletedTask;
    }

    private static string BodyFor(string customerName, Order order)
    {
        var body = new StringBuilder();
        body.AppendLine(CultureInfo.InvariantCulture, $"Dear {customerName},");
        body.AppendLine();
        body.AppendLine(CultureInfo.InvariantCulture, $"Thank you for order {order.Number}.");
        body.AppendLine();

        foreach (var line in order.Lines)
        {
            body.AppendLine(CultureInfo.InvariantCulture, $"  {line.Quantity} x {line.ProductName} at {line.UnitPrice} is {line.LineTotal}");
        }

        body.AppendLine();
        body.AppendLine(CultureInfo.InvariantCulture, $"  Subtotal {order.Subtotal}");
        body.AppendLine(CultureInfo.InvariantCulture, $"  Shipping {order.Shipping}");
        body.AppendLine(CultureInfo.InvariantCulture, $"  Discount {order.Discount}");
        body.AppendLine(CultureInfo.InvariantCulture, $"  Total {order.Total}");
        body.AppendLine();
        body.Append("Zappy Mart");
        return body.ToString();
    }
}
```

`src/Zappy.Adapters.Mail/MailServices.cs`

```csharp
using Microsoft.Extensions.DependencyInjection;
using Zappy.Application;

namespace Zappy.Adapters.Mail;

public static class MailServices
{
    public static IServiceCollection AddZappyMail(this IServiceCollection services)
    {
        services.AddScoped<IMailer, ConsoleMailer>();
        return services;
    }
}
```

The confirmation goes to the log. The port is what matters: swapping the console for a
real transport is one class and one registration, and no use case changes.

## The GraphQL adapter

This is the inbound adapter. It binds the domain types to the schema, it maps every
result to the payload the contract describes, it reads the bearer token and the two
cookies, and it refuses a mutation whose `Origin` header the store does not know.

### Configuration and the request

`src/Zappy.Adapters.GraphQL/GraphQLSettings.cs`

```csharp
namespace Zappy.Adapters.GraphQL;

public sealed class GraphQLSettings
{
    public const string Section = "GraphQL";

    public string Path { get; set; } = "/graphql";

    public string[] AllowedOrigins { get; set; } =
    [
        "http://localhost:5173",
        "http://localhost:3001",
        "http://localhost:4200"
    ];

    public bool ExposeResetSeed { get; set; }

    public bool IncludeExceptionDetails { get; set; }
}
```

`src/Zappy.Adapters.GraphQL/Requests/Cookies.cs`

```csharp
namespace Zappy.Adapters.GraphQL;

public static class Cookies
{
    public const string Refresh = "zappy_refresh";

    public const string Cart = "zappy_cart";
}
```

`src/Zappy.Adapters.GraphQL/Requests/VisitorOfTheRequest.cs`

```csharp
using Microsoft.AspNetCore.Http;
using Zappy.Application;

namespace Zappy.Adapters.GraphQL;

public sealed class VisitorOfTheRequest(IHttpContextAccessor httpContextAccessor, GraphQLSettings settings)
{
    private static readonly TimeSpan HowLongACartCookieLives = TimeSpan.FromDays(30);

    private const string SessionStartedByThisRequest = "zappy.session-started-by-this-request";

    public Visitor Current
    {
        get
        {
            var context = Context;
            return new Visitor(
                context.User.FindFirst("sub")?.Value,
                SessionOf(context) ?? context.User.FindFirst("sid")?.Value,
                context.Request.Cookies[Cookies.Cart]);
        }
    }

    public string? PresentedRefreshToken => Context.Request.Cookies[Cookies.Refresh];

    public string ClientAddress => Context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private HttpContext Context => httpContextAccessor.HttpContext
        ?? throw new InvalidOperationException("A Zappy Mart resolver ran outside an HTTP request.");

    public string DeviceFor(string? asked)
    {
        if (!string.IsNullOrWhiteSpace(asked))
        {
            return asked.Trim();
        }

        var userAgent = Context.Request.Headers.UserAgent.ToString();
        return string.IsNullOrWhiteSpace(userAgent) ? "Unknown device" : userAgent;
    }

    public void RememberSession(string sessionId) => Context.Items[SessionStartedByThisRequest] = sessionId;

    private static string? SessionOf(HttpContext context) =>
        context.Items.TryGetValue(SessionStartedByThisRequest, out var started) ? started as string : null;

    public void RememberCart(string cartId)
    {
        if (Context.Request.Cookies[Cookies.Cart] == cartId)
        {
            return;
        }

        Context.Response.Cookies.Append(Cookies.Cart, cartId, new CookieOptions
        {
            HttpOnly = true,
            Secure = Context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.Add(HowLongACartCookieLives)
        });
    }

    public void ForgetCart() =>
        Context.Response.Cookies.Delete(Cookies.Cart, new CookieOptions
        {
            HttpOnly = true,
            Secure = Context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });

    public void RememberRefreshToken(string refreshToken, DateTimeOffset expiresAt) =>
        Context.Response.Cookies.Append(Cookies.Refresh, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = Context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = settings.Path,
            Expires = expiresAt
        });

    public void ForgetRefreshToken() =>
        Context.Response.Cookies.Delete(Cookies.Refresh, new CookieOptions
        {
            HttpOnly = true,
            Secure = Context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = settings.Path
        });
}
```

Everything the request knows about the visitor sits here. `Secure` follows the scheme,
so the cookies are Secure over HTTPS and a plain `http://localhost` still works for the
tutorial and the conformance run. The refresh cookie's path is the graph itself, which
is as narrow as `docs/security.md` can be in an API with one endpoint.

`RememberSession` writes into `HttpContext.Items` rather than a field. Hot Chocolate runs
a mutation in its own dependency injection scope, so the object the mutation used is not
the object the `Session.current` resolver uses, and the HTTP context is the one thing
both of them share. Without it, the session a login just opened answers `current: false`
in the very answer that opened it.

### The Origin check

`src/Zappy.Adapters.GraphQL/Origin/OriginCheck.cs`

```csharp
using System.Text;
using System.Text.Json;
using HotChocolate.Language;
using Microsoft.AspNetCore.Http;

namespace Zappy.Adapters.GraphQL;

public sealed class OriginCheck(RequestDelegate next, GraphQLSettings settings)
{
    private const string Refusal =
        "{\"errors\":[{\"message\":\"A mutation needs an Origin header that names an allowed origin.\","
        + "\"extensions\":{\"code\":\"ORIGIN_NOT_ALLOWED\"}}]}";

    public async Task InvokeAsync(HttpContext context)
    {
        if (!IsGraphQLPost(context))
        {
            await next(context);
            return;
        }

        context.Request.EnableBuffering();
        var carriesAMutation = await CarriesAMutation(context.Request);
        context.Request.Body.Position = 0;

        if (carriesAMutation && !OriginIsAllowed(context))
        {
            context.Response.StatusCode = StatusCodes.Status200OK;
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync(Refusal, Encoding.UTF8, context.RequestAborted);
            return;
        }

        await next(context);
    }

    private bool IsGraphQLPost(HttpContext context) =>
        HttpMethods.IsPost(context.Request.Method)
        && context.Request.Path.Equals(settings.Path, StringComparison.OrdinalIgnoreCase)
        && context.Request.ContentType is not null
        && context.Request.ContentType.Contains("json", StringComparison.OrdinalIgnoreCase);

    private bool OriginIsAllowed(HttpContext context)
    {
        var origin = context.Request.Headers.Origin.ToString().TrimEnd('/');
        return !string.IsNullOrWhiteSpace(origin)
            && settings.AllowedOrigins.Any(allowed =>
                string.Equals(allowed.TrimEnd('/'), origin, StringComparison.OrdinalIgnoreCase));
    }

    private static async Task<bool> CarriesAMutation(HttpRequest request)
    {
        try
        {
            using var body = await JsonDocument.ParseAsync(request.Body, default, request.HttpContext.RequestAborted);
            return body.RootElement.ValueKind switch
            {
                JsonValueKind.Array => body.RootElement.EnumerateArray().Any(HasMutation),
                JsonValueKind.Object => HasMutation(body.RootElement),
                _ => false
            };
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool HasMutation(JsonElement request)
    {
        if (!request.TryGetProperty("query", out var query) || query.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        var asked = request.TryGetProperty("operationName", out var operationName)
            && operationName.ValueKind == JsonValueKind.String
                ? operationName.GetString()
                : null;

        try
        {
            var document = Utf8GraphQLParser.Parse(query.GetString() ?? string.Empty);
            return document.Definitions
                .OfType<OperationDefinitionNode>()
                .Where(operation => asked is null || operation.Name?.Value == asked)
                .Any(operation => operation.Operation == OperationType.Mutation);
        }
        catch (SyntaxException)
        {
            return false;
        }
    }
}
```

The check sits in front of the graph, reads the document, and refuses before a resolver
runs when the operation is a mutation and the `Origin` header is missing or foreign. The
answer is a GraphQL error with no data, because no change to the input puts it right.
Queries pass without an `Origin` header, which is what lets a server side renderer and
`curl` read the catalogue.

### The types

`src/Zappy.Adapters.GraphQL/Types/MoneyType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class MoneyType : ObjectType<Money>
{
    protected override void Configure(IObjectTypeDescriptor<Money> descriptor)
    {
        descriptor.Name("Money");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(money => money.Amount).Type<NonNullType<IntType>>();
        descriptor.Field(money => money.Currency).Type<NonNullType<StringType>>();
    }
}
```

Every exposed domain type gets an explicit descriptor with `BindFieldsExplicitly`. Hot
Chocolate would otherwise infer a field for every public member, and `Money.Plus` is not
part of the contract. Explicit binding is a few more lines and an exact schema.

`src/Zappy.Adapters.GraphQL/Types/CategoryType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CategoryType : ObjectType<Category>
{
    protected override void Configure(IObjectTypeDescriptor<Category> descriptor)
    {
        descriptor.Name("Category");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(category => category.Id).Type<NonNullType<IdType>>();
        descriptor.Field(category => category.Name).Type<NonNullType<StringType>>();
        descriptor.Field(category => category.Slug).Type<NonNullType<StringType>>();
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/ProductType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class ProductType : ObjectType<Product>
{
    protected override void Configure(IObjectTypeDescriptor<Product> descriptor)
    {
        descriptor.Name("Product");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(product => product.Id).Type<NonNullType<IdType>>();
        descriptor.Field(product => product.Name).Type<NonNullType<StringType>>();
        descriptor.Field(product => product.Slug).Type<NonNullType<StringType>>();
        descriptor.Field(product => product.Description).Type<NonNullType<StringType>>();
        descriptor.Field(product => product.Price).Type<NonNullType<MoneyType>>();
        descriptor.Field(product => product.Category).Type<NonNullType<CategoryType>>();
        descriptor.Field(product => product.Stock).Type<NonNullType<IntType>>();
        descriptor.Field(product => product.ImageUrl).Type<StringType>();
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/CartLineType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CartLineType : ObjectType<CartLine>
{
    protected override void Configure(IObjectTypeDescriptor<CartLine> descriptor)
    {
        descriptor.Name("CartLine");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(line => line.Id).Type<NonNullType<IdType>>();
        descriptor.Field(line => line.Product).Type<NonNullType<ProductType>>();
        descriptor.Field(line => line.Quantity).Type<NonNullType<IntType>>();
        descriptor.Field(line => line.LineTotal).Type<NonNullType<MoneyType>>();
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/AppliedPromotionType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class AppliedPromotionType : ObjectType<AppliedPromotion>
{
    protected override void Configure(IObjectTypeDescriptor<AppliedPromotion> descriptor)
    {
        descriptor.Name("AppliedPromotion");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(promotion => promotion.Code).Type<NonNullType<StringType>>();
        descriptor.Field(promotion => promotion.Kind).Type<NonNullType<EnumType<PromotionKind>>>();
        descriptor.Field(promotion => promotion.Discount).Type<NonNullType<MoneyType>>();
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/CartType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CartType : ObjectType<Cart>
{
    protected override void Configure(IObjectTypeDescriptor<Cart> descriptor)
    {
        descriptor.Name("Cart");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(cart => cart.Id).Type<NonNullType<IdType>>();
        descriptor.Field(cart => cart.Lines).Type<NonNullType<ListType<NonNullType<CartLineType>>>>();
        descriptor.Field(cart => cart.Promotion).Type<AppliedPromotionType>();
        descriptor.Field("subtotal").Type<NonNullType<MoneyType>>().Resolve(context => context.Parent<Cart>().Totals.Subtotal);
        descriptor.Field("shipping").Type<NonNullType<MoneyType>>().Resolve(context => context.Parent<Cart>().Totals.Shipping);
        descriptor.Field("total").Type<NonNullType<MoneyType>>().Resolve(context => context.Parent<Cart>().Totals.Total);
        descriptor.Field(cart => cart.UpdatedAt).Type<NonNullType<DateTimeType>>();
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/OrderLineType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderLineType : ObjectType<OrderLine>
{
    protected override void Configure(IObjectTypeDescriptor<OrderLine> descriptor)
    {
        descriptor.Name("OrderLine");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(line => line.ProductName).Type<NonNullType<StringType>>();
        descriptor.Field(line => line.UnitPrice).Type<NonNullType<MoneyType>>();
        descriptor.Field(line => line.Quantity).Type<NonNullType<IntType>>();
        descriptor.Field(line => line.LineTotal).Type<NonNullType<MoneyType>>();
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/OrderType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderType : ObjectType<Order>
{
    protected override void Configure(IObjectTypeDescriptor<Order> descriptor)
    {
        descriptor.Name("Order");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(order => order.Id).Type<NonNullType<IdType>>();
        descriptor.Field(order => order.Number).Type<NonNullType<StringType>>();
        descriptor.Field(order => order.Status).Type<NonNullType<EnumType<OrderStatus>>>();
        descriptor.Field(order => order.Lines).Type<NonNullType<ListType<NonNullType<OrderLineType>>>>();
        descriptor.Field(order => order.PromotionCode).Type<StringType>();
        descriptor.Field(order => order.Subtotal).Type<NonNullType<MoneyType>>();
        descriptor.Field(order => order.Discount).Type<NonNullType<MoneyType>>();
        descriptor.Field(order => order.Shipping).Type<NonNullType<MoneyType>>();
        descriptor.Field(order => order.Total).Type<NonNullType<MoneyType>>();
        descriptor.Field(order => order.PlacedAt).Type<NonNullType<DateTimeType>>();
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/SessionType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class SessionType : ObjectType<Session>
{
    protected override void Configure(IObjectTypeDescriptor<Session> descriptor)
    {
        descriptor.Name("Session");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(session => session.Id).Type<NonNullType<IdType>>();
        descriptor.Field(session => session.Device).Type<NonNullType<StringType>>();
        descriptor.Field(session => session.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor.Field(session => session.LastUsedAt).Type<NonNullType<DateTimeType>>();
        descriptor
            .Field("current")
            .Type<NonNullType<BooleanType>>()
            .Resolve(context =>
                context.Service<VisitorOfTheRequest>().Current.SessionId == context.Parent<Session>().Id);
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/CustomerType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CustomerType : ObjectType<Customer>
{
    protected override void Configure(IObjectTypeDescriptor<Customer> descriptor)
    {
        descriptor.Name("Customer");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(customer => customer.Id).Type<NonNullType<IdType>>();
        descriptor
            .Field("email")
            .Type<NonNullType<StringType>>()
            .Resolve(context => context.Parent<Customer>().Email.Value);
        descriptor.Field(customer => customer.Name).Type<NonNullType<StringType>>();
        descriptor.Field(customer => customer.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor
            .Field("sessions")
            .Type<NonNullType<ListType<NonNullType<SessionType>>>>()
            .Resolve(context => context
                .Service<ListSessions>()
                .Execute(context.Parent<Customer>().Id, context.RequestAborted));
        descriptor
            .Field("wishlist")
            .Type<NonNullType<ListType<NonNullType<ProductType>>>>()
            .Resolve(context => context
                .Service<ReadWishlist>()
                .Execute(context.Parent<Customer>().Id, context.RequestAborted));
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/UserErrorType.cs`

```csharp
using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class UserErrorType : ObjectType<UserError>
{
    protected override void Configure(IObjectTypeDescriptor<UserError> descriptor)
    {
        descriptor.Name("UserError");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(error => error.Code).Type<NonNullType<EnumType<UserErrorCode>>>();
        descriptor.Field(error => error.Message).Type<NonNullType<StringType>>();
        descriptor.Field(error => error.Field).Type<StringType>();
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/PageInfo.cs`

```csharp
namespace Zappy.Adapters.GraphQL;

public sealed class PageInfo(bool hasNextPage, string? endCursor)
{
    public bool HasNextPage { get; } = hasNextPage;

    public string? EndCursor { get; } = endCursor;
}
```

`src/Zappy.Adapters.GraphQL/Types/ProductEdge.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class ProductEdge(string cursor, Product node)
{
    public string Cursor { get; } = cursor;

    public Product Node { get; } = node;
}
```

`src/Zappy.Adapters.GraphQL/Types/ProductConnection.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class ProductConnection(IReadOnlyList<ProductEdge> edges, PageInfo pageInfo, int totalCount)
{
    public IReadOnlyList<ProductEdge> Edges { get; } = edges;

    public PageInfo PageInfo { get; } = pageInfo;

    public int TotalCount { get; } = totalCount;

    public static ProductConnection From(Page<Product> page)
    {
        var edges = page.Items.Select(product => new ProductEdge(Cursor.For(product.Id), product)).ToList();
        return new ProductConnection(
            edges,
            new PageInfo(page.HasNextPage, edges.Count == 0 ? null : edges[^1].Cursor),
            page.TotalCount);
    }
}
```

`src/Zappy.Adapters.GraphQL/Types/OrderEdge.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderEdge(string cursor, Order node)
{
    public string Cursor { get; } = cursor;

    public Order Node { get; } = node;
}
```

`src/Zappy.Adapters.GraphQL/Types/OrderConnection.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderConnection(IReadOnlyList<OrderEdge> edges, PageInfo pageInfo, int totalCount)
{
    public IReadOnlyList<OrderEdge> Edges { get; } = edges;

    public PageInfo PageInfo { get; } = pageInfo;

    public int TotalCount { get; } = totalCount;

    public static OrderConnection From(Page<Order> page)
    {
        var edges = page.Items.Select(order => new OrderEdge(Cursor.For(order.Id), order)).ToList();
        return new OrderConnection(
            edges,
            new PageInfo(page.HasNextPage, edges.Count == 0 ? null : edges[^1].Cursor),
            page.TotalCount);
    }
}
```

The connection types are plain classes with read only properties, so Hot Chocolate infers
exactly the three fields the contract asks for. A record would add its own `Equals` and
`Deconstruct` to the schema, which is why they are not records.

### The payloads

`src/Zappy.Adapters.GraphQL/Payloads/AuthenticationPayload.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class AuthenticationPayload(
    Customer? customer,
    string? accessToken,
    DateTimeOffset? accessTokenExpiresAt,
    IReadOnlyList<UserError> errors)
{
    public Customer? Customer { get; } = customer;

    public string? AccessToken { get; } = accessToken;

    public DateTimeOffset? AccessTokenExpiresAt { get; } = accessTokenExpiresAt;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static AuthenticationPayload From(Zappy.Domain.Result<Authentication> result) =>
        result.Value is null
            ? new AuthenticationPayload(null, null, null, result.Errors)
            : new AuthenticationPayload(
                result.Value.Customer,
                result.Value.AccessToken,
                result.Value.AccessTokenExpiresAt,
                result.Errors);
}
```

`src/Zappy.Adapters.GraphQL/Payloads/CartPayload.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CartPayload(Cart? cart, int? availableStock, IReadOnlyList<UserError> errors)
{
    public Cart? Cart { get; } = cart;

    public int? AvailableStock { get; } = availableStock;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static CartPayload From(CartResult result) =>
        new(result.Cart, result.AvailableStock, result.Errors);
}
```

`src/Zappy.Adapters.GraphQL/Payloads/OrderPayload.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderPayload(Order? order, IReadOnlyList<UserError> errors)
{
    public Order? Order { get; } = order;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static OrderPayload From(Zappy.Domain.Result<Order> result) => new(result.Value, result.Errors);
}
```

`src/Zappy.Adapters.GraphQL/Payloads/LogoutPayload.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class LogoutPayload(bool success, IReadOnlyList<UserError> errors)
{
    public bool Success { get; } = success;

    public IReadOnlyList<UserError> Errors { get; } = errors;
}
```

`src/Zappy.Adapters.GraphQL/Payloads/RevokeSessionPayload.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class RevokeSessionPayload(IReadOnlyList<Session> sessions, IReadOnlyList<UserError> errors)
{
    public IReadOnlyList<Session> Sessions { get; } = sessions;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static RevokeSessionPayload From(Zappy.Domain.Result<IReadOnlyList<Session>> result) =>
        new(result.Value ?? [], result.Errors);
}
```

`src/Zappy.Adapters.GraphQL/Payloads/WishlistPayload.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class WishlistPayload(IReadOnlyList<Product> products, IReadOnlyList<UserError> errors)
{
    public IReadOnlyList<Product> Products { get; } = products;

    public IReadOnlyList<UserError> Errors { get; } = errors;

    public static WishlistPayload From(WishlistResult result) => new(result.Products, result.Errors);
}
```

`src/Zappy.Adapters.GraphQL/Payloads/ResetSeedPayload.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class ResetSeedPayload(bool success, int loadedProducts, IReadOnlyList<UserError> errors)
{
    public bool Success { get; } = success;

    public int LoadedProducts { get; } = loadedProducts;

    public IReadOnlyList<UserError> Errors { get; } = errors;
}
```

There is no data transfer object for a product, a cart or an order. The domain type is
the GraphQL type, and a mapping exists only where the shapes differ, which is exactly at
the payloads, because no domain type carries a list of errors.

### The inputs

`src/Zappy.Adapters.GraphQL/Inputs/RegisterInput.cs`

```csharp
namespace Zappy.Adapters.GraphQL;

public sealed class RegisterInput
{
    public string Email { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}
```

`src/Zappy.Adapters.GraphQL/Inputs/LoginInput.cs`

```csharp
namespace Zappy.Adapters.GraphQL;

public sealed class LoginInput
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string? Device { get; set; }
}
```

`src/Zappy.Adapters.GraphQL/Inputs/ProductFilter.cs`

```csharp
namespace Zappy.Adapters.GraphQL;

public sealed class ProductFilter
{
    public string? CategorySlug { get; set; }

    public string? NameContains { get; set; }

    public bool? InStockOnly { get; set; }
}
```

`src/Zappy.Adapters.GraphQL/Inputs/ProductFilterType.cs`

```csharp
using HotChocolate.Types;

namespace Zappy.Adapters.GraphQL;

public sealed class ProductFilterType : InputObjectType<ProductFilter>
{
    protected override void Configure(IInputObjectTypeDescriptor<ProductFilter> descriptor) =>
        descriptor.Name("ProductFilter");
}
```

Hot Chocolate appends `Input` to the name of an input type that does not already end in
it, so `ProductFilter` would reach the schema as `ProductFilterInput`. The explicit
input type is what keeps the contract's name.

### Query and mutation

`src/Zappy.Adapters.GraphQL/Query.cs`

```csharp
using HotChocolate;
using HotChocolate.Types;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class Query
{
    public async Task<ProductConnection> Products(
        ProductFilter? filter,
        [GraphQLType<IntType>][DefaultValue(ListProducts.DefaultPageSize)] int? first,
        string? after,
        ListProducts listProducts,
        CancellationToken cancellationToken) =>
        ProductConnection.From(await listProducts.Execute(
            new ProductSpecification(filter?.CategorySlug, filter?.NameContains, filter?.InStockOnly ?? false),
            first,
            after,
            cancellationToken));

    public Task<Product?> Product(string slug, FindProduct findProduct, CancellationToken cancellationToken) =>
        findProduct.Execute(slug, cancellationToken);

    public Task<IReadOnlyList<Category>> Categories(
        ListCategories listCategories,
        CancellationToken cancellationToken) =>
        listCategories.Execute(cancellationToken);

    public Task<Cart> Cart(
        ReadCart readCart,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        readCart.Execute(visitor.Current, cancellationToken);

    public async Task<IReadOnlyList<Product>> Wishlist(
        ReadWishlist readWishlist,
        WishlistOwner wishlistOwner,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        await readWishlist.Execute(
            await wishlistOwner.Find(visitor.Current, cancellationToken),
            cancellationToken);

    public Task<Customer?> Me(
        ReadCustomer readCustomer,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        readCustomer.Execute(visitor.Current, cancellationToken);

    public async Task<OrderConnection> Orders(
        [GraphQLType<IntType>][DefaultValue(ListOrders.DefaultPageSize)] int? first,
        string? after,
        ListOrders listOrders,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        OrderConnection.From(await listOrders.Execute(visitor.Current, first, after, cancellationToken));

    public Task<Order?> Order(
        [GraphQLType<NonNullType<IdType>>] string id,
        FindOrder findOrder,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        findOrder.Execute(visitor.Current, id, cancellationToken);
}
```

`src/Zappy.Adapters.GraphQL/Mutation.cs`

```csharp
using HotChocolate;
using HotChocolate.Types;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class Mutation
{
    public async Task<AuthenticationPayload> Register(
        RegisterInput input,
        RegisterCustomer registerCustomer,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var result = await registerCustomer.Execute(
            visitor.Current,
            input.Email,
            input.Name,
            input.Password,
            visitor.DeviceFor(null),
            visitor.ClientAddress,
            cancellationToken);

        RememberSignedInCustomer(visitor, result);
        return AuthenticationPayload.From(result);
    }

    public async Task<AuthenticationPayload> Login(
        LoginInput input,
        LogIn logIn,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var result = await logIn.Execute(
            visitor.Current,
            input.Email,
            input.Password,
            visitor.DeviceFor(input.Device),
            visitor.ClientAddress,
            cancellationToken);

        RememberSignedInCustomer(visitor, result);
        return AuthenticationPayload.From(result);
    }

    public async Task<AuthenticationPayload> RefreshSession(
        RefreshSession refreshSession,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var result = await refreshSession.Execute(visitor.PresentedRefreshToken, cancellationToken);
        if (result.Value is null)
        {
            visitor.ForgetRefreshToken();
        }
        else
        {
            visitor.RememberSession(result.Value.SessionId);
            visitor.RememberRefreshToken(result.Value.RefreshToken, result.Value.RefreshTokenExpiresAt);
        }

        return AuthenticationPayload.From(result);
    }

    public async Task<LogoutPayload> Logout(
        LogOut logOut,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var success = await logOut.Execute(visitor.Current, visitor.PresentedRefreshToken, cancellationToken);
        visitor.ForgetRefreshToken();
        return new LogoutPayload(success, []);
    }

    public async Task<RevokeSessionPayload> RevokeSession(
        [GraphQLType<NonNullType<IdType>>] string sessionId,
        Zappy.Application.RevokeSession revokeSession,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var current = visitor.Current;
        var result = await revokeSession.Execute(current, sessionId, cancellationToken);
        if (result.Succeeded && current.SessionId == sessionId)
        {
            visitor.ForgetRefreshToken();
        }

        return RevokeSessionPayload.From(result);
    }

    public async Task<CartPayload> AddToCart(
        [GraphQLType<NonNullType<IdType>>] string productId,
        [GraphQLType<IntType>][DefaultValue(1)] int? quantity,
        AddToCart addToCart,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await addToCart.Execute(visitor.Current, productId, quantity, cancellationToken));

    public async Task<CartPayload> ChangeCartLineQuantity(
        [GraphQLType<NonNullType<IdType>>] string lineId,
        int quantity,
        ChangeCartLineQuantity changeCartLineQuantity,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await changeCartLineQuantity.Execute(visitor.Current, lineId, quantity, cancellationToken));

    public async Task<CartPayload> RemoveCartLine(
        [GraphQLType<NonNullType<IdType>>] string lineId,
        RemoveCartLine removeCartLine,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await removeCartLine.Execute(visitor.Current, lineId, cancellationToken));

    public async Task<CartPayload> ApplyPromotionCode(
        string code,
        ApplyPromotionCode applyPromotionCode,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await applyPromotionCode.Execute(visitor.Current, code, cancellationToken));

    public async Task<CartPayload> RemovePromotionCode(
        RemovePromotionCode removePromotionCode,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await removePromotionCode.Execute(visitor.Current, cancellationToken));

    public async Task<WishlistPayload> AddToWishlist(
        [GraphQLType<NonNullType<IdType>>] string productId,
        AddToWishlist addToWishlist,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberWishlistOwner(visitor, await addToWishlist.Execute(visitor.Current, productId, cancellationToken));

    public async Task<WishlistPayload> RemoveFromWishlist(
        [GraphQLType<NonNullType<IdType>>] string productId,
        RemoveFromWishlist removeFromWishlist,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberWishlistOwner(visitor, await removeFromWishlist.Execute(visitor.Current, productId, cancellationToken));

    public async Task<OrderPayload> PlaceOrder(
        string? idempotencyKey,
        PlaceOrder placeOrder,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        OrderPayload.From(await placeOrder.Execute(visitor.Current, idempotencyKey, cancellationToken));

    private static CartPayload RememberCart(VisitorOfTheRequest visitor, CartResult result)
    {
        if (!visitor.Current.IsSignedIn)
        {
            visitor.RememberCart(result.Cart.Id);
        }

        return CartPayload.From(result);
    }

    private static WishlistPayload RememberWishlistOwner(VisitorOfTheRequest visitor, WishlistResult result)
    {
        if (result.AnonymousCartId is not null)
        {
            visitor.RememberCart(result.AnonymousCartId);
        }

        return WishlistPayload.From(result);
    }

    private static void RememberSignedInCustomer(
        VisitorOfTheRequest visitor,
        Zappy.Domain.Result<Authentication> result)
    {
        if (result.Value is null)
        {
            return;
        }

        visitor.RememberSession(result.Value.SessionId);
        visitor.RememberRefreshToken(result.Value.RefreshToken, result.Value.RefreshTokenExpiresAt);
        visitor.ForgetCart();
    }
}
```

Every field is one call to one use case plus the cookie the answer implies. The
`[GraphQLType]` attributes are there because the contract fixes two things the inference
gets differently: an id is `ID` and not `String`, and `first` and `quantity` are nullable
with a default rather than required.

`src/Zappy.Adapters.GraphQL/DevelopmentMutation.cs`

```csharp
using HotChocolate.Types;
using Zappy.Application;

namespace Zappy.Adapters.GraphQL;

[ExtendObjectType<Mutation>]
public sealed class DevelopmentMutation
{
    public async Task<ResetSeedPayload> ResetSeed(ResetSeed resetSeed, CancellationToken cancellationToken) =>
        new(true, await resetSeed.Execute(cancellationToken), []);
}
```

`src/Zappy.Adapters.GraphQL/GraphQLServices.cs`

```csharp
using HotChocolate.Execution.Configuration;
using HotChocolate.Types;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Zappy.Adapters.GraphQL;

public static class GraphQLServices
{
    public static IServiceCollection AddZappyGraphQL(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = new GraphQLSettings();
        configuration.GetSection(GraphQLSettings.Section).Bind(settings);

        services.AddSingleton(settings);
        services.AddHttpContextAccessor();
        services.AddScoped<VisitorOfTheRequest>();

        var graphQL = services
            .AddGraphQLServer()
            .AddQueryType<Query>()
            .AddMutationType<Mutation>()
            .AddType(new DateTimeType(new DateTimeOptions { OutputPrecision = 0 }))
            .AddType<MoneyType>()
            .AddType<CategoryType>()
            .AddType<ProductType>()
            .AddType<CartLineType>()
            .AddType<AppliedPromotionType>()
            .AddType<CartType>()
            .AddType<OrderLineType>()
            .AddType<OrderType>()
            .AddType<SessionType>()
            .AddType<CustomerType>()
            .AddType<UserErrorType>()
            .AddType<ProductFilterType>()
            .ModifyCostOptions(options =>
            {
                options.ApplyCostDefaults = false;
                options.ApplySlicingArgumentDefaultValue = false;
                options.EnforceCostLimits = false;
            })
            .ModifyRequestOptions(options => options.IncludeExceptionDetails = settings.IncludeExceptionDetails);

        if (settings.ExposeResetSeed)
        {
            graphQL.AddTypeExtension<DevelopmentMutation>();
        }

        return services;
    }
}
```

`DateTimeOptions` with an output precision of zero is what makes every moment in an
answer read as `2026-09-09T14:30:00Z`, which is the second precision the contract asks
for. The cost defaults are off because they would add a `@cost` directive to every field
of the served schema, and the served schema has to be the contract.

## The host

`src/Zappy.Host/SystemClock.cs`

```csharp
using Zappy.Application;

namespace Zappy.Host;

public sealed class SystemClock : IClock
{
    public DateTimeOffset Now => DateTimeOffset.UtcNow;
}
```

`src/Zappy.Host/UseCases.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Host;

public static class UseCases
{
    public static IServiceCollection AddZappyUseCases(this IServiceCollection services)
    {
        services.AddSingleton<IClock, SystemClock>();

        services.AddScoped<ListProducts>();
        services.AddScoped<FindProduct>();
        services.AddScoped<ListCategories>();

        services.AddScoped<VisitorCart>();
        services.AddScoped<ReadCart>();
        services.AddScoped<AddToCart>();
        services.AddScoped<ChangeCartLineQuantity>();
        services.AddScoped<RemoveCartLine>();
        services.AddScoped<ApplyPromotionCode>();
        services.AddScoped<RemovePromotionCode>();

        services.AddScoped<WishlistOwner>();
        services.AddScoped<WishlistProducts>();
        services.AddScoped<ReadWishlist>();
        services.AddScoped<AddToWishlist>();
        services.AddScoped<RemoveFromWishlist>();
        services.AddScoped<StartSession>();
        services.AddScoped<MergeAnonymousCart>();
        services.AddScoped<MergeAnonymousWishlist>();
        services.AddScoped<RegisterCustomer>();
        services.AddScoped<LogIn>();
        services.AddScoped<RefreshSession>();
        services.AddScoped<LogOut>();
        services.AddScoped<RevokeSession>();
        services.AddScoped<ReadCustomer>();
        services.AddScoped<ListSessions>();

        services.AddScoped<PlaceOrder>();
        services.AddScoped<ListOrders>();
        services.AddScoped<FindOrder>();
        services.AddScoped<ResetSeed>();

        services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
        services.AddScoped<IDomainEventHandler<OrderPlaced>, SendOrderConfirmation>();
        services.AddScoped<IDomainEventHandler<OrderPlaced>, RecordPromotionUse>();

        return services;
    }
}
```

Every use case in one list. It is longer than a scan of the assembly would be, and it is
the one place a reader can see everything the store can do.

`src/Zappy.Host/BearerTokenSetup.cs`

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Zappy.Adapters.Security;
using Zappy.Application;

namespace Zappy.Host;

public sealed class BearerTokenSetup(SecuritySettings settings, SigningKeys keys)
    : IConfigureNamedOptions<JwtBearerOptions>
{
    public void Configure(string? name, JwtBearerOptions options) => Configure(options);

    public void Configure(JwtBearerOptions options)
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = settings.Issuer,
            ValidAudience = settings.Audience,
            IssuerSigningKey = keys.Key,
            ClockSkew = TimeSpan.FromSeconds(5),
            NameClaimType = "sub"
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = TheSessionMustStillBeOpen
        };
    }

    private static async Task TheSessionMustStillBeOpen(TokenValidatedContext context)
    {
        var sessionId = context.Principal?.FindFirst("sid")?.Value;
        if (sessionId is null)
        {
            context.Fail("The access token names no session.");
            return;
        }

        var services = context.HttpContext.RequestServices;
        var sessions = services.GetRequiredService<ISessionRepository>();
        var clock = services.GetRequiredService<IClock>();
        var session = await sessions.WithId(sessionId, context.HttpContext.RequestAborted);

        if (session is null || !session.IsOpenAt(clock.Now))
        {
            context.Fail("The session was logged out or revoked.");
        }
    }
}
```

Validating the signature is not enough. `OnTokenValidated` reads the session out of the
store and refuses a token whose session was logged out or revoked, which is what makes a
logout take effect now rather than in fifteen minutes.

`src/Zappy.Host/StorePreparation.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Adapters.Persistence;
using Zappy.Application;

namespace Zappy.Host;

public static class StorePreparation
{
    public static async Task PrepareTheStore(this WebApplication application)
    {
        using var scope = application.Services.CreateScope();
        var services = scope.ServiceProvider;

        await services.GetRequiredService<ZappyDbContext>().Database.MigrateAsync();

        if (services.GetRequiredService<SeedSettings>().LoadAtStart)
        {
            await services.GetRequiredService<ISeedLoader>().LoadFreshSeed(CancellationToken.None);
        }
    }
}
```

`src/Zappy.Host/Program.cs`

```csharp
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
```

`src/Zappy.Host/appsettings.json`

```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:8090"
      }
    }
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "Database": {
    "Provider": "Sqlite",
    "ConnectionString": "Data Source=zappy-mart.db"
  },
  "Seed": {
    "LoadAtStart": false
  },
  "GraphQL": {
    "Path": "/graphql",
    "ExposeResetSeed": false,
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3001",
      "http://localhost:4200"
    ]
  },
  "Security": {
    "Issuer": "https://zappy-mart.localhost",
    "Audience": "zappy-mart",
    "Argon2MemoryKibibytes": 19456,
    "Argon2Iterations": 2,
    "Argon2Parallelism": 1,
    "LoginAttemptsAllowed": 20,
    "LoginAttemptWindowMinutes": 5
  }
}
```

`src/Zappy.Host/appsettings.Development.json`

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "Seed": {
    "LoadAtStart": true
  },
  "GraphQL": {
    "ExposeResetSeed": true,
    "IncludeExceptionDetails": true
  }
}
```

`src/Zappy.Host/Properties/launchSettings.json`

```json
{
  "profiles": {
    "Zappy.Host": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": false,
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

The port has one home, in `appsettings.json`. The launch profile only sets the
environment, so `dotnet run` and a published binary listen on the same port.

## The tests

Three projects, one per ring of the hexagon. The domain tests need nothing, the
application tests need in memory doubles, and the adapter tests need a real SQLite file
and the whole store over HTTP.

### The domain tests

`tests/Zappy.Domain.Tests/Zappy.Domain.Tests.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <RootNamespace>Zappy.Domain.Tests</RootNamespace>
    <OutputType>Exe</OutputType>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="xunit.v3" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\Zappy.Domain\Zappy.Domain.csproj" />
  </ItemGroup>

  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>

</Project>
```

`tests/Zappy.Domain.Tests/Moments.cs`

```csharp
namespace Zappy.Domain.Tests;

public static class Moments
{
    public static readonly DateTimeOffset Now = new(2026, 9, 9, 12, 0, 0, TimeSpan.Zero);
}
```

`tests/Zappy.Domain.Tests/Builders/ProductBuilder.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class ProductBuilder
{
    private string id = "product-01";
    private string name = "A product";
    private string slug = "a-product";
    private string categorySlug = "electronics";
    private int priceInCents = 1000;
    private int stock = 10;
    private int catalogueOrder = 1;

    public ProductBuilder WithId(string productId)
    {
        id = productId;
        return this;
    }

    public ProductBuilder Named(string productName, string productSlug)
    {
        name = productName;
        slug = productSlug;
        return this;
    }

    public ProductBuilder Costing(int cents)
    {
        priceInCents = cents;
        return this;
    }

    public ProductBuilder WithStock(int available)
    {
        stock = available;
        return this;
    }

    public ProductBuilder InCategory(string slugOfTheCategory)
    {
        categorySlug = slugOfTheCategory;
        return this;
    }

    public ProductBuilder AtCataloguePosition(int position)
    {
        catalogueOrder = position;
        return this;
    }

    public Product Build() => new(
        id,
        name,
        slug,
        "A description that no rule reads.",
        Money.Euro(priceInCents),
        categorySlug,
        stock,
        $"/images/products/{slug}.svg",
        catalogueOrder);
}
```

`tests/Zappy.Domain.Tests/Builders/PromotionCodeBuilder.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class PromotionCodeBuilder
{
    private string code = "WELCOME10";
    private PromotionKind kind = PromotionKind.Percentage;
    private int? percentage = 10;
    private Money? amount;
    private Money? minimumSubtotal;
    private DateTimeOffset validFrom = Moments.Now.AddYears(-1);
    private DateTimeOffset validUntil = Moments.Now.AddYears(1);
    private int? usageLimit;
    private int timesUsed;

    public PromotionCodeBuilder TakingPercent(int percent)
    {
        code = "WELCOME10";
        kind = PromotionKind.Percentage;
        percentage = percent;
        return this;
    }

    public PromotionCodeBuilder TakingCents(int cents)
    {
        code = "FIVEOFF";
        kind = PromotionKind.FixedAmount;
        percentage = null;
        amount = Money.Euro(cents);
        return this;
    }

    public PromotionCodeBuilder GivingFreeShipping()
    {
        code = "FREESHIP";
        kind = PromotionKind.FreeShipping;
        percentage = null;
        return this;
    }

    public PromotionCodeBuilder AskingAtLeast(int cents)
    {
        minimumSubtotal = Money.Euro(cents);
        return this;
    }

    public PromotionCodeBuilder ThatClosed()
    {
        validFrom = Moments.Now.AddYears(-2);
        validUntil = Moments.Now.AddYears(-1);
        return this;
    }

    public PromotionCodeBuilder UsedUp()
    {
        usageLimit = 1;
        timesUsed = 1;
        return this;
    }

    public PromotionCode Build() =>
        new(code, kind, percentage, amount, minimumSubtotal, validFrom, validUntil, usageLimit, timesUsed);
}
```

`tests/Zappy.Domain.Tests/Builders/CartBuilder.cs`

```csharp
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
```

The builders are the pattern `docs/patterns.md` names. A test says `new ProductBuilder()
.WithStock(1).Build()` and every other property of the product stays out of the way,
which is what makes the test read like the rule.

`tests/Zappy.Domain.Tests/MoneyTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class MoneyTests
{
    [Fact]
    public void AnAmountIsNeverNegative() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => Money.Euro(-1));

    [Fact]
    public void TwoAmountsOfTheSameValueAreEqual() =>
        Assert.Equal(Money.Euro(495), Money.Euro(495));

    [Fact]
    public void AmountsAddAndSubtractWithinOneCurrency()
    {
        Assert.Equal(Money.Euro(1495), Money.Euro(1000).Plus(Money.Euro(495)));
        Assert.Equal(Money.Euro(505), Money.Euro(1000).Minus(Money.Euro(495)));
    }

    [Fact]
    public void AnAmountMultipliesByAQuantity() =>
        Assert.Equal(Money.Euro(1970), Money.Euro(985).Times(2));

    [Fact]
    public void AmountsInDifferentCurrenciesCannotBeCombined() =>
        Assert.Throws<InvalidOperationException>(() => Money.Euro(100).Plus(new Money(100, "USD")));

    [Fact]
    public void AnAmountIsCappedAtACeiling()
    {
        Assert.Equal(Money.Euro(500), Money.Euro(900).CappedAt(Money.Euro(500)));
        Assert.Equal(Money.Euro(300), Money.Euro(300).CappedAt(Money.Euro(500)));
    }
}
```

`tests/Zappy.Domain.Tests/EmailAddressTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class EmailAddressTests
{
    [Fact]
    public void AnAddressIsNormalisedToLowerCase() =>
        Assert.Equal("jane@example.com", EmailAddress.Create("  JANE@Example.COM ")!.Value);

    [Theory]
    [InlineData("jane")]
    [InlineData("@example.com")]
    [InlineData("jane@")]
    [InlineData("jane@example")]
    [InlineData("jane@@example.com")]
    [InlineData("ja ne@example.com")]
    public void AnAddressThatIsNotAnAddressCannotExist(string value) =>
        Assert.Null(EmailAddress.Create(value));

    [Fact]
    public void TwoAddressesOfTheSameTextAreEqual() =>
        Assert.Equal(EmailAddress.Create("jane@example.com"), EmailAddress.Create("Jane@Example.com"));
}
```

`tests/Zappy.Domain.Tests/TotalsTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class TotalsTests
{
    [Fact]
    public void AnEmptyCartPaysNothingAtAll()
    {
        var totals = Totals.For(Money.Euro(0), null);

        Assert.Equal(Money.Euro(0), totals.Subtotal);
        Assert.Equal(Money.Euro(0), totals.Shipping);
        Assert.Equal(Money.Euro(0), totals.Discount);
        Assert.Equal(Money.Euro(0), totals.Total);
    }

    [Fact]
    public void ShippingIs495BelowFiveThousand()
    {
        var totals = Totals.For(Money.Euro(1970), null);

        Assert.Equal(Money.Euro(495), totals.Shipping);
        Assert.Equal(Money.Euro(2465), totals.Total);
    }

    [Fact]
    public void ShippingIsFreeFromFiveThousand()
    {
        var totals = Totals.For(Money.Euro(5000), null);

        Assert.Equal(Money.Euro(0), totals.Shipping);
        Assert.Equal(Money.Euro(5000), totals.Total);
    }

    [Fact]
    public void AFreeShippingCodeTakesNothingOffAndMakesShippingZero()
    {
        var totals = Totals.For(Money.Euro(1970), new FreeShipping());

        Assert.Equal(Money.Euro(0), totals.Discount);
        Assert.Equal(Money.Euro(0), totals.Shipping);
        Assert.Equal(Money.Euro(1970), totals.Total);
    }

    [Fact]
    public void APercentageRoundsHalfUpToWholeCents()
    {
        var totals = Totals.For(Money.Euro(5599), new PercentageOffSubtotal(10));

        Assert.Equal(Money.Euro(560), totals.Discount);
        Assert.Equal(Money.Euro(0), totals.Shipping);
        Assert.Equal(Money.Euro(5039), totals.Total);
    }

    [Fact]
    public void AFixedAmountIsCappedAtTheSubtotal()
    {
        var totals = Totals.For(Money.Euro(300), new FixedAmountOffSubtotal(Money.Euro(500)));

        Assert.Equal(Money.Euro(300), totals.Discount);
        Assert.Equal(Money.Euro(495), totals.Shipping);
        Assert.Equal(Money.Euro(495), totals.Total);
    }

    [Fact]
    public void TheEquationHoldsForEveryKindOfCode()
    {
        foreach (var rule in new PromotionRule[]
        {
            new PercentageOffSubtotal(10),
            new FixedAmountOffSubtotal(Money.Euro(500)),
            new FreeShipping()
        })
        {
            var totals = Totals.For(Money.Euro(1970), rule);

            Assert.Equal(totals.Subtotal.Plus(totals.Shipping).Minus(totals.Discount), totals.Total);
        }
    }
}
```

`tests/Zappy.Domain.Tests/PercentageRoundingTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class PercentageRoundingTests
{
    [Theory]
    [InlineData(5599, 10, 560)]
    [InlineData(1970, 10, 197)]
    [InlineData(105, 10, 11)]
    [InlineData(104, 10, 10)]
    [InlineData(1, 50, 1)]
    public void APercentageRoundsHalfUp(int subtotal, int percentage, int discount) =>
        Assert.Equal(
            Money.Euro(discount),
            new PercentageOffSubtotal(percentage).DiscountFor(Money.Euro(subtotal)));

    [Fact]
    public void ADiscountNeverPassesTheSubtotal() =>
        Assert.Equal(
            Money.Euro(1000),
            new PercentageOffSubtotal(200).DiscountFor(Money.Euro(1000)));
}
```

`tests/Zappy.Domain.Tests/PromotionCodeTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class PromotionCodeTests
{
    [Fact]
    public void AWorkingCodeAnswersItsRule()
    {
        var outcome = new PromotionCodeBuilder().TakingPercent(10).Build().RuleFor(Money.Euro(1000), Moments.Now);

        Assert.True(outcome.Succeeded);
        Assert.Equal(PromotionKind.Percentage, outcome.Value!.Kind);
    }

    [Fact]
    public void ACodeOutsideItsWindowIsExpired()
    {
        var outcome = new PromotionCodeBuilder().ThatClosed().Build().RuleFor(Money.Euro(1000), Moments.Now);

        Assert.Equal(UserErrorCode.CodeExpired, outcome.Errors.Single().Code);
        Assert.Equal("code", outcome.Errors.Single().Field);
    }

    [Fact]
    public void ACodeAtItsLimitIsExhausted()
    {
        var outcome = new PromotionCodeBuilder().UsedUp().Build().RuleFor(Money.Euro(1000), Moments.Now);

        Assert.Equal(UserErrorCode.CodeExhausted, outcome.Errors.Single().Code);
    }

    [Fact]
    public void ACodeBelowItsMinimumIsRefused()
    {
        var outcome = new PromotionCodeBuilder()
            .TakingCents(500)
            .AskingAtLeast(2500)
            .Build()
            .RuleFor(Money.Euro(2499), Moments.Now);

        Assert.Equal(UserErrorCode.CodeMinimumNotMet, outcome.Errors.Single().Code);
    }

    [Fact]
    public void ACodeIsNormalisedToUpperCase() =>
        Assert.Equal("WELCOME10", PromotionCode.Normalise("  welcome10 "));

    [Fact]
    public void ARecordedUseRaisesTheCount()
    {
        var code = new PromotionCodeBuilder().Build();

        code.RecordUse();

        Assert.Equal(1, code.TimesUsed);
    }
}
```

`tests/Zappy.Domain.Tests/ProductSpecificationTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class ProductSpecificationTests
{
    private readonly Product jacket = new ProductBuilder()
        .Named("Mens Cotton Jacket", "mens-cotton-jacket")
        .InCategory("mens-clothing")
        .WithStock(8)
        .Build();

    private readonly Product ring = new ProductBuilder()
        .Named("White Gold Plated Princess", "white-gold-plated-princess")
        .InCategory("jewellery")
        .WithStock(0)
        .Build();

    [Fact]
    public void TheWholeCatalogueKeepsEverything()
    {
        Assert.Empty(ProductSpecification.WholeCatalogue.Parts());
        Assert.True(ProductSpecification.WholeCatalogue.IsSatisfiedBy(ring));
    }

    [Fact]
    public void ACategoryNarrowsTheCatalogue()
    {
        var specification = new ProductSpecification("jewellery", null, false);

        Assert.True(specification.IsSatisfiedBy(ring));
        Assert.False(specification.IsSatisfiedBy(jacket));
    }

    [Fact]
    public void ANameIsComparedWithoutRegardToCase()
    {
        var specification = new ProductSpecification(null, "COTTON", false);

        Assert.True(specification.IsSatisfiedBy(jacket));
        Assert.False(specification.IsSatisfiedBy(ring));
    }

    [Fact]
    public void StockLeavesOutWhatIsGone()
    {
        var specification = new ProductSpecification(null, null, true);

        Assert.True(specification.IsSatisfiedBy(jacket));
        Assert.False(specification.IsSatisfiedBy(ring));
    }

    [Fact]
    public void EveryPartHasToHold()
    {
        var specification = new ProductSpecification("mens-clothing", "cotton", true);

        Assert.Equal(3, specification.Parts().Count);
        Assert.True(specification.IsSatisfiedBy(jacket));
    }
}
```

`tests/Zappy.Domain.Tests/CartTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class CartTests
{
    private readonly Product shirt = new ProductBuilder()
        .WithId("product-18")
        .Named("MBJ Boat Neck", "mbj-boat-neck")
        .Costing(985)
        .WithStock(25)
        .Build();

    [Fact]
    public void ALineCarriesItsProductAndItsTotal()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        var line = Assert.Single(cart.Lines);
        Assert.Equal(shirt.Id, line.ProductId);
        Assert.Equal(2, line.Quantity);
        Assert.Equal(Money.Euro(1970), line.LineTotal);
        Assert.Equal(Money.Euro(1970), cart.Subtotal);
    }

    [Fact]
    public void AddingAProductThatIsAlreadyThereRaisesTheQuantity()
    {
        var cart = new CartBuilder().Holding(shirt).Build();

        cart.Add(shirt, 2, Moments.Now);

        Assert.Equal(3, Assert.Single(cart.Lines).Quantity);
    }

    [Fact]
    public void AQuantityBelowOneIsRefused()
    {
        var cart = new CartBuilder().Build();

        var outcome = cart.Add(shirt, 0, Moments.Now);

        Assert.Equal(UserErrorCode.QuantityInvalid, outcome.Errors.Single().Code);
        Assert.Empty(cart.Lines);
    }

    [Fact]
    public void AQuantityAboveTheStockIsRefused()
    {
        var lastOne = new ProductBuilder().WithStock(1).Build();
        var cart = new CartBuilder().Holding(lastOne).Build();

        var outcome = cart.Add(lastOne, 1, Moments.Now);

        Assert.Equal(UserErrorCode.OutOfStock, outcome.Errors.Single().Code);
        Assert.Equal(1, Assert.Single(cart.Lines).Quantity);
    }

    [Fact]
    public void AProductWithoutStockCannotEnterACart()
    {
        var sold = new ProductBuilder().WithStock(0).Build();
        var cart = new CartBuilder().Build();

        Assert.Equal(UserErrorCode.OutOfStock, cart.Add(sold, 1, Moments.Now).Errors.Single().Code);
    }

    [Fact]
    public void AQuantityIsSetToAnExactNumber()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        cart.ChangeLineQuantity(cart.Lines.Single().Id, 5, Moments.Now);

        Assert.Equal(5, cart.Lines.Single().Quantity);
    }

    [Fact]
    public void AQuantityOfZeroIsNotARemoval()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        var outcome = cart.ChangeLineQuantity(cart.Lines.Single().Id, 0, Moments.Now);

        Assert.Equal(UserErrorCode.QuantityInvalid, outcome.Errors.Single().Code);
        Assert.Single(cart.Lines);
    }

    [Fact]
    public void AnUnknownLineIsNotFound()
    {
        var cart = new CartBuilder().Holding(shirt).Build();

        Assert.Equal(
            UserErrorCode.CartLineNotFound,
            cart.RemoveLine("no-such-line", Moments.Now).Errors.Single().Code);
    }

    [Fact]
    public void ALineIsRemovedOnce()
    {
        var cart = new CartBuilder().Holding(shirt).Build();
        var lineId = cart.Lines.Single().Id;

        Assert.True(cart.RemoveLine(lineId, Moments.Now).Succeeded);
        Assert.Equal(UserErrorCode.CartLineNotFound, cart.RemoveLine(lineId, Moments.Now).Errors.Single().Code);
    }

    [Fact]
    public void ASecondCodeReplacesTheFirst()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        cart.Apply(new PromotionCodeBuilder().TakingPercent(10).Build(), Moments.Now);
        cart.Apply(new PromotionCodeBuilder().GivingFreeShipping().Build(), Moments.Now);

        Assert.Equal("FREESHIP", cart.Promotion!.Code);
        Assert.Equal(PromotionKind.FreeShipping, cart.Promotion.Kind);
    }

    [Fact]
    public void ARefusedCodeLeavesTheCartAsItWas()
    {
        var cart = new CartBuilder()
            .Holding(shirt, 2)
            .With(new PromotionCodeBuilder().TakingPercent(10).Build())
            .Build();

        var outcome = cart.Apply(new PromotionCodeBuilder().ThatClosed().Build(), Moments.Now);

        Assert.Equal(UserErrorCode.CodeExpired, outcome.Errors.Single().Code);
        Assert.Equal("WELCOME10", cart.Promotion!.Code);
    }

    [Fact]
    public void RemovingTheCodeLeavesTheLines()
    {
        var cart = new CartBuilder().Holding(shirt, 2).With(new PromotionCodeBuilder().Build()).Build();

        cart.RemovePromotion(Moments.Now);

        Assert.Null(cart.Promotion);
        Assert.Single(cart.Lines);
    }

    [Fact]
    public void ACartTakesOverTheLinesOfAnotherCart()
    {
        var other = new ProductBuilder().WithId("product-02").Named("Other", "other").Costing(500).Build();
        var anonymousCart = new CartBuilder().Holding(shirt, 2).Holding(other).Build();
        var customerCart = new CartBuilder().OwnedBy("customer-01").Holding(shirt).Build();

        customerCart.TakeOver(anonymousCart, Moments.Now);

        Assert.Equal(2, customerCart.Lines.Count);
        Assert.Equal(3, customerCart.LineFor(shirt.Id)!.Quantity);
    }

    [Fact]
    public void AnEmptiedCartKeepsNothing()
    {
        var cart = new CartBuilder().Holding(shirt).With(new PromotionCodeBuilder().Build()).Build();

        cart.Empty(Moments.Now);

        Assert.True(cart.IsEmpty);
        Assert.Null(cart.Promotion);
    }
}
```

`tests/Zappy.Domain.Tests/OrderTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class OrderTests
{
    private readonly Product shirt = new ProductBuilder()
        .WithId("product-18")
        .Named("MBJ Boat Neck", "mbj-boat-neck")
        .Costing(985)
        .WithStock(25)
        .Build();

    [Fact]
    public void AnOrderKeepsTheNamesAndThePricesOfTheMoment()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        var order = Order.Place(cart, "customer-01", Moments.Now).Value!;

        var line = Assert.Single(order.Lines);
        Assert.Equal("MBJ Boat Neck", line.ProductName);
        Assert.Equal(Money.Euro(985), line.UnitPrice);
        Assert.Equal(Money.Euro(1970), line.LineTotal);
        Assert.Equal(OrderStatus.Paid, order.Status);
    }

    [Fact]
    public void AnOrderCopiesTheTotalsTheCartShowed()
    {
        var cart = new CartBuilder()
            .Holding(shirt, 2)
            .With(new PromotionCodeBuilder().TakingPercent(10).Build())
            .Build();

        var order = Order.Place(cart, "customer-01", Moments.Now).Value!;

        Assert.Equal(Money.Euro(1970), order.Subtotal);
        Assert.Equal(Money.Euro(197), order.Discount);
        Assert.Equal(Money.Euro(495), order.Shipping);
        Assert.Equal(Money.Euro(2268), order.Total);
        Assert.Equal("WELCOME10", order.PromotionCode);
    }

    [Fact]
    public void PlacingAnOrderReservesTheStockAndEmptiesTheCart()
    {
        var cart = new CartBuilder().Holding(shirt, 2).Build();

        Order.Place(cart, "customer-01", Moments.Now);

        Assert.Equal(23, shirt.Stock);
        Assert.True(cart.IsEmpty);
    }

    [Fact]
    public void AnEmptyCartHasNothingToOrder()
    {
        var outcome = Order.Place(new CartBuilder().Build(), "customer-01", Moments.Now);

        Assert.Equal(UserErrorCode.CartEmpty, outcome.Errors.Single().Code);
    }

    [Fact]
    public void OneLineWithoutStockStopsTheWholeOrder()
    {
        var lastOne = new ProductBuilder()
            .WithId("product-12")
            .Named("Gaming drive", "gaming-drive")
            .WithStock(1)
            .Build();
        var cart = new CartBuilder().Holding(shirt, 2).Holding(lastOne).Build();
        lastOne.Reserve(1);

        var outcome = Order.Place(cart, "customer-01", Moments.Now);

        Assert.Equal(UserErrorCode.OutOfStock, outcome.Errors.Single().Code);
        Assert.Contains("Gaming drive", outcome.Errors.Single().Message, StringComparison.Ordinal);
        Assert.Equal(25, shirt.Stock);
        Assert.False(cart.IsEmpty);
    }

    [Fact]
    public void PlacingAnOrderRaisesTheEventTheOtherModulesReactTo()
    {
        var cart = new CartBuilder().Holding(shirt, 2).With(new PromotionCodeBuilder().Build()).Build();

        var order = Order.Place(cart, "customer-01", Moments.Now).Value!;

        var raised = Assert.IsType<OrderPlaced>(Assert.Single(order.RaisedEvents));
        Assert.Equal(order.Id, raised.OrderId);
        Assert.Equal("customer-01", raised.CustomerId);
        Assert.Equal("WELCOME10", raised.PromotionCode);
    }

    [Fact]
    public void AnOrderNumberIsSafeToShow()
    {
        var cart = new CartBuilder().Holding(shirt).Build();

        var order = Order.Place(cart, "customer-01", Moments.Now).Value!;

        Assert.StartsWith("ZAPPY-20260909-", order.Number, StringComparison.Ordinal);
        Assert.DoesNotContain(order.Id, order.Number, StringComparison.Ordinal);
    }
}
```

`tests/Zappy.Domain.Tests/SessionTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class SessionTests
{
    private static Session ASession(int creationOrder = 1) =>
        new("session-01", "customer-01", "Chrome on Windows", creationOrder, Moments.Now, Moments.Now.AddDays(30));

    [Fact]
    public void AFreshSessionIsOpen() => Assert.True(ASession().IsOpenAt(Moments.Now));

    [Fact]
    public void ARevokedSessionIsClosedAtOnce()
    {
        var session = ASession();

        session.Revoke(Moments.Now);

        Assert.False(session.IsOpenAt(Moments.Now));
    }

    [Fact]
    public void RevokingTwiceKeepsTheFirstMoment()
    {
        var session = ASession();

        session.Revoke(Moments.Now);
        session.Revoke(Moments.Now.AddHours(1));

        Assert.Equal(Moments.Now, session.RevokedAt);
    }

    [Fact]
    public void AnExpiredSessionIsClosed() =>
        Assert.False(ASession().IsOpenAt(Moments.Now.AddDays(31)));

    [Fact]
    public void ASessionRecordsTheOrderItWasCreatedIn() =>
        Assert.Equal(7, ASession(7).CreationOrder);

    [Fact]
    public void ARotatedTokenIsRecognisedAsUsed()
    {
        var token = new RefreshToken("token-01", "session-01", "a hash", Moments.Now, Moments.Now.AddDays(30));

        Assert.False(token.WasAlreadyUsed);

        token.Rotate(Moments.Now);

        Assert.True(token.WasAlreadyUsed);
    }
}
```

`tests/Zappy.Domain.Tests/PasswordPolicyTests.cs`

```csharp
using Zappy.Domain;

namespace Zappy.Domain.Tests;

public sealed class PasswordPolicyTests
{
    [Fact]
    public void APasswordOfTwelveCharactersPasses() =>
        Assert.Empty(PasswordPolicy.Check(new string('a', 12)));

    [Fact]
    public void AShorterPasswordIsRefused() =>
        Assert.Equal(UserErrorCode.PasswordTooShort, PasswordPolicy.Check(new string('a', 11)).Single().Code);

    [Fact]
    public void ALongerPasswordThanTheMaximumIsRefused() =>
        Assert.Equal(UserErrorCode.PasswordTooLong, PasswordPolicy.Check(new string('a', 129)).Single().Code);

    [Fact]
    public void APasswordOfTheMaximumLengthPasses() =>
        Assert.Empty(PasswordPolicy.Check(new string('a', 128)));

    [Fact]
    public void TheErrorNamesTheField() =>
        Assert.Equal("input.password", PasswordPolicy.Check("short").Single().Field);
}
```

### The application tests

`tests/Zappy.Application.Tests/Zappy.Application.Tests.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <RootNamespace>Zappy.Application.Tests</RootNamespace>
    <OutputType>Exe</OutputType>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="xunit.v3" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\Zappy.Application\Zappy.Application.csproj" />
  </ItemGroup>

  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>

</Project>
```

`tests/Zappy.Application.Tests/Doubles/FixedClock.cs`

```csharp
using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class FixedClock(DateTimeOffset now) : IClock
{
    public DateTimeOffset Now { get; set; } = now;
}
```

`tests/Zappy.Application.Tests/Doubles/DirectUnitOfWork.cs`

```csharp
using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class DirectUnitOfWork : IUnitOfWork
{
    public Task<TResult> RunInOneTransaction<TResult>(
        Func<CancellationToken, Task<TResult>> work,
        CancellationToken cancellationToken) =>
        work(cancellationToken);
}
```

`tests/Zappy.Application.Tests/Doubles/InMemoryProducts.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryProducts(params Product[] products) : IProductRepository
{
    private readonly List<Product> catalogue = [.. products];

    public Task<Page<Product>> Matching(
        ProductSpecification specification,
        int first,
        string? afterProductId,
        CancellationToken cancellationToken)
    {
        var matching = catalogue.Where(specification.IsSatisfiedBy).ToList();
        var start = afterProductId is null ? 0 : matching.FindIndex(product => product.Id == afterProductId) + 1;
        var page = matching.Skip(start).Take(first).ToList();
        return Task.FromResult(new Page<Product>(page, start + page.Count < matching.Count, matching.Count));
    }

    public Task<Product?> WithSlug(string slug, CancellationToken cancellationToken) =>
        Task.FromResult(catalogue.SingleOrDefault(product => product.Slug == slug));

    public Task<Product?> WithId(string id, CancellationToken cancellationToken) =>
        Task.FromResult(catalogue.SingleOrDefault(product => product.Id == id));

    public Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Product>>([.. catalogue.Where(product => ids.Contains(product.Id))]);
}
```

`tests/Zappy.Application.Tests/Doubles/InMemoryCarts.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryCarts : ICartRepository
{
    public List<Cart> Carts { get; } = [];

    public Task<Cart?> WithId(string id, CancellationToken cancellationToken) =>
        Task.FromResult(Carts.SingleOrDefault(cart => cart.Id == id));

    public Task<Cart?> OfCustomer(string customerId, CancellationToken cancellationToken) =>
        Task.FromResult(Carts.FirstOrDefault(cart => cart.CustomerId == customerId));

    public Task Add(Cart cart, CancellationToken cancellationToken)
    {
        Carts.Add(cart);
        return Task.CompletedTask;
    }

    public Task Remove(Cart cart, CancellationToken cancellationToken)
    {
        Carts.Remove(cart);
        return Task.CompletedTask;
    }
}
```

`tests/Zappy.Application.Tests/Doubles/InMemoryPromotionCodes.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryPromotionCodes(params PromotionCode[] codes) : IPromotionCodeRepository
{
    public IReadOnlyList<PromotionCode> Codes { get; } = codes;

    public Task<PromotionCode?> WithCode(string code, CancellationToken cancellationToken) =>
        Task.FromResult(Codes.SingleOrDefault(candidate => candidate.Code == code));
}
```

`tests/Zappy.Application.Tests/Doubles/InMemoryOrders.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryOrders : IOrderRepository
{
    public List<Order> Orders { get; } = [];

    public Task Add(Order order, CancellationToken cancellationToken)
    {
        Orders.Add(order);
        return Task.CompletedTask;
    }

    public Task<Page<Order>> OfCustomer(
        string customerId,
        int first,
        string? afterOrderId,
        CancellationToken cancellationToken)
    {
        var newestFirst = Orders
            .Where(order => order.CustomerId == customerId)
            .OrderByDescending(order => order.PlacedAt)
            .ToList();

        var start = afterOrderId is null ? 0 : newestFirst.FindIndex(order => order.Id == afterOrderId) + 1;
        var page = newestFirst.Skip(start).Take(first).ToList();
        return Task.FromResult(new Page<Order>(page, start + page.Count < newestFirst.Count, newestFirst.Count));
    }

    public Task<Order?> OfCustomerWithId(string customerId, string orderId, CancellationToken cancellationToken) =>
        Task.FromResult(Orders.SingleOrDefault(order => order.CustomerId == customerId && order.Id == orderId));
}
```

`tests/Zappy.Application.Tests/Doubles/InMemoryCustomers.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryCustomers(params Customer[] customers) : ICustomerRepository
{
    public List<Customer> Customers { get; } = [.. customers];

    public Task<Customer?> WithEmail(EmailAddress email, CancellationToken cancellationToken) =>
        Task.FromResult(Customers.SingleOrDefault(customer => customer.Email == email));

    public Task<Customer?> WithId(string id, CancellationToken cancellationToken) =>
        Task.FromResult(Customers.SingleOrDefault(customer => customer.Id == id));

    public Task Add(Customer customer, CancellationToken cancellationToken)
    {
        Customers.Add(customer);
        return Task.CompletedTask;
    }
}
```

`tests/Zappy.Application.Tests/Doubles/InMemorySessions.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemorySessions : ISessionRepository
{
    public List<Session> Sessions { get; } = [];

    public List<RefreshToken> RefreshTokens { get; } = [];

    public Task Add(Session session, RefreshToken refreshToken, CancellationToken cancellationToken)
    {
        Sessions.Add(session);
        RefreshTokens.Add(refreshToken);
        return Task.CompletedTask;
    }

    public Task AddRefreshToken(RefreshToken refreshToken, CancellationToken cancellationToken)
    {
        RefreshTokens.Add(refreshToken);
        return Task.CompletedTask;
    }

    public Task<int> NextCreationOrderFor(string customerId, CancellationToken cancellationToken) =>
        Task.FromResult(Sessions.Count(session => session.CustomerId == customerId) + 1);

    public Task<Session?> WithId(string sessionId, CancellationToken cancellationToken) =>
        Task.FromResult(Sessions.SingleOrDefault(session => session.Id == sessionId));

    public Task<IReadOnlyList<Session>> OpenOfCustomer(
        string customerId,
        DateTimeOffset moment,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Session>>(
        [
            .. Sessions
                .Where(session => session.CustomerId == customerId && session.IsOpenAt(moment))
                .OrderByDescending(session => session.CreatedAt)
                .ThenByDescending(session => session.CreationOrder)
        ]);

    public Task<RefreshToken?> WithTokenHash(string tokenHash, CancellationToken cancellationToken) =>
        Task.FromResult(RefreshTokens.SingleOrDefault(token => token.TokenHash == tokenHash));
}
```

`tests/Zappy.Application.Tests/Doubles/InMemoryWishlist.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryWishlist : IWishlistRepository
{
    public List<WishlistEntry> Entries { get; } = [];

    public Task<IReadOnlyList<WishlistEntry>> OfOwner(string ownerId, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<WishlistEntry>>(
            [.. Entries.Where(entry => entry.OwnerId == ownerId).OrderByDescending(entry => entry.AddedAt)]);

    public Task Add(WishlistEntry entry, CancellationToken cancellationToken)
    {
        Entries.Add(entry);
        return Task.CompletedTask;
    }

    public Task Remove(string ownerId, string productId, CancellationToken cancellationToken)
    {
        Entries.RemoveAll(entry => entry.OwnerId == ownerId && entry.ProductId == productId);
        return Task.CompletedTask;
    }
}
```

`tests/Zappy.Application.Tests/Doubles/CountingPasswordHasher.cs`

```csharp
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class CountingPasswordHasher : IPasswordHasher
{
    public int TimesHashed { get; private set; }

    public string Hash(string password)
    {
        TimesHashed += 1;
        return Digest(password);
    }

    public bool Matches(string password, string hash) => Digest(password) == hash;

    private static string Digest(string password) =>
        string.Create(
            CultureInfo.InvariantCulture,
            $"digest:{Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)))}");
}
```

`tests/Zappy.Application.Tests/Doubles/CountingTokenIssuer.cs`

```csharp
using System.Globalization;
using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class CountingTokenIssuer : ITokenIssuer
{
    private int issued;

    public AccessToken IssueAccessToken(string customerId, string sessionId, DateTimeOffset moment) =>
        new($"access-for-{customerId}-in-{sessionId}", moment.Add(SessionLifetime.AccessToken));

    public string IssueRefreshToken()
    {
        issued += 1;
        return string.Create(CultureInfo.InvariantCulture, $"refresh-{issued}");
    }

    public string HashRefreshToken(string refreshToken) => $"hash-of-{refreshToken}";
}
```

`tests/Zappy.Application.Tests/Doubles/CountingRateLimiter.cs`

```csharp
using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class CountingRateLimiter(int attemptsAllowed) : IRateLimiter
{
    private readonly Dictionary<string, int> attempts = [];

    public bool AllowsAttempt(string key, DateTimeOffset moment)
    {
        attempts[key] = attempts.GetValueOrDefault(key) + 1;
        return attempts[key] <= attemptsAllowed;
    }

    public void Forget() => attempts.Clear();
}
```

`tests/Zappy.Application.Tests/Doubles/RecordingDispatcher.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class RecordingDispatcher : IDomainEventDispatcher
{
    public List<DomainEvent> Dispatched { get; } = [];

    public Task Dispatch(IReadOnlyList<DomainEvent> raisedEvents, CancellationToken cancellationToken)
    {
        Dispatched.AddRange(raisedEvents);
        return Task.CompletedTask;
    }
}
```

`tests/Zappy.Application.Tests/Doubles/RecordingMailer.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class RecordingMailer : IMailer
{
    public List<Order> Sent { get; } = [];

    public Task SendOrderConfirmation(
        EmailAddress recipient,
        string customerName,
        Order order,
        CancellationToken cancellationToken)
    {
        Sent.Add(order);
        return Task.CompletedTask;
    }
}
```

Fourteen small classes and no mocking library. Each one is a port with the simplest
implementation that answers truthfully, and a test can look inside it afterwards, which
a set of expectations cannot do as clearly.

`tests/Zappy.Application.Tests/Store.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class Store
{
    public static readonly DateTimeOffset Moment = new(2026, 9, 9, 12, 0, 0, TimeSpan.Zero);

    public Store(params Product[] catalogue)
    {
        Products = new InMemoryProducts(catalogue);
        PromotionCodes = new InMemoryPromotionCodes(
            new PromotionCode("WELCOME10", PromotionKind.Percentage, 10, null, null, Moment.AddYears(-1), Moment.AddYears(1), null, 0),
            new PromotionCode("SUMMER2025", PromotionKind.Percentage, 10, null, null, Moment.AddYears(-2), Moment.AddYears(-1), null, 0));

        var visitorCart = new VisitorCart(Carts, Clock);
        var wishlistProducts = new WishlistProducts(Products);
        var readWishlist = new ReadWishlist(Wishlist, wishlistProducts);
        var startSession = new StartSession(Sessions, TokenIssuer, Clock);
        var mergeAnonymousCart = new MergeAnonymousCart(Carts, Clock);
        var mergeAnonymousWishlist = new MergeAnonymousWishlist(Wishlist);
        var wishlistOwner = new WishlistOwner(visitorCart);

        ReadCart = new ReadCart(visitorCart);
        AddToCart = new AddToCart(visitorCart, Products, UnitOfWork, Clock);
        ChangeCartLineQuantity = new ChangeCartLineQuantity(visitorCart, UnitOfWork, Clock);
        RemoveCartLine = new RemoveCartLine(visitorCart, UnitOfWork, Clock);
        ApplyPromotionCode = new ApplyPromotionCode(visitorCart, PromotionCodes, UnitOfWork, Clock);
        RemovePromotionCode = new RemovePromotionCode(visitorCart, UnitOfWork, Clock);
        ListProducts = new ListProducts(Products);
        RegisterCustomer = new RegisterCustomer(
            Customers, PasswordHasher, RateLimiter, startSession, mergeAnonymousCart, mergeAnonymousWishlist, UnitOfWork, Clock);
        LogIn = new LogIn(
            Customers, PasswordHasher, RateLimiter, startSession, mergeAnonymousCart, mergeAnonymousWishlist, UnitOfWork, Clock);
        RefreshSession = new RefreshSession(Sessions, Customers, TokenIssuer, UnitOfWork, Clock);
        LogOut = new LogOut(Sessions, TokenIssuer, UnitOfWork, Clock);
        RevokeSession = new RevokeSession(Sessions, UnitOfWork, Clock);
        ListSessions = new ListSessions(Sessions, Clock);
        AddToWishlist = new AddToWishlist(Wishlist, Products, wishlistOwner, wishlistProducts, UnitOfWork, Clock);
        RemoveFromWishlist = new RemoveFromWishlist(Wishlist, wishlistOwner, wishlistProducts, UnitOfWork);
        ReadWishlist = readWishlist;
        WishlistOwner = wishlistOwner;
        PlaceOrder = new PlaceOrder(visitorCart, Orders, Dispatcher, UnitOfWork, Clock);
        SendOrderConfirmation = new SendOrderConfirmation(Orders, Customers, Mailer);
        RecordPromotionUse = new RecordPromotionUse(PromotionCodes, UnitOfWork);
    }

    public FixedClock Clock { get; } = new(Moment);

    public InMemoryProducts Products { get; }

    public InMemoryPromotionCodes PromotionCodes { get; }

    public InMemoryCarts Carts { get; } = new();

    public InMemoryOrders Orders { get; } = new();

    public InMemoryCustomers Customers { get; } = new();

    public InMemorySessions Sessions { get; } = new();

    public InMemoryWishlist Wishlist { get; } = new();

    public CountingPasswordHasher PasswordHasher { get; } = new();

    public CountingTokenIssuer TokenIssuer { get; } = new();

    public CountingRateLimiter RateLimiter { get; } = new(5);

    public RecordingDispatcher Dispatcher { get; } = new();

    public RecordingMailer Mailer { get; } = new();

    public DirectUnitOfWork UnitOfWork { get; } = new();

    public ReadCart ReadCart { get; }

    public AddToCart AddToCart { get; }

    public ChangeCartLineQuantity ChangeCartLineQuantity { get; }

    public RemoveCartLine RemoveCartLine { get; }

    public ApplyPromotionCode ApplyPromotionCode { get; }

    public RemovePromotionCode RemovePromotionCode { get; }

    public ListProducts ListProducts { get; }

    public RegisterCustomer RegisterCustomer { get; }

    public LogIn LogIn { get; }

    public RefreshSession RefreshSession { get; }

    public LogOut LogOut { get; }

    public RevokeSession RevokeSession { get; }

    public ListSessions ListSessions { get; }

    public AddToWishlist AddToWishlist { get; }

    public RemoveFromWishlist RemoveFromWishlist { get; }

    public ReadWishlist ReadWishlist { get; }

    public WishlistOwner WishlistOwner { get; }

    public PlaceOrder PlaceOrder { get; }

    public SendOrderConfirmation SendOrderConfirmation { get; }

    public RecordPromotionUse RecordPromotionUse { get; }

    public static Product AProduct(string id = "product-18", int price = 985, int stock = 25) =>
        new(id, $"Product {id}", $"product-{id}", "A description.", Money.Euro(price), "electronics", stock, null, 1);
}
```

`tests/Zappy.Application.Tests/CartUseCaseTests.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class CartUseCaseTests
{
    private readonly Store store = new(Store.AProduct(), Store.AProduct("product-12", 11400, 1));

    [Fact]
    public async Task AnAnonymousVisitorGetsACartOnTheFirstAdd()
    {
        var result = await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 2, CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.Single(store.Carts.Carts);
        Assert.Equal(Money.Euro(1970), result.Cart.Subtotal);
    }

    [Fact]
    public async Task AnUnknownProductIsNotFound()
    {
        var result = await store.AddToCart.Execute(Visitor.Anonymous, "product-99", 1, CancellationToken.None);

        Assert.Equal(UserErrorCode.ProductNotFound, result.Errors.Single().Code);
        Assert.Equal("productId", result.Errors.Single().Field);
    }

    [Fact]
    public async Task ARefusedQuantityAnswersTheStockThatIsLeft()
    {
        await store.AddToCart.Execute(Visitor.Anonymous, "product-12", 1, CancellationToken.None);
        var cartId = store.Carts.Carts.Single().Id;

        var result = await store.AddToCart.Execute(
            new Visitor(null, null, cartId),
            "product-12",
            1,
            CancellationToken.None);

        Assert.Equal(UserErrorCode.OutOfStock, result.Errors.Single().Code);
        Assert.Equal(1, result.AvailableStock);
    }

    [Fact]
    public async Task AnUnknownCodeIsRefusedAndTheCartStays()
    {
        await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 1, CancellationToken.None);
        var visitor = new Visitor(null, null, store.Carts.Carts.Single().Id);

        var result = await store.ApplyPromotionCode.Execute(visitor, "NOPE", CancellationToken.None);

        Assert.Equal(UserErrorCode.CodeUnknown, result.Errors.Single().Code);
        Assert.Single(result.Cart.Lines);
    }

    [Fact]
    public async Task AWorkingCodeChangesTheTotals()
    {
        await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 2, CancellationToken.None);
        var visitor = new Visitor(null, null, store.Carts.Carts.Single().Id);

        var result = await store.ApplyPromotionCode.Execute(visitor, "welcome10", CancellationToken.None);

        Assert.Equal(Money.Euro(197), result.Cart.Totals.Discount);
        Assert.Equal(Money.Euro(2268), result.Cart.Totals.Total);
    }

    [Fact]
    public async Task AnExpiredCodeIsRefused()
    {
        await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 2, CancellationToken.None);
        var visitor = new Visitor(null, null, store.Carts.Carts.Single().Id);

        var result = await store.ApplyPromotionCode.Execute(visitor, "SUMMER2025", CancellationToken.None);

        Assert.Equal(UserErrorCode.CodeExpired, result.Errors.Single().Code);
    }

    [Fact]
    public async Task AVisitorWithoutACartReadsAnEmptyOne()
    {
        var cart = await store.ReadCart.Execute(Visitor.Anonymous, CancellationToken.None);

        Assert.True(cart.IsEmpty);
        Assert.Empty(store.Carts.Carts);
        Assert.Equal(Money.Euro(0), cart.Totals.Total);
    }

    [Fact]
    public async Task ACartCookieNeverReachesTheCartOfASignedInCustomer()
    {
        var customerCart = new Cart("cart-of-jane", "customer-01", Store.Moment);
        await store.Carts.Add(customerCart, CancellationToken.None);

        var cart = await store.ReadCart.Execute(new Visitor(null, null, "cart-of-jane"), CancellationToken.None);

        Assert.NotEqual("cart-of-jane", cart.Id);
    }
}
```

`tests/Zappy.Application.Tests/ListProductsTests.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class ListProductsTests
{
    private readonly Store store = new(
        [.. Enumerable.Range(1, 120).Select(number => Store.AProduct($"product-{number:00}"))]);

    [Fact]
    public async Task APageIsAtMostOneHundred()
    {
        var page = await store.ListProducts.Execute(ProductSpecification.WholeCatalogue, 500, null, CancellationToken.None);

        Assert.Equal(100, page.Items.Count);
        Assert.Equal(120, page.TotalCount);
        Assert.True(page.HasNextPage);
    }

    [Fact]
    public async Task TheDefaultPageIsTwentyFour()
    {
        var page = await store.ListProducts.Execute(ProductSpecification.WholeCatalogue, null, null, CancellationToken.None);

        Assert.Equal(24, page.Items.Count);
    }

    [Fact]
    public async Task ACursorStartsThePageAfterIt()
    {
        var first = await store.ListProducts.Execute(ProductSpecification.WholeCatalogue, 2, null, CancellationToken.None);

        var second = await store.ListProducts.Execute(
            ProductSpecification.WholeCatalogue,
            2,
            Cursor.For(first.Items[^1].Id),
            CancellationToken.None);

        Assert.Equal("product-03", second.Items[0].Id);
    }

    [Fact]
    public void ACursorSurvivesTheRoundTrip() =>
        Assert.Equal("product-07", Cursor.IdentifierIn(Cursor.For("product-07")));

    [Fact]
    public void ACursorThatIsNotACursorStartsAtTheBeginning() =>
        Assert.Null(Cursor.IdentifierIn("not a cursor at all"));
}
```

`tests/Zappy.Application.Tests/AccountUseCaseTests.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class AccountUseCaseTests
{
    private readonly Store store = new(Store.AProduct());

    [Fact]
    public async Task ARegistrationSignsTheCustomerIn()
    {
        var result = await Register();

        Assert.True(result.Succeeded);
        Assert.Equal("jane@example.com", result.Value!.Customer.Email.Value);
        Assert.Equal(Store.Moment.AddMinutes(15), result.Value.AccessTokenExpiresAt);
        Assert.Single(store.Sessions.Sessions);
    }

    [Fact]
    public async Task APasswordIsNeverStoredInClear()
    {
        await Register();

        Assert.DoesNotContain("correct horse battery staple", store.Customers.Customers.Single().PasswordHash, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnAddressThatIsNotAnAddressIsRefused()
    {
        var result = await Register(email: "not-an-address");

        Assert.Equal(UserErrorCode.EmailInvalid, result.Errors.Single().Code);
        Assert.Equal("input.email", result.Errors.Single().Field);
    }

    [Fact]
    public async Task AShortPasswordIsRefused()
    {
        var result = await Register(password: "short");

        Assert.Equal(UserErrorCode.PasswordTooShort, result.Errors.Single().Code);
    }

    [Fact]
    public async Task ATakenAddressIsRefused()
    {
        await Register();

        var result = await Register(email: "JANE@example.com");

        Assert.Equal(UserErrorCode.EmailTaken, result.Errors.Single().Code);
    }

    [Fact]
    public async Task AWrongPasswordAnswersOneCodeAndCostsTheSameWork()
    {
        await Register();
        var hashesAfterRegistration = store.PasswordHasher.TimesHashed;

        var wrongPassword = await store.LogIn.Execute(
            Visitor.Anonymous, "jane@example.com", "a wrong password", "a device", "127.0.0.1", CancellationToken.None);
        var unknownCustomer = await store.LogIn.Execute(
            Visitor.Anonymous, "nobody@example.com", "a wrong password", "a device", "127.0.0.1", CancellationToken.None);

        Assert.Equal(UserErrorCode.CredentialsInvalid, wrongPassword.Errors.Single().Code);
        Assert.Equal(UserErrorCode.CredentialsInvalid, unknownCustomer.Errors.Single().Code);
        Assert.Equal(hashesAfterRegistration + 1, store.PasswordHasher.TimesHashed);
    }

    [Fact]
    public async Task TooManyAttemptsAreRateLimited()
    {
        for (var attempt = 0; attempt < 5; attempt += 1)
        {
            await store.LogIn.Execute(
                Visitor.Anonymous, "jane@example.com", "a wrong password", "a device", "127.0.0.1", CancellationToken.None);
        }

        var result = await store.LogIn.Execute(
            Visitor.Anonymous, "jane@example.com", "a wrong password", "a device", "127.0.0.1", CancellationToken.None);

        Assert.Equal(UserErrorCode.RateLimited, result.Errors.Single().Code);
    }

    [Fact]
    public async Task LoggingInTakesOverTheAnonymousCartAndWishlist()
    {
        await Register();
        var customer = store.Customers.Customers.Single();
        await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 2, CancellationToken.None);
        var anonymousCart = store.Carts.Carts.Single(cart => cart.CustomerId is null);
        var anonymousVisitor = new Visitor(null, null, anonymousCart.Id);
        await store.AddToWishlist.Execute(anonymousVisitor, "product-18", CancellationToken.None);

        await store.LogIn.Execute(
            anonymousVisitor,
            "jane@example.com",
            "correct horse battery staple",
            "a device",
            "127.0.0.1",
            CancellationToken.None);

        Assert.Equal(customer.Id, store.Carts.Carts.Single().CustomerId);
        Assert.Equal(customer.Id, store.Wishlist.Entries.Single().OwnerId);
    }

    [Fact]
    public async Task AMergedWishlistAddsAndNeverReplaces()
    {
        await Register();
        var customer = store.Customers.Customers.Single();
        await store.Wishlist.Add(new WishlistEntry(customer.Id, "product-18", Store.Moment), CancellationToken.None);
        var anonymousCart = new Cart("anonymous-cart", null, Store.Moment);
        await store.Carts.Add(anonymousCart, CancellationToken.None);
        await store.Wishlist.Add(new WishlistEntry("anonymous-cart", "product-18", Store.Moment), CancellationToken.None);

        await store.LogIn.Execute(
            new Visitor(null, null, "anonymous-cart"),
            "jane@example.com",
            "correct horse battery staple",
            "a device",
            "127.0.0.1",
            CancellationToken.None);

        Assert.Single(store.Wishlist.Entries);
        Assert.Equal(customer.Id, store.Wishlist.Entries.Single().OwnerId);
    }

    private Task<Result<Authentication>> Register(
        string email = "jane@example.com",
        string password = "correct horse battery staple") =>
        store.RegisterCustomer.Execute(
            Visitor.Anonymous,
            email,
            "Jane Doe",
            password,
            "Chrome on Windows",
            "127.0.0.1",
            CancellationToken.None);
}
```

`tests/Zappy.Application.Tests/SessionUseCaseTests.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class SessionUseCaseTests
{
    private readonly Store store = new(Store.AProduct());

    [Fact]
    public async Task ARefreshRotatesTheTokenAndKeepsTheSession()
    {
        var first = await SignIn();

        var refreshed = await store.RefreshSession.Execute(first.RefreshToken, CancellationToken.None);

        Assert.True(refreshed.Succeeded);
        Assert.NotEqual(first.RefreshToken, refreshed.Value!.RefreshToken);
        Assert.Equal(first.SessionId, refreshed.Value.SessionId);
        Assert.Equal(2, store.Sessions.RefreshTokens.Count);
    }

    [Fact]
    public async Task ARotatedTokenPresentedAgainRevokesTheWholeSession()
    {
        var first = await SignIn();
        await store.RefreshSession.Execute(first.RefreshToken, CancellationToken.None);

        var replayed = await store.RefreshSession.Execute(first.RefreshToken, CancellationToken.None);

        Assert.Equal(UserErrorCode.SessionInvalid, replayed.Errors.Single().Code);
        Assert.False(store.Sessions.Sessions.Single().IsOpenAt(Store.Moment));
    }

    [Fact]
    public async Task AnUnknownTokenIsRefused()
    {
        var result = await store.RefreshSession.Execute("a token nobody issued", CancellationToken.None);

        Assert.Equal(UserErrorCode.SessionInvalid, result.Errors.Single().Code);
    }

    [Fact]
    public async Task NoTokenAtAllIsRefused()
    {
        var result = await store.RefreshSession.Execute(null, CancellationToken.None);

        Assert.Equal(UserErrorCode.SessionInvalid, result.Errors.Single().Code);
    }

    [Fact]
    public async Task LoggingOutClosesTheSessionOfTheRequest()
    {
        var authentication = await SignIn();

        var success = await store.LogOut.Execute(
            new Visitor(authentication.Customer.Id, authentication.SessionId, null),
            null,
            CancellationToken.None);

        Assert.True(success);
        Assert.False(store.Sessions.Sessions.Single().IsOpenAt(Store.Moment));
    }

    [Fact]
    public async Task LoggingOutTwiceIsNotAnError()
    {
        var authentication = await SignIn();
        var visitor = new Visitor(authentication.Customer.Id, authentication.SessionId, null);

        Assert.True(await store.LogOut.Execute(visitor, null, CancellationToken.None));
        Assert.True(await store.LogOut.Execute(visitor, null, CancellationToken.None));
    }

    [Fact]
    public async Task RevokingNeedsASignedInCustomer()
    {
        var result = await store.RevokeSession.Execute(Visitor.Anonymous, "session-01", CancellationToken.None);

        Assert.Equal(UserErrorCode.NotAuthenticated, result.Errors.Single().Code);
    }

    [Fact]
    public async Task ASessionOfSomebodyElseIsNotFound()
    {
        var authentication = await SignIn();

        var result = await store.RevokeSession.Execute(
            new Visitor(authentication.Customer.Id, authentication.SessionId, null),
            "a session of nobody",
            CancellationToken.None);

        Assert.Equal(UserErrorCode.SessionNotFound, result.Errors.Single().Code);
        Assert.Equal("sessionId", result.Errors.Single().Field);
    }

    [Fact]
    public async Task ARevokedSessionLeavesTheList()
    {
        var authentication = await SignIn();

        var result = await store.RevokeSession.Execute(
            new Visitor(authentication.Customer.Id, authentication.SessionId, null),
            authentication.SessionId,
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!);
    }

    [Fact]
    public async Task TwoSessionsOpenedInTheSameSecondListTheNewestFirst()
    {
        var first = await SignIn("Old laptop");
        var second = await SignIn("New phone");

        var open = await store.ListSessions.Execute(first.Customer.Id, CancellationToken.None);

        Assert.Equal(second.SessionId, open[0].Id);
        Assert.Equal(first.SessionId, open[1].Id);
        Assert.Equal(open[0].CreatedAt, open[1].CreatedAt);
    }

    private async Task<Authentication> SignIn(string device = "Chrome on Windows")
    {
        if (store.Customers.Customers.Count == 0)
        {
            return (await store.RegisterCustomer.Execute(
                Visitor.Anonymous,
                "jane@example.com",
                "Jane Doe",
                "correct horse battery staple",
                device,
                "127.0.0.1",
                CancellationToken.None)).Value!;
        }

        return (await store.LogIn.Execute(
            Visitor.Anonymous,
            "jane@example.com",
            "correct horse battery staple",
            device,
            "127.0.0.1",
            CancellationToken.None)).Value!;
    }
}
```

`tests/Zappy.Application.Tests/WishlistUseCaseTests.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class WishlistUseCaseTests
{
    private readonly Store store = new(Store.AProduct(), Store.AProduct("product-05", 69500, 3));

    [Fact]
    public async Task AnAnonymousVisitorKeepsAWishlistAgainstTheCartCookie()
    {
        var result = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.Equal("product-18", result.Products.Single().Id);
        Assert.Equal(store.Carts.Carts.Single().Id, result.AnonymousCartId);
    }

    [Fact]
    public async Task TheAnswerCarriesTheWishlistAfterTheChange()
    {
        var first = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);
        var visitor = new Visitor(null, null, first.AnonymousCartId);

        var second = await store.AddToWishlist.Execute(visitor, "product-05", CancellationToken.None);
        var third = await store.RemoveFromWishlist.Execute(visitor, "product-18", CancellationToken.None);

        Assert.Equal(2, second.Products.Count);
        Assert.Equal("product-05", third.Products.Single().Id);
    }

    [Fact]
    public async Task AddingTheSameProductTwiceChangesNothing()
    {
        var first = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);
        var visitor = new Visitor(null, null, first.AnonymousCartId);

        var second = await store.AddToWishlist.Execute(visitor, "product-18", CancellationToken.None);

        Assert.Single(second.Products);
        Assert.Empty(second.Errors);
    }

    [Fact]
    public async Task AnUnknownProductIsNotFound()
    {
        var result = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-99", CancellationToken.None);

        Assert.Equal(UserErrorCode.ProductNotFound, result.Errors.Single().Code);
    }

    [Fact]
    public async Task RemovingAProductThatIsNotOnTheListIsNotAnError()
    {
        var result = await store.RemoveFromWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.Empty(result.Products);
    }

    [Fact]
    public async Task ASignedInCustomerKeepsTheWishlistAgainstTheCustomer()
    {
        var visitor = new Visitor("customer-01", "session-01", null);

        var result = await store.AddToWishlist.Execute(visitor, "product-18", CancellationToken.None);

        Assert.Null(result.AnonymousCartId);
        Assert.Equal("customer-01", store.Wishlist.Entries.Single().OwnerId);
    }

    [Fact]
    public async Task TheWishlistIsNewestFirst()
    {
        var first = await store.AddToWishlist.Execute(Visitor.Anonymous, "product-18", CancellationToken.None);
        var visitor = new Visitor(null, null, first.AnonymousCartId);
        store.Clock.Now = Store.Moment.AddMinutes(1);

        var second = await store.AddToWishlist.Execute(visitor, "product-05", CancellationToken.None);

        Assert.Equal("product-05", second.Products[0].Id);
    }
}
```

`tests/Zappy.Application.Tests/OrderUseCaseTests.cs`

```csharp
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class OrderUseCaseTests
{
    private readonly Store store = new(Store.AProduct());

    [Fact]
    public async Task PlacingAnOrderNeedsASignedInCustomer()
    {
        var result = await store.PlaceOrder.Execute(Visitor.Anonymous, null, CancellationToken.None);

        Assert.Equal(UserErrorCode.NotAuthenticated, result.Errors.Single().Code);
    }

    [Fact]
    public async Task ACustomerWithoutACartHasNothingToOrder()
    {
        var result = await store.PlaceOrder.Execute(
            new Visitor("customer-01", "session-01", null),
            null,
            CancellationToken.None);

        Assert.Equal(UserErrorCode.CartEmpty, result.Errors.Single().Code);
    }

    [Fact]
    public async Task AnOrderEmptiesTheCartAndTheSecondCallSaysSo()
    {
        var visitor = await ACustomerWithACart();

        var first = await store.PlaceOrder.Execute(visitor, "checkout-1", CancellationToken.None);
        var second = await store.PlaceOrder.Execute(visitor, "checkout-1", CancellationToken.None);

        Assert.True(first.Succeeded);
        Assert.Equal(UserErrorCode.CartEmpty, second.Errors.Single().Code);
        Assert.Single(store.Orders.Orders);
    }

    [Fact]
    public async Task AnOrderRaisesTheEventTheMailAndThePromotionsReactTo()
    {
        var visitor = await ACustomerWithACart();

        await store.PlaceOrder.Execute(visitor, null, CancellationToken.None);

        Assert.IsType<OrderPlaced>(Assert.Single(store.Dispatcher.Dispatched));
    }

    [Fact]
    public async Task TheConfirmationMailNamesTheOrder()
    {
        var visitor = await ACustomerWithACart();
        var placed = await store.PlaceOrder.Execute(visitor, null, CancellationToken.None);

        await store.SendOrderConfirmation.Handle(
            (OrderPlaced)store.Dispatcher.Dispatched.Single(),
            CancellationToken.None);

        Assert.Equal(placed.Value!.Number, store.Mailer.Sent.Single().Number);
    }

    [Fact]
    public async Task ThePromotionModuleCountsTheUse()
    {
        var visitor = await ACustomerWithACart();
        await store.ApplyPromotionCode.Execute(visitor, "WELCOME10", CancellationToken.None);
        await store.PlaceOrder.Execute(visitor, null, CancellationToken.None);

        await store.RecordPromotionUse.Handle(
            (OrderPlaced)store.Dispatcher.Dispatched.Single(),
            CancellationToken.None);

        Assert.Equal(1, store.PromotionCodes.Codes.Single(code => code.Code == "WELCOME10").TimesUsed);
    }

    [Fact]
    public async Task AnOrderWithoutACodeCountsNothing()
    {
        var visitor = await ACustomerWithACart();
        await store.PlaceOrder.Execute(visitor, null, CancellationToken.None);

        await store.RecordPromotionUse.Handle(
            (OrderPlaced)store.Dispatcher.Dispatched.Single(),
            CancellationToken.None);

        Assert.Equal(0, store.PromotionCodes.Codes.Single(code => code.Code == "WELCOME10").TimesUsed);
    }

    private async Task<Visitor> ACustomerWithACart()
    {
        var registered = await store.RegisterCustomer.Execute(
            Visitor.Anonymous,
            "jane@example.com",
            "Jane Doe",
            "correct horse battery staple",
            "Chrome on Windows",
            "127.0.0.1",
            CancellationToken.None);

        var visitor = new Visitor(registered.Value!.Customer.Id, registered.Value.SessionId, null);
        await store.AddToCart.Execute(visitor, "product-18", 2, CancellationToken.None);
        return visitor;
    }
}
```

### The adapter tests

`tests/Zappy.Adapters.Tests/Zappy.Adapters.Tests.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <RootNamespace>Zappy.Adapters.Tests</RootNamespace>
    <OutputType>Exe</OutputType>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" />
    <PackageReference Include="xunit.v3" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\Zappy.Host\Zappy.Host.csproj" />
  </ItemGroup>

  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>

</Project>
```

`tests/Zappy.Adapters.Tests/TheRepository.cs`

```csharp
namespace Zappy.Adapters.Tests;

public static class TheRepository
{
    public static string Root
    {
        get
        {
            var folder = new DirectoryInfo(AppContext.BaseDirectory);
            while (folder is not null)
            {
                if (Directory.Exists(Path.Combine(folder.FullName, "contract", "seed")))
                {
                    return folder.FullName;
                }

                folder = folder.Parent;
            }

            throw new DirectoryNotFoundException("The repository root with contract/seed was not found.");
        }
    }
}
```

`tests/Zappy.Adapters.Tests/FrozenClock.cs`

```csharp
using Zappy.Application;

namespace Zappy.Adapters.Tests;

public sealed class FrozenClock(DateTimeOffset now) : IClock
{
    public DateTimeOffset Now { get; } = now;
}
```

`tests/Zappy.Adapters.Tests/ASqliteStore.cs`

```csharp
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Zappy.Adapters.Persistence;
using Zappy.Adapters.Security;
using Zappy.Application;

namespace Zappy.Adapters.Tests;

public sealed class ASqliteStore : IDisposable
{
    private readonly string databaseFile = Path.Combine(
        Path.GetTempPath(),
        $"zappy-mart-store-{Guid.CreateVersion7():n}.db");

    public ASqliteStore()
    {
        Database = new SqliteZappyDbContext(new DbContextOptionsBuilder<SqliteZappyDbContext>()
            .UseSqlite($"Data Source={databaseFile}")
            .Options);

        Database.Database.Migrate();
    }

    public SqliteZappyDbContext Database { get; }

    public SecuritySettings Settings { get; } = new() { Argon2MemoryKibibytes = 1024 };

    public IPasswordHasher PasswordHasher => new Argon2idPasswordHasher(Settings);

    public ITokenIssuer TokenIssuer => new JwtTokenIssuer(new SigningKeys(Settings), Settings);

    public ProductCatalogueVersion CatalogueVersion { get; } = new();

    public async Task<int> LoadTheSeed()
    {
        var loader = new SeedLoader(Database, PasswordHasher, CatalogueVersion, new SeedSettings());
        var loaded = await loader.LoadFreshSeed(TestContext.Current.CancellationToken);
        Database.ChangeTracker.Clear();
        return loaded;
    }

    public void Dispose()
    {
        Database.Dispose();
        SqliteConnection.ClearAllPools();

        if (File.Exists(databaseFile))
        {
            File.Delete(databaseFile);
        }
    }
}
```

`tests/Zappy.Adapters.Tests/ZappyServer.cs`

```csharp
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Zappy.Adapters.Tests;

public sealed class ZappyServer : WebApplicationFactory<Program>
{
    private readonly string databaseFile = Path.Combine(
        Path.GetTempPath(),
        $"zappy-mart-test-{Guid.CreateVersion7():n}.db");

    public HttpClient AVisitor() => CreateClient();

    public HttpClient AVisitorWhoCarriesCookiesByHand() =>
        CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    public async Task<AnswerWithCookies> AskCarryingCookies(
        HttpClient visitor,
        string operation,
        string? cookie = null,
        string? accessToken = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/graphql")
        {
            Content = JsonContent.Create(new { query = operation })
        };

        request.Headers.Add("Origin", "http://localhost:5173");

        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        if (accessToken is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {accessToken}");
        }

        using var response = await visitor.SendAsync(request, TestContext.Current.CancellationToken);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        var cookies = response.Headers.TryGetValues("Set-Cookie", out var values) ? values.ToList() : [];
        return new AnswerWithCookies(JsonDocument.Parse(body).RootElement.Clone(), cookies);
    }

    public async Task<JsonElement> Ask(
        HttpClient visitor,
        string operation,
        object? variables = null,
        string? origin = "http://localhost:5173",
        string? accessToken = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/graphql")
        {
            Content = JsonContent.Create(new { query = operation, variables })
        };

        if (origin is not null)
        {
            request.Headers.Add("Origin", origin);
        }

        if (accessToken is not null)
        {
            request.Headers.Add("Authorization", $"Bearer {accessToken}");
        }

        using var response = await visitor.SendAsync(request, TestContext.Current.CancellationToken);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return JsonDocument.Parse(body).RootElement.Clone();
    }

    public async Task<string> ServedSchema()
    {
        using var visitor = CreateClient();
        return await visitor.GetStringAsync("/graphql?sdl", TestContext.Current.CancellationToken);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("Database:ConnectionString", $"Data Source={databaseFile}");
        builder.UseSetting("Seed:LoadAtStart", "true");
        builder.UseSetting("GraphQL:ExposeResetSeed", "true");
        builder.UseSetting("GraphQL:IncludeExceptionDetails", "true");
        builder.UseSetting("Security:Argon2MemoryKibibytes", "1024");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (!disposing)
        {
            return;
        }

        SqliteConnection.ClearAllPools();

        if (File.Exists(databaseFile))
        {
            File.Delete(databaseFile);
        }
    }
}
```

`tests/Zappy.Adapters.Tests/AnswerWithCookies.cs`

```csharp
using System.Text.Json;

namespace Zappy.Adapters.Tests;

public sealed record AnswerWithCookies(JsonElement Answer, IReadOnlyList<string> SetCookies)
{
    public string? CookieCalled(string name) => SetCookies
        .Select(header => header.Split(';')[0])
        .FirstOrDefault(pair => pair.StartsWith($"{name}=", StringComparison.Ordinal));
}
```

`tests/Zappy.Adapters.Tests/Answers.cs`

```csharp
using System.Globalization;
using System.Text.Json;

namespace Zappy.Adapters.Tests;

public static class Answers
{
    public static JsonElement At(this JsonElement answer, params string[] path)
    {
        var found = answer;
        foreach (var step in path)
        {
            found = found.ValueKind == JsonValueKind.Array
                ? found[int.Parse(step, CultureInfo.InvariantCulture)]
                : found.GetProperty(step);
        }

        return found;
    }

    public static int Number(this JsonElement answer, params string[] path) => answer.At(path).GetInt32();

    public static string Text(this JsonElement answer, params string[] path) => answer.At(path).GetString()!;

    public static string FirstErrorCode(this JsonElement answer, params string[] path) =>
        answer.At(path).EnumerateArray().First().GetProperty("code").GetString()!;
}
```

`tests/Zappy.Adapters.Tests/SchemaShape.cs`

```csharp
using System.Globalization;
using System.Text;
using HotChocolate.Language;

namespace Zappy.Adapters.Tests;

public static class SchemaShape
{
    public static Dictionary<string, Dictionary<string, string>> Of(string schemaText)
    {
        var shape = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal);

        foreach (var definition in Utf8GraphQLParser.Parse(schemaText).Definitions)
        {
            switch (definition)
            {
                case ObjectTypeDefinitionNode objectType:
                    Merge(shape, objectType.Name.Value, FieldsOf(objectType.Fields));
                    break;
                case ObjectTypeExtensionNode objectTypeExtension:
                    Merge(shape, objectTypeExtension.Name.Value, FieldsOf(objectTypeExtension.Fields));
                    break;
                case InputObjectTypeDefinitionNode inputType:
                    Merge(shape, inputType.Name.Value, InputFieldsOf(inputType.Fields));
                    break;
                case EnumTypeDefinitionNode enumType:
                    Merge(shape, enumType.Name.Value, enumType.Values.ToDictionary(
                        value => value.Name.Value,
                        _ => "enum value",
                        StringComparer.Ordinal));
                    break;
                case ScalarTypeDefinitionNode scalarType:
                    Merge(shape, scalarType.Name.Value, []);
                    break;
            }
        }

        return shape;
    }

    private static void Merge(
        Dictionary<string, Dictionary<string, string>> shape,
        string name,
        Dictionary<string, string> members)
    {
        if (!shape.TryGetValue(name, out var known))
        {
            shape[name] = members;
            return;
        }

        foreach (var member in members)
        {
            known[member.Key] = member.Value;
        }
    }

    private static Dictionary<string, string> FieldsOf(IReadOnlyList<FieldDefinitionNode> fields) =>
        fields.ToDictionary(field => field.Name.Value, Signature, StringComparer.Ordinal);

    private static Dictionary<string, string> InputFieldsOf(IReadOnlyList<InputValueDefinitionNode> fields) =>
        fields.ToDictionary(field => field.Name.Value, Signature, StringComparer.Ordinal);

    private static string Signature(FieldDefinitionNode field)
    {
        var signature = new StringBuilder();
        if (field.Arguments.Count > 0)
        {
            signature.Append('(');
            signature.AppendJoin(", ", field.Arguments.Select(argument =>
                string.Create(CultureInfo.InvariantCulture, $"{argument.Name.Value}: {Signature(argument)}")));
            signature.Append(')');
        }

        signature.Append(": ").Append(field.Type.ToString(false));
        return signature.ToString();
    }

    private static string Signature(InputValueDefinitionNode field)
    {
        var signature = field.Type.ToString(false);
        return field.DefaultValue is null or NullValueNode
            ? signature
            : $"{signature} = {field.DefaultValue.ToString(false)}";
    }
}
```

`tests/Zappy.Adapters.Tests/ContractSchemaTests.cs`

```csharp
namespace Zappy.Adapters.Tests;

public sealed class ContractSchemaTests(ZappyServer server) : IClassFixture<ZappyServer>
{
    [Fact]
    public async Task TheStoreServesEveryTypeOfTheContract()
    {
        var contract = SchemaShape.Of(await File.ReadAllTextAsync(
            Path.Combine(TheRepository.Root, "contract", "schema.graphql"),
            TestContext.Current.CancellationToken));
        var served = SchemaShape.Of(await server.ServedSchema());

        foreach (var type in contract)
        {
            Assert.True(served.ContainsKey(type.Key), $"The served schema has no type {type.Key}.");

            foreach (var member in type.Value)
            {
                Assert.True(
                    served[type.Key].ContainsKey(member.Key),
                    $"The served type {type.Key} has no member {member.Key}.");
                Assert.Equal($"{type.Key}.{member.Key}{member.Value}", $"{type.Key}.{member.Key}{served[type.Key][member.Key]}");
            }
        }
    }

    [Fact]
    public async Task TheDevelopmentProfileAddsResetSeed()
    {
        var development = SchemaShape.Of(await File.ReadAllTextAsync(
            Path.Combine(TheRepository.Root, "contract", "schema.development.graphql"),
            TestContext.Current.CancellationToken));
        var served = SchemaShape.Of(await server.ServedSchema());

        foreach (var type in development)
        {
            foreach (var member in type.Value)
            {
                Assert.True(
                    served[type.Key].ContainsKey(member.Key),
                    $"The served type {type.Key} has no member {member.Key}.");
                Assert.Equal(member.Value, served[type.Key][member.Key]);
            }
        }
    }
}
```

This is the test that keeps the promise the whole family rests on. It parses
`contract/schema.graphql`, parses the schema the running store serves, and asserts that
every type, every field, every argument, every default value and every enum value of the
contract is there with the same signature. A renamed field or a nullability that slipped
fails here rather than in a frontend.

`tests/Zappy.Adapters.Tests/SeedLoaderTests.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Zappy.Domain;

namespace Zappy.Adapters.Tests;

public sealed class SeedLoaderTests : IDisposable
{
    private readonly ASqliteStore store = new();

    [Fact]
    public async Task TheSeedLoadsTheWholeStore()
    {
        var loaded = await store.LoadTheSeed();

        Assert.Equal(20, loaded);
        Assert.Equal(20, await store.Database.Products.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(4, await store.Database.Categories.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(5, await store.Database.PromotionCodes.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(1, await store.Database.Customers.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task TheCatalogueKeepsTheOrderOfTheSeedFile()
    {
        await store.LoadTheSeed();

        var catalogue = await store.Database.Products
            .OrderBy(product => product.CatalogueOrder)
            .Select(product => product.Id)
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.Equal("product-01", catalogue[0]);
        Assert.Equal("product-20", catalogue[^1]);
    }

    [Fact]
    public async Task TheTwoStockRulesOfTheSeedHold()
    {
        await store.LoadTheSeed();

        var ring = await store.Database.Products.SingleAsync(
            product => product.Id == "product-07", TestContext.Current.CancellationToken);
        var drive = await store.Database.Products.SingleAsync(
            product => product.Id == "product-12", TestContext.Current.CancellationToken);

        Assert.Equal(0, ring.Stock);
        Assert.Equal(1, drive.Stock);
    }

    [Fact]
    public async Task ThePriceIsAnIntegerAmountInEuro()
    {
        await store.LoadTheSeed();

        var jacket = await store.Database.Products.SingleAsync(
            product => product.Slug == "mens-cotton-jacket", TestContext.Current.CancellationToken);

        Assert.Equal(Money.Euro(5599), jacket.Price);
    }

    [Fact]
    public async Task ThePasswordOfTheSeedCustomerIsHashedAndVerifies()
    {
        await store.LoadTheSeed();

        var customer = await store.Database.Customers.SingleAsync(TestContext.Current.CancellationToken);

        Assert.StartsWith("$argon2id$", customer.PasswordHash, StringComparison.Ordinal);
        Assert.DoesNotContain("correct horse battery staple", customer.PasswordHash, StringComparison.Ordinal);
        Assert.True(store.PasswordHasher.Matches("correct horse battery staple", customer.PasswordHash));
    }

    [Fact]
    public async Task ThePromotionCodesCarryTheirWindowsAndTheirUses()
    {
        await store.LoadTheSeed();

        var once = await store.Database.PromotionCodes.SingleAsync(
            code => code.Code == "ONCE", TestContext.Current.CancellationToken);
        var fiveOff = await store.Database.PromotionCodes.SingleAsync(
            code => code.Code == "FIVEOFF", TestContext.Current.CancellationToken);

        Assert.Equal(1, once.UsageLimit);
        Assert.Equal(1, once.TimesUsed);
        Assert.Equal(Money.Euro(500), fiveOff.Amount);
        Assert.Equal(Money.Euro(2500), fiveOff.MinimumSubtotal);
    }

    [Fact]
    public async Task LoadingTheSeedAgainThrowsTheOldStoreAway()
    {
        await store.LoadTheSeed();
        store.Database.Carts.Add(new Cart("cart-01", null, DateTimeOffset.UtcNow));
        await store.Database.SaveChangesAsync(TestContext.Current.CancellationToken);

        await store.LoadTheSeed();

        Assert.Equal(0, await store.Database.Carts.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(20, await store.Database.Products.CountAsync(TestContext.Current.CancellationToken));
    }

    public void Dispose() => store.Dispose();
}
```

`tests/Zappy.Adapters.Tests/Argon2idPasswordHasherTests.cs`

```csharp
using Zappy.Adapters.Security;

namespace Zappy.Adapters.Tests;

public sealed class Argon2idPasswordHasherTests
{
    private readonly SecuritySettings settings = new() { Argon2MemoryKibibytes = 1024 };

    [Fact]
    public void AHashCarriesTheParametersItWasMadeWith()
    {
        var hash = new Argon2idPasswordHasher(settings).Hash("correct horse battery staple");

        Assert.StartsWith("$argon2id$v=19$m=1024,t=2,p=1$", hash, StringComparison.Ordinal);
    }

    [Fact]
    public void ThePasswordItselfIsNowhereInTheHash()
    {
        var hash = new Argon2idPasswordHasher(settings).Hash("correct horse battery staple");

        Assert.DoesNotContain("correct horse battery staple", hash, StringComparison.Ordinal);
    }

    [Fact]
    public void TheSamePasswordHashesDifferentlyEveryTime()
    {
        var hasher = new Argon2idPasswordHasher(settings);

        Assert.NotEqual(hasher.Hash("correct horse battery staple"), hasher.Hash("correct horse battery staple"));
    }

    [Fact]
    public void AHashMatchesItsOwnPasswordAndNoOther()
    {
        var hasher = new Argon2idPasswordHasher(settings);
        var hash = hasher.Hash("correct horse battery staple");

        Assert.True(hasher.Matches("correct horse battery staple", hash));
        Assert.False(hasher.Matches("correct horse battery stapler", hash));
    }

    [Fact]
    public void AHashOfAnotherShapeIsRefusedRatherThanThrown()
    {
        var hasher = new Argon2idPasswordHasher(settings);

        Assert.False(hasher.Matches("correct horse battery staple", "not a hash at all"));
    }

    [Fact]
    public void AHashMadeWithOtherParametersStillVerifies()
    {
        var hash = new Argon2idPasswordHasher(new SecuritySettings
        {
            Argon2MemoryKibibytes = 2048,
            Argon2Iterations = 3
        }).Hash("correct horse battery staple");

        Assert.True(new Argon2idPasswordHasher(settings).Matches("correct horse battery staple", hash));
    }
}
```

`tests/Zappy.Adapters.Tests/ProductRepositoryTests.cs`

```csharp
using Zappy.Adapters.Persistence;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Tests;

public sealed class ProductRepositoryTests : IDisposable
{
    private readonly ASqliteStore store = new();

    [Fact]
    public async Task ThePageStopsAtTheAskedSize()
    {
        var products = await ALoadedCatalogue();

        var page = await products.Matching(
            ProductSpecification.WholeCatalogue, 5, null, TestContext.Current.CancellationToken);

        Assert.Equal(5, page.Items.Count);
        Assert.Equal(20, page.TotalCount);
        Assert.True(page.HasNextPage);
        Assert.Equal("product-01", page.Items[0].Id);
    }

    [Fact]
    public async Task ACursorContinuesWhereThePageStopped()
    {
        var products = await ALoadedCatalogue();

        var page = await products.Matching(
            ProductSpecification.WholeCatalogue, 5, "product-05", TestContext.Current.CancellationToken);

        Assert.Equal("product-06", page.Items[0].Id);
    }

    [Fact]
    public async Task TheLastPageSaysSo()
    {
        var products = await ALoadedCatalogue();

        var page = await products.Matching(
            ProductSpecification.WholeCatalogue, 100, null, TestContext.Current.CancellationToken);

        Assert.Equal(20, page.Items.Count);
        Assert.False(page.HasNextPage);
    }

    [Fact]
    public async Task TheSpecificationReachesTheDatabase()
    {
        var products = await ALoadedCatalogue();

        var jewellery = await products.Matching(
            new ProductSpecification("jewellery", null, false), 24, null, TestContext.Current.CancellationToken);
        var byName = await products.Matching(
            new ProductSpecification(null, "COTTON", false), 24, null, TestContext.Current.CancellationToken);
        var inStock = await products.Matching(
            new ProductSpecification(null, null, true), 24, null, TestContext.Current.CancellationToken);

        Assert.Equal(4, jewellery.TotalCount);
        Assert.Equal(2, byName.TotalCount);
        Assert.Equal("mens-cotton-jacket", byName.Items[0].Slug);
        Assert.Equal(19, inStock.TotalCount);
    }

    [Fact]
    public async Task AProductCarriesItsCategory()
    {
        var products = await ALoadedCatalogue();

        var product = await products.WithSlug("mens-cotton-jacket", TestContext.Current.CancellationToken);

        Assert.Equal("Men's clothing", product!.Category.Name);
        Assert.Equal(Money.Euro(5599), product.Price);
    }

    public void Dispose() => store.Dispose();

    private async Task<IProductRepository> ALoadedCatalogue()
    {
        await store.LoadTheSeed();
        return new ProductRepository(store.Database);
    }
}
```

`tests/Zappy.Adapters.Tests/CachedProductRepositoryTests.cs`

```csharp
using Microsoft.Extensions.Caching.Memory;
using Zappy.Adapters.Persistence;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Tests;

public sealed class CachedProductRepositoryTests
{
    private readonly CountingProducts inner = new();
    private readonly ProductCatalogueVersion version = new();
    private readonly MemoryCache cache = new(new MemoryCacheOptions());

    [Fact]
    public async Task TheSamePageIsReadOnceAndAnsweredTwice()
    {
        var cached = ACachedRepository();

        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);
        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);

        Assert.Equal(1, inner.TimesAsked);
    }

    [Fact]
    public async Task ADifferentPageIsADifferentRead()
    {
        var cached = ACachedRepository();

        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);
        await cached.Matching(ProductSpecification.WholeCatalogue, 24, "product-01", TestContext.Current.CancellationToken);
        await cached.Matching(new ProductSpecification("jewellery", null, false), 24, null, TestContext.Current.CancellationToken);

        Assert.Equal(3, inner.TimesAsked);
    }

    [Fact]
    public async Task AChangedCatalogueIsReadAgain()
    {
        var cached = ACachedRepository();

        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);
        version.Bump();
        await cached.Matching(ProductSpecification.WholeCatalogue, 24, null, TestContext.Current.CancellationToken);

        Assert.Equal(2, inner.TimesAsked);
    }

    [Fact]
    public async Task AProductForAMutationIsNeverServedFromTheCache()
    {
        var cached = ACachedRepository();

        await cached.WithId("product-01", TestContext.Current.CancellationToken);
        await cached.WithId("product-01", TestContext.Current.CancellationToken);

        Assert.Equal(2, inner.TimesAsked);
    }

    private CachedProductRepository ACachedRepository() => new(inner, cache, version);

    private sealed class CountingProducts : IProductRepository
    {
        public int TimesAsked { get; private set; }

        public Task<Page<Product>> Matching(
            ProductSpecification specification,
            int first,
            string? afterProductId,
            CancellationToken cancellationToken)
        {
            TimesAsked += 1;
            return Task.FromResult(Page<Product>.Empty);
        }

        public Task<Product?> WithSlug(string slug, CancellationToken cancellationToken)
        {
            TimesAsked += 1;
            return Task.FromResult<Product?>(null);
        }

        public Task<Product?> WithId(string id, CancellationToken cancellationToken)
        {
            TimesAsked += 1;
            return Task.FromResult<Product?>(null);
        }

        public Task<IReadOnlyList<Product>> WithIds(IReadOnlyList<string> ids, CancellationToken cancellationToken)
        {
            TimesAsked += 1;
            return Task.FromResult<IReadOnlyList<Product>>([]);
        }
    }
}
```

`tests/Zappy.Adapters.Tests/SessionOrderTests.cs`

```csharp
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
```

The two session tests are the ones a fast machine would otherwise find first. Two logins
inside the same clock reading have to list the newest first, and a moment has to keep
its full precision on the way into the store.

`tests/Zappy.Adapters.Tests/StoreOverGraphQLTests.cs`

```csharp
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
```

`tests/Zappy.Adapters.Tests/AccountsOverGraphQLTests.cs`

```csharp
using System.Text.Json;

namespace Zappy.Adapters.Tests;

public sealed class AccountsOverGraphQLTests(ZappyServer server) : IClassFixture<ZappyServer>
{
    private const string TheSeedPassword = "correct horse battery staple";

    [Fact]
    public async Task ALoginAnswersAnAccessTokenAndSetsTheRefreshCookie()
    {
        var visitor = await AFreshVisitor();

        var answer = await LogIn(visitor);

        Assert.Equal("jane@example.com", answer.Text("data", "login", "customer", "email"));
        Assert.False(string.IsNullOrWhiteSpace(answer.Text("data", "login", "accessToken")));
        Assert.EndsWith("Z", answer.Text("data", "login", "accessTokenExpiresAt"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task TheLoginAnswerAlreadyMarksItsOwnSessionAsTheCurrentOne()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(
            visitor,
            "mutation { login(input: { email: \"jane@example.com\", password: \"" + TheSeedPassword
                + "\", device: \"Chrome on Windows\" }) { customer { sessions { device current } } errors { code } } }");

        Assert.True(answer.At("data", "login", "customer", "sessions", "0", "current").GetBoolean());
    }

    [Fact]
    public async Task AWrongPasswordAnswersOneCode()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(
            visitor,
            "mutation { login(input: { email: \"jane@example.com\", password: \"a wrong password\" }) { customer { id } errors { code } } }");

        Assert.Equal("CREDENTIALS_INVALID", answer.FirstErrorCode("data", "login", "errors"));
        Assert.Equal(JsonValueKind.Null, answer.At("data", "login", "customer").ValueKind);
    }

    [Fact]
    public async Task AnAddressThatIsTakenIsRefused()
    {
        var visitor = await AFreshVisitor();

        var answer = await server.Ask(
            visitor,
            "mutation { register(input: { email: \"JANE@example.com\", name: \"Jane\", password: \"a long enough password\" }) { errors { code field } } }");

        Assert.Equal("EMAIL_TAKEN", answer.FirstErrorCode("data", "register", "errors"));
    }

    [Fact]
    public async Task ARefreshRotatesTheTokenAndAReplayRevokesTheWholeSession()
    {
        var visitor = server.AVisitorWhoCarriesCookiesByHand();
        await server.AskCarryingCookies(visitor, "mutation { resetSeed { success } }");
        var signedIn = await server.AskCarryingCookies(visitor, TheLoginOperation);
        var firstCookie = signedIn.CookieCalled("zappy_refresh")!;
        var accessToken = signedIn.Answer.Text("data", "login", "accessToken");

        var rotated = await server.AskCarryingCookies(
            visitor,
            "mutation { refreshSession { accessToken errors { code } } }",
            firstCookie);
        var replayed = await server.AskCarryingCookies(
            visitor,
            "mutation { refreshSession { errors { code } } }",
            firstCookie);
        var afterTheReplay = await server.AskCarryingCookies(
            visitor,
            "{ me { id } }",
            accessToken: accessToken);

        Assert.Empty(rotated.Answer.At("data", "refreshSession", "errors").EnumerateArray());
        Assert.NotEqual(firstCookie, rotated.CookieCalled("zappy_refresh"));
        Assert.Equal("SESSION_INVALID", replayed.Answer.FirstErrorCode("data", "refreshSession", "errors"));
        Assert.Equal(JsonValueKind.Null, afterTheReplay.Answer.At("data", "me").ValueKind);
    }

    [Fact]
    public async Task LoggingOutStopsTheAccessTokenAtOnce()
    {
        var visitor = await AFreshVisitor();
        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");

        var before = await server.Ask(visitor, "{ me { id } }", accessToken: accessToken);
        await server.Ask(visitor, "mutation { logout { success } }", accessToken: accessToken);
        var after = await server.Ask(visitor, "{ me { id } }", accessToken: accessToken);

        Assert.Equal("customer-01", before.Text("data", "me", "id"));
        Assert.Equal(JsonValueKind.Null, after.At("data", "me").ValueKind);
    }

    [Fact]
    public async Task ASessionListsItselfAsTheCurrentOne()
    {
        var visitor = await AFreshVisitor();
        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");

        var answer = await server.Ask(
            visitor,
            "{ me { sessions { device current } } }",
            accessToken: accessToken);

        Assert.Equal("Chrome on Windows", answer.Text("data", "me", "sessions", "0", "device"));
        Assert.True(answer.At("data", "me", "sessions", "0", "current").GetBoolean());
    }

    [Fact]
    public async Task RevokingTheCurrentSessionStopsItAtOnce()
    {
        var visitor = await AFreshVisitor();
        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");
        var sessionId = (await server.Ask(visitor, "{ me { sessions { id } } }", accessToken: accessToken))
            .Text("data", "me", "sessions", "0", "id");

        var revoked = await server.Ask(
            visitor,
            "mutation ($sessionId: ID!) { revokeSession(sessionId: $sessionId) { sessions { id } errors { code } } }",
            new { sessionId },
            accessToken: accessToken);
        var after = await server.Ask(visitor, "{ me { id } }", accessToken: accessToken);

        Assert.Empty(revoked.At("data", "revokeSession", "sessions").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, after.At("data", "me").ValueKind);
    }

    [Fact]
    public async Task AnUnknownSessionIsNotFound()
    {
        var visitor = await AFreshVisitor();
        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");

        var answer = await server.Ask(
            visitor,
            "mutation { revokeSession(sessionId: \"a session of nobody\") { errors { code field } } }",
            accessToken: accessToken);

        Assert.Equal("SESSION_NOT_FOUND", answer.FirstErrorCode("data", "revokeSession", "errors"));
    }

    [Fact]
    public async Task TheAnonymousWishlistAndCartMoveToTheCustomerOnLogin()
    {
        var visitor = await AFreshVisitor();
        await server.Ask(visitor, "mutation { addToWishlist(productId: \"product-05\") { products { id } errors { code } } }");
        await server.Ask(visitor, "mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }");

        var accessToken = (await LogIn(visitor)).Text("data", "login", "accessToken");
        var answer = await server.Ask(
            visitor,
            "{ me { wishlist { id } } cart { lines { quantity } } }",
            accessToken: accessToken);

        Assert.Equal("product-05", answer.Text("data", "me", "wishlist", "0", "id"));
        Assert.Equal(2, answer.Number("data", "cart", "lines", "0", "quantity"));
    }

    private const string TheLoginOperation =
        "mutation { login(input: { email: \"jane@example.com\", password: \"" + TheSeedPassword
        + "\", device: \"Chrome on Windows\" }) { customer { id email } accessToken accessTokenExpiresAt errors { code } } }";

    private Task<JsonElement> LogIn(HttpClient visitor) => server.Ask(visitor, TheLoginOperation);

    private async Task<HttpClient> AFreshVisitor()
    {
        var visitor = server.AVisitor();
        await server.Ask(visitor, "mutation { resetSeed { success } }");
        return visitor;
    }
}
```

`tests/Zappy.Adapters.Tests/OrderingOverGraphQLTests.cs`

```csharp
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
```

`tests/Zappy.Adapters.Tests/OriginCheckTests.cs`

```csharp
using System.Text.Json;

namespace Zappy.Adapters.Tests;

public sealed class OriginCheckTests(ZappyServer server) : IClassFixture<ZappyServer>
{
    [Fact]
    public async Task AMutationWithoutAnOriginIsRefusedBeforeTheResolver()
    {
        var answer = await server.Ask(
            server.AVisitor(),
            "mutation { addToCart(productId: \"product-01\") { cart { id } } }",
            origin: null);

        Assert.Equal("ORIGIN_NOT_ALLOWED", answer.Text("errors", "0", "extensions", "code"));
        Assert.False(answer.TryGetProperty("data", out _));
    }

    [Fact]
    public async Task AMutationFromAForeignOriginIsRefused()
    {
        var answer = await server.Ask(
            server.AVisitor(),
            "mutation { logout { success } }",
            origin: "http://evil.example");

        Assert.Equal("ORIGIN_NOT_ALLOWED", answer.Text("errors", "0", "extensions", "code"));
    }

    [Theory]
    [InlineData("http://localhost:5173")]
    [InlineData("http://localhost:3001")]
    [InlineData("http://localhost:4200")]
    public async Task AMutationFromEveryFrontendOfTheFamilyRuns(string origin)
    {
        var answer = await server.Ask(server.AVisitor(), "mutation { logout { success } }", origin: origin);

        Assert.True(answer.At("data", "logout", "success").GetBoolean());
    }

    [Fact]
    public async Task AQueryNeedsNoOrigin()
    {
        var answer = await server.Ask(server.AVisitor(), "{ categories { slug } }", origin: null);

        Assert.Equal(4, answer.At("data", "categories").GetArrayLength());
    }

    [Fact]
    public async Task AMutationInADocumentWithSeveralOperationsIsStillChecked()
    {
        var answer = await server.Ask(
            server.AVisitor(),
            "query Read { categories { slug } } mutation Change { logout { success } }",
            variables: null,
            origin: null);

        Assert.Equal(JsonValueKind.Array, answer.At("errors").ValueKind);
    }
}
```

### Running them

```bash
cd backends/dotnet
dotnet test
```

A passing run prints:

```text
Running tests from C:\Src\zappy-mart\backends\dotnet\tests\Zappy.Adapters.Tests\bin\Debug\net10.0\Zappy.Adapters.Tests.dll (net10.0|x64)
Running tests from C:\Src\zappy-mart\backends\dotnet\tests\Zappy.Domain.Tests\bin\Debug\net10.0\Zappy.Domain.Tests.dll (net10.0|x64)
Running tests from C:\Src\zappy-mart\backends\dotnet\tests\Zappy.Application.Tests\bin\Debug\net10.0\Zappy.Application.Tests.dll (net10.0|x64)
C:\Src\zappy-mart\backends\dotnet\tests\Zappy.Domain.Tests\bin\Debug\net10.0\Zappy.Domain.Tests.dll (net10.0|x64) passed (1s 511ms)
C:\Src\zappy-mart\backends\dotnet\tests\Zappy.Application.Tests\bin\Debug\net10.0\Zappy.Application.Tests.dll (net10.0|x64) passed (1s 525ms)
C:\Src\zappy-mart\backends\dotnet\tests\Zappy.Adapters.Tests\bin\Debug\net10.0\Zappy.Adapters.Tests.dll (net10.0|x64) passed (10s 799ms)

Test run summary: Passed!
  C:\Src\zappy-mart\backends\dotnet\tests\Zappy.Domain.Tests\bin\Debug\net10.0\Zappy.Domain.Tests.dll (net10.0|x64) passed (1s 511ms)
  C:\Src\zappy-mart\backends\dotnet\tests\Zappy.Adapters.Tests\bin\Debug\net10.0\Zappy.Adapters.Tests.dll (net10.0|x64) passed (10s 799ms)
  C:\Src\zappy-mart\backends\dotnet\tests\Zappy.Application.Tests\bin\Debug\net10.0\Zappy.Application.Tests.dll (net10.0|x64) passed (1s 525ms)

  total: 173
  failed: 0
  succeeded: 173
  skipped: 0
  duration: 11s 233ms
```

## Every operation, with its answer

The store below is the seed, freshly loaded. Every request goes to
`http://localhost:8090/graphql` as a POST with a JSON body of `query` and, where there
are any, `variables`. Mutations carry an `Origin` header the store allows.

```bash
curl http://localhost:8090/graphql \
  --header "Content-Type: application/json" \
  --header "Origin: http://localhost:5173" \
  --cookie-jar jar.txt --cookie jar.txt \
  --data '{"query":"{ categories { id name slug } }"}'
```

The cookie jar matters from the first cart mutation onwards, because that is where the
store sets `zappy_cart`, and again at login, where it sets `zappy_refresh`.

### The catalogue, one page at a time

```graphql
{
  products(first: 2) {
    totalCount
    pageInfo { hasNextPage endCursor }
    edges {
      cursor
      node { id name slug price { amount currency } category { slug } stock imageUrl }
    }
  }
}
```

Answer:

```json
{
  "data": {
    "products": {
      "totalCount": 20,
      "pageInfo": {
        "hasNextPage": true,
        "endCursor": "cHJvZHVjdC0wMg=="
      },
      "edges": [
        {
          "cursor": "cHJvZHVjdC0wMQ==",
          "node": {
            "id": "product-01",
            "name": "Fjallraven Foldsack No. 1 Backpack, Fits 15 Laptops",
            "slug": "fjallraven-foldsack-no-1-backpack",
            "price": {
              "amount": 10995,
              "currency": "EUR"
            },
            "category": {
              "slug": "mens-clothing"
            },
            "stock": 12,
            "imageUrl": "/images/products/fjallraven-foldsack-no-1-backpack.svg"
          }
        },
        {
          "cursor": "cHJvZHVjdC0wMg==",
          "node": {
            "id": "product-02",
            "name": "Mens Casual Premium Slim Fit T-Shirts",
            "slug": "mens-casual-premium-slim-fit-t-shirts",
            "price": {
              "amount": 2230,
              "currency": "EUR"
            },
            "category": {
              "slug": "mens-clothing"
            },
            "stock": 25,
            "imageUrl": "/images/products/mens-casual-premium-slim-fit-t-shirts.svg"
          }
        }
      ]
    }
  }
}
```

### The page after a cursor

```graphql
query ($after: String) {
  products(first: 2, after: $after) {
    edges { node { id name } }
  }
}
```

Variables:

```json
{
  "after": "cHJvZHVjdC0wMg=="
}
```

Answer:

```json
{
  "data": {
    "products": {
      "edges": [
        {
          "node": {
            "id": "product-03",
            "name": "Mens Cotton Jacket"
          }
        },
        {
          "node": {
            "id": "product-04",
            "name": "Mens Casual Slim Fit"
          }
        }
      ]
    }
  }
}
```

### The catalogue narrowed by category, by name and to what is in stock

```graphql
{
  jewellery: products(filter: { categorySlug: "jewellery" }) { totalCount }
  byName: products(filter: { nameContains: "cotton" }) { totalCount edges { node { slug } } }
  inStock: products(filter: { inStockOnly: true }) { totalCount }
}
```

Answer:

```json
{
  "data": {
    "jewellery": {
      "totalCount": 4
    },
    "byName": {
      "totalCount": 2,
      "edges": [
        {
          "node": {
            "slug": "mens-cotton-jacket"
          }
        },
        {
          "node": {
            "slug": "danvouy-womens-t-shirt-casual-cotton-short"
          }
        }
      ]
    },
    "inStock": {
      "totalCount": 19
    }
  }
}
```

### One product by its slug

```graphql
{
  product(slug: "mens-cotton-jacket") {
    id
    name
    description
    price { amount currency }
    category { id name slug }
    stock
    imageUrl
  }
}
```

Answer:

```json
{
  "data": {
    "product": {
      "id": "product-03",
      "name": "Mens Cotton Jacket",
      "description": "Great outerwear jackets for spring, autumn and winter, suitable for many occasions such as working, hiking, camping, mountain and rock climbing, cycling, travelling or other outdoors. A good gift choice for you or a family member, and a warm hearted present for a father, a husband or a son.",
      "price": {
        "amount": 5599,
        "currency": "EUR"
      },
      "category": {
        "id": "category-mens-clothing",
        "name": "Men's clothing",
        "slug": "mens-clothing"
      },
      "stock": 8,
      "imageUrl": "/images/products/mens-cotton-jacket.svg"
    }
  }
}
```

### A slug nobody has

```graphql
{ product(slug: "a-product-that-is-not-there") { id } }
```

Answer:

```json
{
  "data": {
    "product": null
  }
}
```

### The categories

```graphql
{ categories { id name slug } }
```

Answer:

```json
{
  "data": {
    "categories": [
      {
        "id": "category-mens-clothing",
        "name": "Men's clothing",
        "slug": "mens-clothing"
      },
      {
        "id": "category-jewellery",
        "name": "Jewellery",
        "slug": "jewellery"
      },
      {
        "id": "category-electronics",
        "name": "Electronics",
        "slug": "electronics"
      },
      {
        "id": "category-womens-clothing",
        "name": "Women's clothing",
        "slug": "womens-clothing"
      }
    ]
  }
}
```

### The cart of a visitor who has not started

```graphql
{
  cart {
    id
    lines { id }
    promotion { code }
    subtotal { amount }
    shipping { amount }
    total { amount }
    updatedAt
  }
}
```

Answer:

```json
{
  "data": {
    "cart": {
      "id": "01a084f2f904710d829b477e7f8af645",
      "lines": [],
      "promotion": null,
      "subtotal": {
        "amount": 0
      },
      "shipping": {
        "amount": 0
      },
      "total": {
        "amount": 0
      },
      "updatedAt": "2026-09-09T06:55:11Z"
    }
  }
}
```

### Adding a product to the cart

```graphql
mutation {
  addToCart(productId: "product-18", quantity: 2) {
    cart {
      id
      lines { id quantity lineTotal { amount } product { name stock } }
      subtotal { amount }
      shipping { amount }
      total { amount }
    }
    availableStock
    errors { code message field }
  }
}
```

Answer:

```json
{
  "data": {
    "addToCart": {
      "cart": {
        "id": "01a084f2f9237962a828d8a61205fc20",
        "lines": [
          {
            "id": "01a084f2f94a738caaa3d3da8ad1bc95",
            "quantity": 2,
            "lineTotal": {
              "amount": 1970
            },
            "product": {
              "name": "MBJ Women's Solid Short Sleeve Boat Neck V",
              "stock": 25
            }
          }
        ],
        "subtotal": {
          "amount": 1970
        },
        "shipping": {
          "amount": 495
        },
        "total": {
          "amount": 2465
        }
      },
      "availableStock": null,
      "errors": []
    }
  }
}
```

### Setting the quantity of a line

```graphql
mutation ($lineId: ID!) {
  changeCartLineQuantity(lineId: $lineId, quantity: 3) {
    cart { lines { quantity lineTotal { amount } } subtotal { amount } total { amount } }
    errors { code }
  }
}
```

Variables:

```json
{
  "lineId": "01a084f2f94a738caaa3d3da8ad1bc95"
}
```

Answer:

```json
{
  "data": {
    "changeCartLineQuantity": {
      "cart": {
        "lines": [
          {
            "quantity": 3,
            "lineTotal": {
              "amount": 2955
            }
          }
        ],
        "subtotal": {
          "amount": 2955
        },
        "total": {
          "amount": 3450
        }
      },
      "errors": []
    }
  }
}
```

### Applying a promotion code

```graphql
mutation {
  applyPromotionCode(code: "welcome10") {
    cart {
      promotion { code kind discount { amount } }
      subtotal { amount }
      shipping { amount }
      total { amount }
    }
    errors { code }
  }
}
```

Answer:

```json
{
  "data": {
    "applyPromotionCode": {
      "cart": {
        "promotion": {
          "code": "WELCOME10",
          "kind": "PERCENTAGE",
          "discount": {
            "amount": 296
          }
        },
        "subtotal": {
          "amount": 2955
        },
        "shipping": {
          "amount": 495
        },
        "total": {
          "amount": 3154
        }
      },
      "errors": []
    }
  }
}
```

### Free shipping shows in the shipping and not in the discount

```graphql
mutation {
  applyPromotionCode(code: "FREESHIP") {
    cart {
      promotion { code kind discount { amount } }
      subtotal { amount }
      shipping { amount }
      total { amount }
    }
    errors { code }
  }
}
```

Answer:

```json
{
  "data": {
    "applyPromotionCode": {
      "cart": {
        "promotion": {
          "code": "FREESHIP",
          "kind": "FREE_SHIPPING",
          "discount": {
            "amount": 0
          }
        },
        "subtotal": {
          "amount": 2955
        },
        "shipping": {
          "amount": 0
        },
        "total": {
          "amount": 2955
        }
      },
      "errors": []
    }
  }
}
```

### Taking the code off again

```graphql
mutation {
  removePromotionCode {
    cart { promotion { code } subtotal { amount } shipping { amount } total { amount } }
    errors { code }
  }
}
```

Answer:

```json
{
  "data": {
    "removePromotionCode": {
      "cart": {
        "promotion": null,
        "subtotal": {
          "amount": 2955
        },
        "shipping": {
          "amount": 495
        },
        "total": {
          "amount": 3450
        }
      },
      "errors": []
    }
  }
}
```

### Removing a line

```graphql
mutation ($lineId: ID!) {
  removeCartLine(lineId: $lineId) {
    cart { lines { id } subtotal { amount } shipping { amount } total { amount } }
    errors { code }
  }
}
```

Variables:

```json
{
  "lineId": "01a084f2f94a738caaa3d3da8ad1bc95"
}
```

Answer:

```json
{
  "data": {
    "removeCartLine": {
      "cart": {
        "lines": [],
        "subtotal": {
          "amount": 0
        },
        "shipping": {
          "amount": 0
        },
        "total": {
          "amount": 0
        }
      },
      "errors": []
    }
  }
}
```

### Saving a product to the wishlist without an account

```graphql
mutation {
  addToWishlist(productId: "product-05") {
    products { id name }
    errors { code }
  }
}
```

Answer:

```json
{
  "data": {
    "addToWishlist": {
      "products": [
        {
          "id": "product-05",
          "name": "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet"
        }
      ],
      "errors": []
    }
  }
}
```

### Reading the wishlist

```graphql
{ wishlist { id name } }
```

Answer:

```json
{
  "data": {
    "wishlist": [
      {
        "id": "product-05",
        "name": "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet"
      }
    ]
  }
}
```

### Taking a product off the wishlist

```graphql
mutation {
  removeFromWishlist(productId: "product-05") {
    products { id }
    errors { code }
  }
}
```

Answer:

```json
{
  "data": {
    "removeFromWishlist": {
      "products": [],
      "errors": []
    }
  }
}
```

### Nobody is signed in

```graphql
{ me { id email } }
```

Answer:

```json
{
  "data": {
    "me": null
  }
}
```

### Logging in

```graphql
mutation {
  login(input: { email: "jane@example.com", password: "correct horse battery staple", device: "Chrome on Windows" }) {
    customer {
      id
      email
      name
      createdAt
      sessions { id device createdAt lastUsedAt current }
      wishlist { id name }
    }
    accessToken
    accessTokenExpiresAt
    errors { code message field }
  }
}
```

Answer:

```json
{
  "data": {
    "login": {
      "customer": {
        "id": "customer-01",
        "email": "jane@example.com",
        "name": "Jane Doe",
        "createdAt": "2026-01-15T09:00:00Z",
        "sessions": [
          {
            "id": "01a084f2fbda78f6b59990377fba14ca",
            "device": "Chrome on Windows",
            "createdAt": "2026-09-09T06:55:11Z",
            "lastUsedAt": "2026-09-09T06:55:11Z",
            "current": true
          }
        ],
        "wishlist": [
          {
            "id": "product-05",
            "name": "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet"
          }
        ]
      },
      "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IkE2NzVCQkM1QkM1N0U0M0QiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJ6YXBweS1tYXJ0IiwiaXNzIjoiaHR0cHM6Ly96YXBweS1tYXJ0LmxvY2FsaG9zdCIsImV4cCI6MTc4ODkzNzgxMSwiaWF0IjoxNzg4OTM2OTExLCJuYmYiOjE3ODg5MzY5MTEsInN1YiI6ImN1c3RvbWVyLTAxIiwic2lkIjoiMDFhMDg0ZjJmYmRhNzhmNmI1OTk5MDM3N2ZiYTE0Y2EifQ.IPzXoYXkHk_NZ-vXNGoUwG5E0Y2usrH9pnzj4qVuExUKPA9Uzwn1Vrdkmu1hCx8raRgkvY7nA6HnhVgdQcOT7jh_ieuUzg9dbHE8CHO3gbu4xclWOx3YFQbb2fndKeZDrpi9x7GnoKkddLJ4r72hPHAIF3iljxVZ_860_0h2GDtM4FsnhVhMgTAtEiThSJJFZw24Qnys9vVFTIriyONryWMWCqxO8cGhIoFyyL4ooZgmyRwUrTpYzgiEVLwcbCEdNN06ScwXb3nhu9luMOh1b7iwusmN0SLVhCldmiWOehk7mTrq8buvl-4_t-JzagYEjBkjKHiyUDXaCw47eFi_MQ",
      "accessTokenExpiresAt": "2026-09-09T07:10:11Z",
      "errors": []
    }
  }
}
```

### The cart of the anonymous visitor moved to the customer

```graphql
{
  me { id email }
  cart { lines { quantity product { name } } subtotal { amount } shipping { amount } total { amount } }
}
```

Answer:

```json
{
  "data": {
    "me": {
      "id": "customer-01",
      "email": "jane@example.com"
    },
    "cart": {
      "lines": [
        {
          "quantity": 2,
          "product": {
            "name": "MBJ Women's Solid Short Sleeve Boat Neck V"
          }
        }
      ],
      "subtotal": {
        "amount": 1970
      },
      "shipping": {
        "amount": 495
      },
      "total": {
        "amount": 2465
      }
    }
  }
}
```

### Placing the order

```graphql
mutation {
  placeOrder(idempotencyKey: "checkout-of-this-page") {
    order {
      id
      number
      status
      lines { productName unitPrice { amount } quantity lineTotal { amount } }
      promotionCode
      subtotal { amount }
      discount { amount }
      shipping { amount }
      total { amount }
      placedAt
    }
    errors { code message }
  }
}
```

Answer:

```json
{
  "data": {
    "placeOrder": {
      "order": {
        "id": "01a084f2fce673ec90ff39f67e6f7be0",
        "number": "ZAPPY-20260909-01A084",
        "status": "PAID",
        "lines": [
          {
            "productName": "MBJ Women's Solid Short Sleeve Boat Neck V",
            "unitPrice": {
              "amount": 985
            },
            "quantity": 2,
            "lineTotal": {
              "amount": 1970
            }
          }
        ],
        "promotionCode": null,
        "subtotal": {
          "amount": 1970
        },
        "discount": {
          "amount": 0
        },
        "shipping": {
          "amount": 495
        },
        "total": {
          "amount": 2465
        },
        "placedAt": "2026-09-09T06:55:12Z"
      },
      "errors": []
    }
  }
}
```

### The order history

```graphql
{
  orders(first: 5) {
    totalCount
    pageInfo { hasNextPage endCursor }
    edges { cursor node { id number total { amount } placedAt } }
  }
}
```

Answer:

```json
{
  "data": {
    "orders": {
      "totalCount": 1,
      "pageInfo": {
        "hasNextPage": false,
        "endCursor": "MDFhMDg0ZjJmY2U2NzNlYzkwZmYzOWY2N2U2ZjdiZTA="
      },
      "edges": [
        {
          "cursor": "MDFhMDg0ZjJmY2U2NzNlYzkwZmYzOWY2N2U2ZjdiZTA=",
          "node": {
            "id": "01a084f2fce673ec90ff39f67e6f7be0",
            "number": "ZAPPY-20260909-01A084",
            "total": {
              "amount": 2465
            },
            "placedAt": "2026-09-09T06:55:12Z"
          }
        }
      ]
    }
  }
}
```

### One order by its id

```graphql
query ($id: ID!) {
  order(id: $id) { number status total { amount } lines { productName quantity } }
}
```

Variables:

```json
{
  "id": "01a084f2fce673ec90ff39f67e6f7be0"
}
```

Answer:

```json
{
  "data": {
    "order": {
      "number": "ZAPPY-20260909-01A084",
      "status": "PAID",
      "total": {
        "amount": 2465
      },
      "lines": [
        {
          "productName": "MBJ Women's Solid Short Sleeve Boat Neck V",
          "quantity": 2
        }
      ]
    }
  }
}
```

### The sessions of the customer

```graphql
{ me { sessions { id device createdAt lastUsedAt current } } }
```

Answer:

```json
{
  "data": {
    "me": {
      "sessions": [
        {
          "id": "01a084f2fbda78f6b59990377fba14ca",
          "device": "Chrome on Windows",
          "createdAt": "2026-09-09T06:55:11Z",
          "lastUsedAt": "2026-09-09T06:55:11Z",
          "current": true
        }
      ]
    }
  }
}
```

### Exchanging the refresh cookie for a new pair

```graphql
mutation {
  refreshSession {
    customer { id email }
    accessToken
    accessTokenExpiresAt
    errors { code }
  }
}
```

Answer:

```json
{
  "data": {
    "refreshSession": {
      "customer": {
        "id": "customer-01",
        "email": "jane@example.com"
      },
      "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IkE2NzVCQkM1QkM1N0U0M0QiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJ6YXBweS1tYXJ0IiwiaXNzIjoiaHR0cHM6Ly96YXBweS1tYXJ0LmxvY2FsaG9zdCIsImV4cCI6MTc4ODkzNzgxMiwiaWF0IjoxNzg4OTM2OTEyLCJuYmYiOjE3ODg5MzY5MTIsInN1YiI6ImN1c3RvbWVyLTAxIiwic2lkIjoiMDFhMDg0ZjJmYmRhNzhmNmI1OTk5MDM3N2ZiYTE0Y2EifQ.hDj-TeGCuiPaxMGo02mH2ui-EiGOAtV7DLBIc53S7hEKYzoA-vusSk3kHu9A7_xTPLqAJwdSZ-ffSuq5kPtxAPQ6DD8RsIDbD5DX-KfsOPb-gPhamzoP-HMwmDXcmYobmrmMaGNYKUVayVDjiVeSNH_-lzC9hvyF0tayV_hpBXMe2Wq-ReTtIXph72EY8-i1tDRFtnDTSRK5_tDQTy0YyJAPeTf5Euj4pr7O5eczB1VEpCBqC05ruVn4Cw-X4EEd6XIqbCXklaUcG98KO9Hme_QBX2qY4YpXhgWKWRDc12wga0d5fG4QerxVsl8EKavsWKFDBnyhk9C0gj-naU63BQ",
      "accessTokenExpiresAt": "2026-09-09T07:10:12Z",
      "errors": []
    }
  }
}
```

### Registering a customer

```graphql
mutation {
  register(input: { email: "sam@example.com", name: "Sam Rivers", password: "a password of enough length" }) {
    customer { id email name createdAt }
    accessToken
    accessTokenExpiresAt
    errors { code message field }
  }
}
```

Answer:

```json
{
  "data": {
    "register": {
      "customer": {
        "id": "01a084f2fdd874f999b112c756e14f5a",
        "email": "sam@example.com",
        "name": "Sam Rivers",
        "createdAt": "2026-09-09T06:55:12Z"
      },
      "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IkE2NzVCQkM1QkM1N0U0M0QiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJ6YXBweS1tYXJ0IiwiaXNzIjoiaHR0cHM6Ly96YXBweS1tYXJ0LmxvY2FsaG9zdCIsImV4cCI6MTc4ODkzNzgxMiwiaWF0IjoxNzg4OTM2OTEyLCJuYmYiOjE3ODg5MzY5MTIsInN1YiI6IjAxYTA4NGYyZmRkODc0Zjk5OWIxMTJjNzU2ZTE0ZjVhIiwic2lkIjoiMDFhMDg0ZjJmZThkN2EzMzg4YjY5MGVmZTQzMTg3ZjQifQ.qR_5nm9Orm4Ygnd1ZNSJwV57X0K6ygo_QFxnnm53ehkKyOXq9l8flbjd-9RQatkNnR8V9yc9iApv94BB81kRHxfZDduob2WSnB3-0XDXI7nqocgUtxL3AzDw_TlDmwRUEJvc0cVdE0XGaeqhxCefcsqBsArkmxnnAJibXIlKljWN2a2wIfI7omFPavmZkA-0lDldT2tCq4Dk7lbs24tKnbHvT6JJzsrg3H1E5uHuYfXMofKGO5KdZtaiF8Dq6dAOewc9m-h2TR1klZl_7LMUEvfPTZcQg-WAhcJR57SHcDQQv-pYiXkCzfdki4vuJK58mC_NHeSPo50KM7RX5x_csg",
      "accessTokenExpiresAt": "2026-09-09T07:10:12Z",
      "errors": []
    }
  }
}
```

### Revoking a session of another device

```graphql
mutation ($sessionId: ID!) {
  revokeSession(sessionId: $sessionId) {
    sessions { id device current }
    errors { code message field }
  }
}
```

Variables:

```json
{
  "sessionId": "01a084f2fbda78f6b59990377fba14ca"
}
```

Answer:

```json
{
  "data": {
    "revokeSession": {
      "sessions": [
        {
          "id": "01a084f2ff6170068ae69faa386406a1",
          "device": "Firefox on Linux",
          "current": false
        }
      ],
      "errors": []
    }
  }
}
```

### Logging out

```graphql
mutation { logout { success errors { code } } }
```

Answer:

```json
{
  "data": {
    "logout": {
      "success": true,
      "errors": []
    }
  }
}
```

### The access token stops working the moment the session is gone

```graphql
{ me { id } }
```

Answer:

```json
{
  "data": {
    "me": null
  }
}
```

## The refusals

Every one of these is a rule saying no, which is why they are data in `errors` and not a
GraphQL error. The last three are the exception: the `Origin` check answers a GraphQL
error, because no change to the input puts it right.

### A product that is not in the catalogue

```graphql
mutation {
  addToCart(productId: "product-99") { cart { id } availableStock errors { code message field } }
}
```

Answer:

```json
{
  "data": {
    "addToCart": {
      "cart": {
        "id": "01a084f3006f759ab7ae11b479b54570"
      },
      "availableStock": null,
      "errors": [
        {
          "code": "PRODUCT_NOT_FOUND",
          "message": "No product with that id exists.",
          "field": "productId"
        }
      ]
    }
  }
}
```

### More than the stock

```graphql
mutation {
  addToCart(productId: "product-07") { availableStock errors { code message field } }
}
```

Answer:

```json
{
  "data": {
    "addToCart": {
      "availableStock": 0,
      "errors": [
        {
          "code": "OUT_OF_STOCK",
          "message": "White Gold Plated Princess has 0 in stock and 1 were asked for.",
          "field": "quantity"
        }
      ]
    }
  }
}
```

### The last one in stock, twice

```graphql
mutation {
  first: addToCart(productId: "product-12") { errors { code } }
  second: addToCart(productId: "product-12") { availableStock errors { code message field } }
}
```

Answer:

```json
{
  "data": {
    "first": {
      "errors": []
    },
    "second": {
      "availableStock": 1,
      "errors": [
        {
          "code": "OUT_OF_STOCK",
          "message": "WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive has 1 in stock and 2 were asked for.",
          "field": "quantity"
        }
      ]
    }
  }
}
```

### A quantity of zero is not a removal

```graphql
mutation {
  addToCart(productId: "product-18", quantity: 0) { errors { code message field } }
}
```

Answer:

```json
{
  "data": {
    "addToCart": {
      "errors": [
        {
          "code": "QUANTITY_INVALID",
          "message": "A quantity is a whole number of one or more.",
          "field": "quantity"
        }
      ]
    }
  }
}
```

### A line that is not in the cart

```graphql
mutation {
  changeCartLineQuantity(lineId: "a-line-of-another-cart", quantity: 2) { errors { code message field } }
}
```

Answer:

```json
{
  "data": {
    "changeCartLineQuantity": {
      "errors": [
        {
          "code": "CART_LINE_NOT_FOUND",
          "message": "No line with that id is in this cart.",
          "field": "lineId"
        }
      ]
    }
  }
}
```

### A promotion code nobody made

```graphql
mutation { applyPromotionCode(code: "NOPE") { errors { code message field } } }
```

Answer:

```json
{
  "data": {
    "applyPromotionCode": {
      "errors": [
        {
          "code": "CODE_UNKNOWN",
          "message": "No promotion code with that text exists.",
          "field": "code"
        }
      ]
    }
  }
}
```

### A promotion code whose window closed

```graphql
mutation { applyPromotionCode(code: "SUMMER2025") { errors { code message field } } }
```

Answer:

```json
{
  "data": {
    "applyPromotionCode": {
      "errors": [
        {
          "code": "CODE_EXPIRED",
          "message": "The promotion code SUMMER2025 is outside its validity window.",
          "field": "code"
        }
      ]
    }
  }
}
```

### A promotion code at its usage limit

```graphql
mutation { applyPromotionCode(code: "ONCE") { errors { code message field } } }
```

Answer:

```json
{
  "data": {
    "applyPromotionCode": {
      "errors": [
        {
          "code": "CODE_EXHAUSTED",
          "message": "The promotion code ONCE has reached its usage limit.",
          "field": "code"
        }
      ]
    }
  }
}
```

### A promotion code below its minimum subtotal

```graphql
mutation { applyPromotionCode(code: "FIVEOFF") { errors { code message field } } }
```

Answer:

```json
{
  "data": {
    "applyPromotionCode": {
      "errors": []
    }
  }
}
```

### An address that is already registered

```graphql
mutation {
  register(input: { email: "JANE@example.com", name: "Jane", password: "a password of enough length" }) {
    errors { code message field }
  }
}
```

Answer:

```json
{
  "data": {
    "register": {
      "errors": [
        {
          "code": "EMAIL_TAKEN",
          "message": "A customer with that email address is already registered.",
          "field": "input.email"
        }
      ]
    }
  }
}
```

### An address that is not an address

```graphql
mutation {
  register(input: { email: "jane-at-example", name: "Jane", password: "a password of enough length" }) {
    errors { code message field }
  }
}
```

Answer:

```json
{
  "data": {
    "register": {
      "errors": [
        {
          "code": "EMAIL_INVALID",
          "message": "The email address is not a valid address.",
          "field": "input.email"
        }
      ]
    }
  }
}
```

### A password below twelve characters

```graphql
mutation {
  register(input: { email: "new@example.com", name: "Jane", password: "too short" }) {
    errors { code message field }
  }
}
```

Answer:

```json
{
  "data": {
    "register": {
      "errors": [
        {
          "code": "PASSWORD_TOO_SHORT",
          "message": "A password is at least 12 characters.",
          "field": "input.password"
        }
      ]
    }
  }
}
```

### A password that does not match

```graphql
mutation {
  login(input: { email: "jane@example.com", password: "a password that is wrong" }) {
    customer { id }
    errors { code message field }
  }
}
```

Answer:

```json
{
  "data": {
    "login": {
      "customer": null,
      "errors": [
        {
          "code": "CREDENTIALS_INVALID",
          "message": "The email address and the password together do not match a customer.",
          "field": null
        }
      ]
    }
  }
}
```

### A refresh token that was already used

```graphql
mutation { refreshSession { customer { id } errors { code message } } }
```

Answer:

```json
{
  "data": {
    "refreshSession": {
      "customer": null,
      "errors": [
        {
          "code": "SESSION_INVALID",
          "message": "The refresh token is unknown, expired or was already used."
        }
      ]
    }
  }
}
```

### A session that belongs to nobody

```graphql
mutation {
  revokeSession(sessionId: "a-session-of-nobody") { sessions { id } errors { code message field } }
}
```

Answer:

```json
{
  "data": {
    "revokeSession": {
      "sessions": [],
      "errors": [
        {
          "code": "NOT_AUTHENTICATED",
          "message": "This operation needs a signed in customer.",
          "field": null
        }
      ]
    }
  }
}
```

### Placing an order without an account

```graphql
mutation { placeOrder { order { id } errors { code message } } }
```

Answer:

```json
{
  "data": {
    "placeOrder": {
      "order": null,
      "errors": [
        {
          "code": "NOT_AUTHENTICATED",
          "message": "This operation needs a signed in customer."
        }
      ]
    }
  }
}
```

### Placing an order from an empty cart

```graphql
mutation { placeOrder { order { id } errors { code message } } }
```

Answer:

```json
{
  "data": {
    "placeOrder": {
      "order": null,
      "errors": [
        {
          "code": "CART_EMPTY",
          "message": "The cart has no lines, so there is nothing to order."
        }
      ]
    }
  }
}
```

### A mutation without an Origin header

```graphql
mutation { addToCart(productId: "product-01") { cart { id } } }
```

Answer:

```json
{
  "errors": [
    {
      "message": "A mutation needs an Origin header that names an allowed origin.",
      "extensions": {
        "code": "ORIGIN_NOT_ALLOWED"
      }
    }
  ]
}
```

### A mutation from an origin the store does not know

```graphql
mutation { logout { success } }
```

Answer:

```json
{
  "errors": [
    {
      "message": "A mutation needs an Origin header that names an allowed origin.",
      "extensions": {
        "code": "ORIGIN_NOT_ALLOWED"
      }
    }
  ]
}
```

### A query needs no Origin header

```graphql
{ categories { slug } }
```

Answer:

```json
{
  "data": {
    "categories": [
      {
        "slug": "mens-clothing"
      },
      {
        "slug": "jewellery"
      },
      {
        "slug": "electronics"
      },
      {
        "slug": "womens-clothing"
      }
    ]
  }
}
```

### Loading the seed again in the development profile

```graphql
mutation { resetSeed { success loadedProducts errors { code } } }
```

Answer:

```json
{
  "data": {
    "resetSeed": {
      "success": true,
      "loadedProducts": 20,
      "errors": []
    }
  }
}
```

## The conformance suite

`tools/conformance/` runs every operation in `contract/operations/` against a backend and
compares the answers with `contract/expected/`. With the store running:

```bash
node tools/conformance/run.mjs --url http://localhost:8090/graphql
```

```text
34 documents match contract/schema.graphql and contract/schema.development.graphql
seed loaded, 20 products
   1/33  catalogue-list                  matches
   2/33  catalogue-filter-by-category    matches
   3/33  product-by-slug                 matches
   4/33  product-unknown-slug            matches
   5/33  cart-add                        matches
   6/33  cart-add-again-raises-quantity  matches
   7/33  cart-add-above-stock            matches
   8/33  promotion-apply-percentage      matches
   9/33  promotion-apply-expired         matches
  10/33  promotion-apply-exhausted       matches
  11/33  promotion-apply-below-minimum   matches
  12/33  promotion-replace               matches
  13/33  promotion-remove                matches
  14/33  register                        matches
  15/33  register-duplicate-email        matches
  16/33  login                           matches
  17/33  login-wrong-password            matches
  18/33  refresh-session                 matches
  19/33  refresh-session-replayed        matches
  20/33  logout                          matches
  21/33  login-again                     matches
  22/33  login-second-device             matches
  23/33  revoke-session                  matches
  24/33  logout-again                    matches
  25/33  revoke-session-signed-out       matches
  26/33  wishlist-add                    matches
  27/33  wishlist-remove                 matches
  28/33  wishlist-merge-on-login         matches
  29/33  order-place                     matches
  30/33  order-place-empty-cart          matches
  31/33  orders-list                     matches
  32/33  order-by-id                     matches
  33/33  mutation-without-origin         matches
33 of 33 scenarios matched contract/expected
```

The runner calls `resetSeed` before it starts, which is why the development profile puts
that mutation on the graph and the production profile does not.

## PostgreSQL instead of SQLite

The second profile is configuration and a migration that already exists. This machine has
no Docker, so the profile is written and documented and has not been run.

`compose.yaml`

```yaml
name: zappy-mart-dotnet

services:
  database:
    image: postgres:18
    environment:
      POSTGRES_DB: zappy
      POSTGRES_USER: zappy
      POSTGRES_PASSWORD: zappy
    ports:
      - "5432:5432"
    volumes:
      - database:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready --username=zappy --dbname=zappy"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  database:
```

```bash
docker compose up --detach
```

Then point the store at it, either in `appsettings.json` or as environment variables:

```bash
Database__Provider=PostgreSql \
Database__ConnectionString="Host=localhost;Port=5432;Database=zappy;Username=zappy;Password=zappy" \
dotnet run --project src/Zappy.Host
```

The host applies `Migrations/PostgreSql` at start, the seed loads in the development
profile exactly as it does on SQLite, and every test that goes through the GraphQL
endpoint keeps running on SQLite, because the tests carry their own connection string.

## Continuous integration

`.github/workflows/dotnet.yml` builds and tests this folder on every push and pull
request that touches `backends/dotnet/**`, `contract/**` or the workflow itself. It runs
`dotnet restore`, `dotnet build --no-restore` and `dotnet test --no-build`, and the
warnings are errors setting of `Directory.Build.props` is what makes the build step a
real gate.

## The patterns, and where each one lives

`docs/patterns.md` names the pattern, the problem and the file. These are the files it
points at once the code exists.

| Pattern | File | The problem it solves there |
|---|---|---|
| Ports and adapters | the project references above | the domain and the use cases know nothing of GraphQL, Entity Framework Core or the mail transport |
| Repository as a port | `Zappy.Application/*/I*Repository.cs` | a use case reads and stores aggregates without knowing the table |
| Unit of work | `Zappy.Application/Shared/IUnitOfWork.cs` and `Zappy.Adapters.Persistence/UnitOfWork.cs` | placing an order and reserving stock succeed or fail together |
| Result type | `Zappy.Domain/Shared/Result.cs`, and `CartResult` and `WishlistResult` where a third field is needed | expected failures are values the adapter maps, not exceptions |
| Specification | `Zappy.Domain/Catalogue/ProductSpecification.cs` | a catalogue filter composed from parts, tested without a database and translated to SQL |
| Strategy | `Zappy.Domain/Promotions/PromotionRule.cs` and its three implementations | a percentage, an amount and free shipping share one interface and one place to add a fourth |
| Factory | `Zappy.Domain/Ordering/Order.Place` | an order can only be created in one valid shape, from a cart, at a moment |
| Domain events, in process | `Zappy.Domain/Ordering/OrderPlaced.cs`, dispatched by `PlaceOrder` after the transaction commits | the confirmation mail and the promotion counter react without the ordering module knowing them |
| Decorator | `Zappy.Adapters.Persistence/Catalogue/CachedProductRepository.cs` | the catalogue read is cached by wrapping the repository, which stays untouched |
| Value objects | `Zappy.Domain/Shared/Money.cs`, `EmailAddress.cs` and `Zappy.Domain/Promotions/PromotionCode.cs` | a wrong value cannot exist, so the rules do not re-check it |
| Builder in tests | `tests/Zappy.Domain.Tests/Builders/` | a test names only what matters and reads like the rule it checks |

Three of those file paths differ from the ones `docs/patterns.md` guessed before the code
existed, and the difference is worth naming. `Result` sits in the domain, because
`docs/domain.md` puts it in the shared kernel and every domain method answers with it.
`PromotionCode` sits in the promotions module rather than the shared kernel, because the
shared kernel is three things and a promotion code is not one of them. The builders sit
in `Zappy.Domain.Tests` rather than a single test project, because the layout has three.

What was left out, and why:

- **A mediator library.** A use case here is a class with one method and one constructor.
  A mediator would add a registration, an interface and a search for the handler.
- **Generic repositories.** Every port carries the reads its use cases need, named after
  what they answer.
- **A service layer beside the use cases.** The use case is the service. `VisitorCart`,
  `WishlistOwner` and `WishlistProducts` are the exceptions, and each one exists because
  the same question is asked by six use cases and the answer is a rule.
- **A data transfer object for every type.** The domain type is the GraphQL type.

## The lessons this backend cost

Nine things did not work the first time. They are here because the next reader will meet
them too.

1. **SQLite cannot order by a `DateTimeOffset`.** The provider says so in the exception
   and points at the fix. Every moment on SQLite is stored as UTC ticks by a value
   converter the SQLite context applies to the whole model.
2. **An owned entity is tracked by reference.** An order whose discount and shipping are
   both zero handed the change tracker one `Money` instance twice, and it refused.
   Complex properties are values and have no such problem.
3. **Hot Chocolate infers every public member.** `BindFieldsExplicitly` on every exposed
   domain type is what keeps `Money.Plus` out of the schema, and plain classes rather
   than records keep `Equals` out of it as well.
4. **Hot Chocolate appends `Input` to an input type name.** `ProductFilter` needed an
   explicit input type to keep the contract's name.
5. **Hot Chocolate 16 adds a `@cost` directive to every field by default.** Turning the
   cost defaults off is what makes the served schema equal to the contract.
6. **A mutation runs in its own dependency injection scope.** State that a mutation and
   its child resolvers share goes in `HttpContext.Items`, not in a scoped service.
7. **A `Secure` cookie is not sent over plain HTTP by a real cookie jar.** Following the
   request scheme keeps production strict and the tutorial usable.
8. **Entity Framework Core does not see an unsaved addition in a query.** A mutation that
   answers with the list after the change has to build that list itself.
9. **The .NET 10 SDK refuses VSTest for a Microsoft Testing Platform project.** The opt
   in is one section in `global.json`.

## What is not here

- **Idempotency.** `placeOrder` takes an `idempotencyKey` and ignores it, exactly as the
  contract says a monolith may: one transaction already makes the checkout atomic, and a
  second call answers `CART_EMPTY`. The federated backend is where the key gets a table.
- **A second inbound adapter.** Item Z10 of `BACKLOG.md` adds REST over the same use
  cases, which is the sharpest proof the hexagon holds.
- **A shared rate limiter.** One process holds the window, so a second instance would
  count separately.
- **Descriptions in the served schema.** `contract/schema.graphql` carries them and is
  the document a reader reads. The served schema carries the shape.

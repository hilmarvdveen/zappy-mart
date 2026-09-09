# Patterns, and where each one lives

A pattern is used where it solves a problem the reader can see. This
document names the pattern, the file it lives in in the C# backend
(item Z3, `backends/dotnet`), and the problem it solves there. The Java
and Kotlin backends mirror the files under the same names and their
READMEs carry a table of where each pattern lives in that language. The
Node backend is a federated graph and carries the kernel patterns
(the result type, the value objects, the DateTime scalar) once, in
`backends/node/shared`.

Every path below was checked against the tree on 9 September 2026,
after the C# backend landed.

| Pattern | File (C# backend, under `src/`) | The problem it solves there |
|---|---|---|
| Ports and adapters | the whole solution layout: `Zappy.Domain` has no package or project reference, `Zappy.Application` references the domain alone, the adapters and the host reference both | the domain and the use cases know nothing of GraphQL, EF Core or the mail transport |
| Repository as a port | `Zappy.Application/<module>/I<Aggregate>Repository.cs`, for example `Zappy.Application/Cart/ICartRepository.cs` | a use case reads and stores aggregates without knowing the table |
| Unit of work | `Zappy.Application/Shared/IUnitOfWork.cs`, one transaction per use case | placing an order and reserving its stock succeed or fail together |
| Result type | `Zappy.Domain/Shared/Result.cs`, a sealed outcome per use case | expected failures (out of stock, code expired, wrong password) are values the adapter maps, not exceptions |
| Specification | `Zappy.Domain/Catalogue/ProductSpecification.cs` | a catalogue filter composed from parts, tested without a database |
| Strategy | `Zappy.Domain/Promotions/PromotionRule.cs` and its three implementations | a percentage, an amount and free shipping share one interface and one place to add a fourth |
| Factory | `Zappy.Domain/Ordering/Order.cs`, the `Place` method | an order can only be created in one valid shape, from a cart, at a moment, with its stock reserved in the same transaction or not at all |
| Domain events, in process | `Zappy.Domain/Ordering/OrderPlaced.cs`, dispatched by the `PlaceOrder` use case after its transaction commits | the confirmation mail and the promotion counter react without the ordering module knowing them. Stock is not one of the reactions: `domain.md` says no order is placed when a line cannot be reserved, so reservation happens inside `Order.Place` |
| Decorator | `Zappy.Adapters.Persistence/Catalogue/CachedProductRepository.cs` | the catalogue query is cached by wrapping the repository, which stays untouched |
| Value objects | `Zappy.Domain/Shared/Money.cs`, `Zappy.Domain/Shared/EmailAddress.cs`, `Zappy.Domain/Promotions/PromotionCode.cs` | a wrong value cannot exist, so the rules do not need to re-check it |
| Builder in tests | `tests/Zappy.Domain.Tests/Builders/` (`CartBuilder`, `ProductBuilder`, `PromotionCodeBuilder`) | a test names only what matters and reads like the rule it checks |

## Left out on purpose

- **A mediator library.** In a monolith of five modules the use case is a
  class with one method. A mediator adds a registration, an interface and
  an indirection to find the handler, and teaches nothing.
- **Generic repositories.** `IRepository<T>` hides the queries that
  matter. Each aggregate has the three or four methods its use cases
  need, named after what they do.
- **A service layer beside the use cases.** The use case is the service.
- **A DTO for every type.** The GraphQL type is the boundary. Where a
  domain type can be exposed as it is, it is. A mapping exists only where
  the shapes differ.
- **Interfaces with one implementation that are not ports.** They go.

## How to read the C# backend in one sitting

1. `Zappy.Domain/Shared/Money.cs`, the smallest value object.
2. `Zappy.Domain/Cart/Cart.cs`, the rules for lines and quantities.
3. `Zappy.Application/Cart/AddToCart.cs`, one use case with its port and
   its result.
4. `Zappy.Adapters.GraphQL/Mutation.cs`, how a use case reaches the
   schema and how a result becomes a payload with user errors.
5. `Zappy.Adapters.Persistence/Cart/CartRepository.cs`, how the port
   reaches the table.
6. `Zappy.Domain/Ordering/Order.cs`, the factory and the event.
7. `Zappy.Adapters.Security/JwtTokenIssuer.cs` and
   `Zappy.Application/Accounts/ISessionRepository.cs`, the token and the
   session it names.

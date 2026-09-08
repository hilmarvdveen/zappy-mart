# Patterns, and where each one lives

A pattern is used where it solves a problem the reader can see. This
document names the pattern, the file it lives in once the C# backend
exists (item Z3), and the problem it solves there. The Java and Kotlin
backends mirror the files under the same names.

| Pattern | File (C# backend) | The problem it solves there |
|---|---|---|
| Ports and adapters | the whole solution layout | the domain and the use cases know nothing of GraphQL, EF Core or the mail transport |
| Repository as a port | `Zappy.Application/*/I*Repository.cs` | a use case reads and stores aggregates without knowing the table |
| Unit of work | `Zappy.Application/IUnitOfWork.cs`, one transaction per use case | placing an order and reserving stock succeed or fail together |
| Result type | `Zappy.Application/Result.cs`, a sealed outcome per use case | expected failures (out of stock, code expired, wrong password) are values the adapter maps, not exceptions |
| Specification | `Zappy.Domain/Catalogue/ProductSpecification.cs` | a catalogue filter composed from parts, tested without a database |
| Strategy | `Zappy.Domain/Promotions/PromotionRule.cs` and its three implementations | a percentage, an amount and free shipping share one interface and one place to add a fourth |
| Factory | `Zappy.Domain/Ordering/Order.Place(...)` | an order can only be created in one valid shape, from a cart, at a moment |
| Domain events, in process | `Zappy.Domain/Ordering/OrderPlaced.cs`, dispatched after the unit of work commits | stock reservation and the confirmation mail react without the ordering module knowing them |
| Decorator | `Zappy.Adapters.Persistence/CachedProductRepository.cs` | the catalogue query is cached by wrapping the repository, which stays untouched |
| Value objects | `Zappy.Domain/Shared/Money.cs`, `EmailAddress.cs`, `PromotionCode.cs` | a wrong value cannot exist, so the rules do not need to re-check it |
| Builder in tests | `Zappy.Tests/Builders/*` | a test names only what matters and reads like the rule it checks |

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
4. `Zappy.Adapters.GraphQL/Cart/CartMutations.cs`, how the use case
   reaches the schema and how a result becomes a GraphQL error.
5. `Zappy.Adapters.Persistence/Cart/CartRepository.cs`, how the port
   reaches the table.
6. `Zappy.Domain/Ordering/Order.cs`, the factory and the event.
7. `Zappy.Adapters.Security/JwtTokenIssuer.cs` and the session store.

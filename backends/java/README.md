# The store in Java 25 on Spring Boot 4.1

Item Z6 of [BACKLOG.md](../../BACKLOG.md). This folder holds the whole
Zappy Mart store as one hexagonal monolith in Java, serving
[`contract/schema.graphql`](../../contract/schema.graphql) on
`http://localhost:8081/graphql`.

This README is the walk through. It starts with an empty folder and ends
with a running store, and every file it names is in this folder with the
same content. The rules the code follows are in
[`docs/principles.md`](../../docs/principles.md), the store itself in
[`docs/domain.md`](../../docs/domain.md), the token model in
[`docs/security.md`](../../docs/security.md), and the patterns in
[`docs/patterns.md`](../../docs/patterns.md).

## Contents

1. [What you need](#1-what-you-need)
2. [The layout](#2-the-layout)
3. [Creating the project](#3-creating-the-project)
4. [The domain](#4-the-domain)
5. [The application](#5-the-application)
6. [The adapters](#6-the-adapters)
7. [The host](#7-the-host)
8. [Running the store](#8-running-the-store)
9. [One request per operation](#9-one-request-per-operation)
10. [The failures](#10-the-failures)
11. [The tests](#11-the-tests)
12. [The conformance run](#12-the-conformance-run)
13. [PostgreSQL instead of H2](#13-postgresql-instead-of-h2)
14. [The versions this project pins](#14-the-versions-this-project-pins)
15. [What this backend does not do](#15-what-this-backend-does-not-do)

## 1. What you need

A JDK 25 and nothing else. Maven arrives through the wrapper in this
folder, which downloads Apache Maven 3.9.16 on its first run.

```
java -version
openjdk version "25.0.4.1" 2026-08-18 LTS
OpenJDK Runtime Environment Temurin-25.0.4.1+1 (build 25.0.4.1+1-LTS)
OpenJDK 64-Bit Server VM Temurin-25.0.4.1+1 (build 25.0.4.1+1-LTS, mixed mode, sharing)
```

When the JDK is not on the path, point `JAVA_HOME` at it and put its
`bin` first, which is what the wrapper reads.

```
export JAVA_HOME=/path/to/jdk-25
export PATH="$JAVA_HOME/bin:$PATH"
```

Nothing else is installed: no Docker, no database, no Maven. The store
runs on an embedded H2 in PostgreSQL compatibility mode, and section 13
shows the PostgreSQL profile.

## 2. The layout

Four Maven modules, in the order a class may depend on the one above it
and never the other way round.

```
backends/java/
  pom.xml                       the aggregator and the Spring Boot parent
  mvnw, mvnw.cmd, .mvn/         the Maven wrapper
  compose.yaml                  PostgreSQL 18, for section 13
  zappy-domain/                 the rules, with no framework on the compile classpath
  zappy-application/            the use cases and the ports they depend on
  zappy-adapters/               GraphQL in, the database, the tokens, the mail, the seed out
  zappy-host/                   the Spring Boot application that wires them together
```

The hexagon is mechanical here: `zappy-domain` has no dependency at all,
`zappy-application` depends on `zappy-domain` alone, and neither can
import Spring, JPA or GraphQL because neither has them on its classpath.
Run `./mvnw -pl zappy-domain,zappy-application -am test` and the two
inner modules compile and pass without a web or database package in
sight.

Inside the modules, the five packages of `docs/domain.md` repeat:
`catalogue`, `cart`, `promotions`, `ordering`, `accounts`, with a
`shared` kernel of `Money`, `EmailAddress`, `Result`, `UserError` and
`UserErrorCode`.

```
zappy-domain/src/main/java/com/zappymart/domain/
  shared/       Money, EmailAddress, Result, UserError, UserErrorCode, DomainEvent
  catalogue/    Product, Category, ProductSpecification
  cart/         Cart, CartLine
  promotions/   Promotion, PromotionCode, PromotionKind, PromotionRule, AppliedPromotion
  ordering/     Order, OrderLine, OrderStatus, OrderPlaced, ShippingCharge
  accounts/     Customer, Session, RefreshToken, Wishlist, PasswordPolicy

zappy-application/src/main/java/com/zappymart/application/
  Visitor.java, Page.java
  ports/        one interface per thing outside: repositories, clock, mailer, tokens, hashing
  catalogue/    ListProducts, FindProductBySlug, FindProductById, ListCategories
  cart/         CurrentCart, ViewCart, AddToCart, ChangeCartLineQuantity, RemoveCartLine
  promotions/   ApplyPromotionCode, RemovePromotionCode, CountPromotionUse
  ordering/     PlaceOrder, ListOrders, FindOrder, SendOrderConfirmation
  accounts/     RegisterCustomer, LogInCustomer, RefreshSession, LogOut, RevokeSession,
                IdentifyVisitor, SessionOpening, AnonymousHandover, FindSignedInCustomer,
                ListOpenSessions, ViewWishlist, AddToWishlist, RemoveFromWishlist, WishlistOwner
  development/  ResetSeed

zappy-adapters/src/main/java/com/zappymart/adapters/
  graphql/      the controllers, the payloads, the two interceptors, the DateTime scalar
  persistence/  the JPA rows, the Spring Data repositories, the port implementations
  security/     Argon2PasswordHasher, JsonWebTokenIssuer, SlidingWindowRateLimiter
  mail/         ConsoleMailer
  seed/         SeedFiles and the five records it reads
  events/       InProcessDomainEventPublisher
  runtime/      SystemClock, RandomIdentifierGenerator, TransactionalUnitOfWork

zappy-host/src/main/java/com/zappymart/host/
  ZappyMartApplication, AdapterConfiguration, UseCaseConfiguration, SeedTheStoreAtStart
zappy-host/src/main/resources/application.yaml
```

## 3. Creating the project

The four modules are plain Maven modules under one aggregator. Start
with an empty `backends/java` and put the wrapper in it. With a Maven on
the machine that is one command:

```
mvn wrapper:wrapper -Dmaven=3.9.16
```

Without one, take the three files from the Maven Wrapper release,
version 3.3.4, published 8 September 2025 on
[maven.apache.org/wrapper](https://maven.apache.org/wrapper/):

```
curl -sSLo maven-wrapper-distribution.zip \
  https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper-distribution/3.3.4/maven-wrapper-distribution-3.3.4-bin.zip
unzip maven-wrapper-distribution.zip mvnw mvnw.cmd .mvn/wrapper/maven-wrapper.jar
chmod +x mvnw
```

Then `.mvn/wrapper/maven-wrapper.properties`, which is the file that
pins the Maven the project builds with:

```properties
wrapperVersion=3.3.4
distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.16/apache-maven-3.9.16-bin.zip
wrapperUrl=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.4/maven-wrapper-3.3.4.jar
```

`pom.xml` is the aggregator. It inherits `spring-boot-starter-parent`,
which is where every version below comes from, and it adds only the two
things the parent does not know: the Java release and Bouncy Castle,
which `Argon2PasswordEncoder` needs at runtime.

The four module poms are small. `zappy-domain` has JUnit and AssertJ and
nothing else. `zappy-application` adds `zappy-domain`.
`zappy-adapters` adds the Spring starters, and it also copies the
contract into its own `target/classes` with the resources plugin, so the
schema the store serves and the seed it loads are the files in
`contract/` and never a second copy that can drift:

```xml
<execution>
  <id>copy-the-contract-schema</id>
  <phase>generate-resources</phase>
  <goals><goal>copy-resources</goal></goals>
  <configuration>
    <outputDirectory>${project.build.directory}/classes/graphql</outputDirectory>
    <resources>
      <resource>
        <directory>${contract.directory}</directory>
        <includes><include>schema.graphql</include></includes>
      </resource>
    </resources>
  </configuration>
</execution>
```

`zappy-host` adds the actuator, the two database drivers and the test
libraries, and it is the only module that carries
`spring-boot-maven-plugin`, so it is the only jar that is executable.

## 4. The domain

The domain is where the rules of `docs/domain.md` live, and it is the
one place each of them lives.

**`Money`** is an integer in the smallest unit of one currency and it
never meets another currency. It owns the rounding rule as well, because
the rounding of a percentage is a rule about money and not about
promotions:

```java
public Money percentageRoundedHalfUp(int percentage) {
    return new Money((amount * percentage + 50) / 100, currency);
}
```

Integer arithmetic, half up, no floating point: five thousand five
hundred and ninety nine cents at ten percent is five hundred and sixty,
which is the row `contract/seed/seed.md` works through.

**`Result`** is the sealed answer of every use case. Expected failures
are values, not exceptions, and they carry the `UserErrorCode` of the
contract, so an adapter renders them without a switch of its own:

```java
public sealed interface Result<TValue> {
    record Success<TValue>(TValue value) implements Result<TValue> {}
    record Refusal<TValue>(List<UserError> errors) implements Result<TValue> {}
}
```

**`Cart`** is the aggregate that owns the lines and the totals. It stores
the promotion as a code and a rule and derives the discount from the
subtotal of the moment, so a quantity change moves the discount with it
and no total is ever stored:

```java
public Money subtotal() {
    return lines.stream().map(CartLine::lineTotal).reduce(Money.zero(), Money::plus);
}

public Money shipping() {
    return ShippingCharge.forCart(subtotal(), lines.size(),
            promotionRule != null && promotionRule.carriesShipping());
}

public Money total() {
    return subtotal().plus(shipping()).minus(discount());
}
```

**`ShippingCharge`** is the whole of shipping in this store: 495 cents,
zero from a subtotal of 5000, zero with a free shipping code, and zero
for a cart with no lines at all.

**`PromotionRule`** is the strategy the three kinds of code share, and
the one place a fourth kind would be added:

```java
public sealed interface PromotionRule {
    PromotionKind kind();
    Money discountFor(Money subtotal);
    boolean carriesShipping();

    record PercentageOff(int percentage) implements PromotionRule { ... }
    record FixedAmountOff(Money amount) implements PromotionRule { ... }
    record FreeShipping() implements PromotionRule { ... }
}
```

**`Order.place`** is the factory. An order comes into being in one valid
shape only, from a cart, at a moment, and it copies the names and prices
of that moment so a later price change cannot touch it. It refuses an
empty cart and a line that outran its stock, and it answers a placed
order with `OrderPlaced` for the mail and the promotion count to react
to.

**`ProductSpecification`** is the catalogue filter, composed from parts
and tested without a database.

## 5. The application

A use case is a class with one `execute` method and constructor
parameters for the ports it needs. No mediator, no service layer, no
annotation. `AddToCart` is the whole shape of the layer:

```java
public Result<Cart> execute(Visitor visitor, String productId, int quantity) {
    return unitOfWork.inTransaction(() -> {
        Optional<Product> product = productRepository.byId(productId);
        if (product.isEmpty()) {
            return Result.refuse(UserErrorCode.PRODUCT_NOT_FOUND,
                    "No product has the id " + productId + ".", "productId");
        }
        Cart cart = currentCart.forVisitor(visitor);
        return cart.add(identifierGenerator.next(), product.get(), quantity, clock.now())
                .map(cartRepository::save);
    });
}
```

`Visitor` is who is asking: the anonymous identity from the `zappy_cart`
cookie, the customer and session from the access token when there is
one, plus the user agent and the origin. `IdentifyVisitor` builds it, and
it is the use case that makes a logout immediate, because it checks the
session id inside the token against the session store on every request:

```java
public Visitor execute(String accessToken, String cartCookie, String device, String origin) {
    Optional<SignedInVisitor> signedIn = tokenIssuer.readAccessToken(accessToken)
            .filter(this::sessionIsStillOpen);
    String cartId = cartCookie == null || cartCookie.isBlank()
            ? identifierGenerator.next() : cartCookie;
    return new Visitor(cartId, signedIn.map(SignedInVisitor::customerId).orElse(null),
            signedIn.map(SignedInVisitor::sessionId).orElse(null), device, origin);
}
```

A signature is not enough. A revoked or logged out session is refused the
moment it is presented, even while the token itself still verifies.

`PlaceOrder` shows the unit of work and the event together. The order,
the stock reservation and the emptied cart succeed or fail as one, and
the event goes out after the transaction returns:

```java
Result<Order> placement = unitOfWork.inTransaction(() -> { ... });
placement.asOptional().ifPresent(order -> domainEventPublisher.publish(order.placementEvent()));
return placement;
```

Two handlers listen. `SendOrderConfirmation` writes the mail and
`CountPromotionUse` raises the code's `timesUsed`. The ordering module
knows neither of them.

`AnonymousHandover` is what happens on login and on register: the
anonymous cart and the anonymous wishlist move to the customer, and when
the customer already had a cart the anonymous lines are added to it
rather than replacing it. The wishlist merges the same way, by adding.

## 6. The adapters

**GraphQL in.** One controller per module, with `@QueryMapping`,
`@MutationMapping` and a `@SchemaMapping` where a field needs more than a
property read:

```java
@MutationMapping
public CartPayload addToCart(@Argument String productId, @Argument Integer quantity,
                             GraphQLContext graphQlContext) {
    RequestContext context = RequestContext.from(graphQlContext);
    Result<Cart> result = addToCart.execute(context.visitor(), productId, quantity == null ? 1 : quantity);
    return payloadOf(context, result, unused -> productId);
}
```

The payload records (`CartPayload`, `AuthenticationPayload`,
`OrderPayload`, and the rest) are the boundary, and the domain types go
into them as they are. `Cart`, `Product`, `Order` and `Session` are
answered directly, because the schema field names and the accessor names
already agree. There is no mapping layer, only the four `@SchemaMapping`
methods where the shapes genuinely differ: `Customer.email` unwraps the
value object, `Customer.sessions` and `Customer.wishlist` reach into the
other modules through their use cases, and `Session.current` compares
against the session this request is being made from.

**`RequestContext` and its interceptor.** A GraphQL endpoint is one url,
so the cookies are read and written around the whole request rather than
per resolver. `RequestContextInterceptor` builds the `Visitor`, puts a
`RequestContext` in the `GraphQLContext`, and writes back whatever
cookies the resolvers asked for:

```java
request.configureExecutionInput((executionInput, builder) ->
        builder.graphQLContext(Map.of(RequestContext.class, context)).build());
return chain.next(request).doOnNext(response -> writeCookies(context, response));
```

**The origin check.** `OriginCheckInterceptor` parses the document,
finds whether the operation that will run is a mutation, and refuses
before the engine starts when the `Origin` header is missing or is not
one of the allowed origins. It answers a GraphQL error and no data,
because no change to the input puts it right. The allowed origins
default to the three frontend ports and are configurable:

```yaml
zappy:
  security:
    allowed-origins:
      - http://localhost:5173
      - http://localhost:3001
      - http://localhost:4200
```

**The `DateTime` scalar.** The contract asks for ISO 8601 in UTC with
second precision, so the scalar formats with
`uuuu-MM-dd'T'HH:mm:ss'Z'` and the clock truncates to seconds. A library
scalar would print `2026-09-09T14:30Z` when the seconds are zero, which
is a different string, and the conformance run compares strings.

**Persistence.** One row class per table, package private, with the
mapping to and from the domain beside it in the same package. There are
no JPA relations: a repository reads the lines of a cart with
`findByCartIdOrderByPositionAsc` and joins them to the products itself.
That keeps the query a reader can see and it keeps the domain free of
lazy loading. A cart's lines are rebuilt from the products of today on
every read, so the stock in a cart is never stale.

**The cached catalogue.** `CachedProductRepository` is a decorator over
`JpaProductRepository`. It remembers the catalogue, answers `byId`,
`bySlug` and `byIds` from it, and forgets it when stock changes or the
seed is loaded again. The repository behind it does not know it exists.

**Security.** `Argon2PasswordHasher` wraps `Argon2PasswordEncoder` from
`spring-security-crypto` with the parameters the OWASP password storage
cheat sheet recommends as its baseline, read on 9 September 2026:

```java
public static final int SALT_LENGTH_IN_BYTES = 16;
public static final int HASH_LENGTH_IN_BYTES = 32;
public static final int PARALLELISM = 1;
public static final int MEMORY_IN_KIBIBYTES = 19456;
public static final int ITERATIONS = 2;
```

`JsonWebTokenIssuer` signs the access token with RS256 through
`NimbusJwtEncoder` from `spring-security-oauth2-jose`. The key pair is
generated at start, which is right for development and is the one thing
to replace before a real deployment: restart the store and every token
issued before it stops verifying. The refresh token is thirty two random
bytes and only its SHA-256 digest reaches the database.

**The seed loader.** `SeedFiles` reads the four JSON files of
`contract/seed`, which the build copies onto the classpath, and
`JpaStoreSeeder` empties every table and writes them back, hashing the
seed customer's password with Argon2id exactly as `register` does.

## 7. The host

`ZappyMartApplication` is the entry point and the only class that knows
all four modules:

```java
@SpringBootApplication(scanBasePackages = "com.zappymart")
@EntityScan("com.zappymart.adapters.persistence")
@EnableJpaRepositories("com.zappymart.adapters.persistence")
public class ZappyMartApplication {

    public static void main(String[] arguments) {
        SpringApplication.run(ZappyMartApplication.class, arguments);
    }
}
```

`AdapterConfiguration` names one bean per port implementation and
`UseCaseConfiguration` names one bean per use case, each built from its
ports by hand. Those two files are the whole wiring of the hexagon, and
reading them top to bottom is reading the dependency graph.

`application.yaml` holds the port, the database, the schema locations
and the security settings, with a `development` document that adds the
`resetSeed` schema and a `postgresql` document for section 13. The
development profile is the default, so `./mvnw spring-boot:run` gives
you a store with the seed in it and the reset mutation available.
`SPRING_PROFILES_ACTIVE=production` takes both away.

## 8. Running the store

```
./mvnw verify
./mvnw -pl zappy-host spring-boot:run
```

The second command prints, near the end:

```
GraphQL schema inspection:
	Unmapped fields: {}
	Unmapped registrations: {}
	Unmapped arguments: {}
	Field nullness errors: {}
	Argument nullness errors: {}
	Skipped types: []
GraphQL endpoint HTTP POST /graphql
Tomcat started on port 8081 (http) with context path '/'
Started ZappyMartApplication in 8.477 seconds (process running for 9.321)
The development profile loaded the seed with 20 products
```

The empty schema inspection is the check that the code and the contract
agree: every field of `contract/schema.graphql` is answered and nothing
is registered that the schema does not have.

`http://localhost:8081/graphiql` opens the query console, and
`http://localhost:8081/actuator/health` answers:

```json
{"status":"UP","components":{"db":{"status":"UP","details":{"database":"H2"}}}}
```

The database is a file under `zappy-host/data/`, which the
`.gitignore` of this folder keeps out of the repository. Delete the
folder to start over.

Every request below is a `POST` to `http://localhost:8081/graphql` with
`Content-Type: application/json` and, for a mutation, an `Origin` header
the store allows.

## 9. One request per operation

### `categories`

```
curl -X POST http://localhost:8081/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ categories { id name slug } }"}'
```

```json
{"data":{"categories":[
  {"id":"category-mens-clothing","name":"Men's clothing","slug":"mens-clothing"},
  {"id":"category-jewellery","name":"Jewellery","slug":"jewellery"},
  {"id":"category-electronics","name":"Electronics","slug":"electronics"},
  {"id":"category-womens-clothing","name":"Women's clothing","slug":"womens-clothing"}]}}
```

### `products`

```
curl -X POST http://localhost:8081/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products(first: 2) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { id name price { amount currency } stock } } } }"}'
```

```json
{"data":{"products":{
  "totalCount":20,
  "pageInfo":{"hasNextPage":true,"endCursor":"cHJvZHVjdC0wMg"},
  "edges":[
    {"cursor":"cHJvZHVjdC0wMQ","node":{"id":"product-01","name":"Fjallraven Foldsack No. 1 Backpack, Fits 15 Laptops","price":{"amount":10995,"currency":"EUR"},"stock":12}},
    {"cursor":"cHJvZHVjdC0wMg","node":{"id":"product-02","name":"Mens Casual Premium Slim Fit T-Shirts","price":{"amount":2230,"currency":"EUR"},"stock":25}}]}}}
```

The cursor is the product id in Base64 and nothing more. Pass it as
`after` for the next page. `first` is capped at one hundred and a filter
narrows the list:

```
{"query":"{ products(first: 100, filter: { categorySlug: \"jewellery\", inStockOnly: true }) { totalCount } }"}
```

```json
{"data":{"products":{"totalCount":3}}}
```

### `product`

```
{"query":"{ product(slug: \"mens-cotton-jacket\") { id name price { amount currency } stock } }"}
```

```json
{"data":{"product":{"id":"product-03","name":"Mens Cotton Jacket","price":{"amount":5599,"currency":"EUR"},"stock":8}}}
```

### `cart`

```
{"query":"{ cart { id lines { id } subtotal { amount } shipping { amount } total { amount } updatedAt } }"}
```

```json
{"data":{"cart":{"id":"7ba941fb-8bea-45ce-a249-9e11711285ed","lines":[],
  "subtotal":{"amount":0},"shipping":{"amount":0},"total":{"amount":0},
  "updatedAt":"2026-09-09T00:24:48Z"}}}
```

An empty cart pays nothing at all, shipping included.

### `addToCart`

```
curl -X POST http://localhost:8081/graphql \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5173' \
  -c cookies.txt -b cookies.txt \
  -d '{"query":"mutation { addToCart(productId: \"product-18\", quantity: 2) { cart { id lines { id quantity lineTotal { amount } } subtotal { amount } shipping { amount } total { amount } } availableStock errors { code } } }"}'
```

```json
{"data":{"addToCart":{"cart":{
  "id":"c0658e19-4e15-47cd-ab00-2f17eba07d56",
  "lines":[{"id":"0fe0d8e6-8de5-4520-b1dd-89a292950e4d","quantity":2,"lineTotal":{"amount":1970}}],
  "subtotal":{"amount":1970},"shipping":{"amount":495},"total":{"amount":2465}},
  "availableStock":null,"errors":[]}}}
```

That is the first row of the totals table in `contract/seed/seed.md`. The
answer sets the cookie that carries the anonymous visitor from here on:

```
Set-Cookie: zappy_cart=3f9b3ef7-4cdd-48c2-93db-643d2a849969; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax
```

### `changeCartLineQuantity` and `removeCartLine`

```
{"query":"mutation { changeCartLineQuantity(lineId: \"0fe0d8e6-8de5-4520-b1dd-89a292950e4d\", quantity: 5) { cart { subtotal { amount } } errors { code } } }"}
{"query":"mutation { removeCartLine(lineId: \"0fe0d8e6-8de5-4520-b1dd-89a292950e4d\") { cart { lines { id } } errors { code } } }"}
```

Both take the line id, which is not the product id.

### `applyPromotionCode`

```
{"query":"mutation { applyPromotionCode(code: \"freeship\") { cart { subtotal { amount } shipping { amount } total { amount } promotion { code kind discount { amount } } } errors { code } } }"}
```

```json
{"data":{"applyPromotionCode":{"cart":{
  "subtotal":{"amount":1970},"shipping":{"amount":0},"total":{"amount":1970},
  "promotion":{"code":"FREESHIP","kind":"FREE_SHIPPING","discount":{"amount":0}}},
  "errors":[]}}}
```

Typed in any case, matched in upper case. A free shipping code shows in
the shipping and not in a discount, which is the second row of the
totals table, and the third row is `WELCOME10` on one `product-03`:
subtotal 5599, shipping 0, discount 560, total 5039.

### `removePromotionCode`

```
{"query":"mutation { removePromotionCode { cart { promotion { code } total { amount } } errors { code } } }"}
```

```json
{"data":{"removePromotionCode":{"cart":{"promotion":null,"total":{"amount":2465}},"errors":[]}}}
```

A cart with no code answers the same way, so a client calls it without
checking first.

### `addToWishlist` and `removeFromWishlist`

```
{"query":"mutation { addToWishlist(productId: \"product-05\") { products { id name } errors { code } } }"}
```

```json
{"data":{"addToWishlist":{"products":[{"id":"product-05","name":"John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet"}],"errors":[]}}}
```

An anonymous visitor keeps a wishlist against the same `zappy_cart`
cookie the cart uses, and it merges into the customer's on login by
adding.

### `register`

```
{"query":"mutation { register(input: { email: \"sam@example.com\", name: \"Sam Example\", password: \"a long enough password\" }) { customer { id email name } accessTokenExpiresAt errors { code } } }"}
```

```json
{"data":{"register":{"customer":{"id":"f368f777-c2d3-4b6c-934e-5db9282a097b",
  "email":"sam@example.com","name":"Sam Example"},
  "accessTokenExpiresAt":"2026-09-09T00:40:21Z","errors":[]}}}
```

Registering signs the customer in, so there is no second step.

### `login`

```
{"query":"mutation { login(input: { email: \"jane@example.com\", password: \"correct horse battery staple\", device: \"Chrome on Windows\" }) { customer { id email name createdAt sessions { id device current } wishlist { id } } accessTokenExpiresAt errors { code } } }"}
```

```json
{"data":{"login":{"customer":{"id":"customer-01","email":"jane@example.com","name":"Jane Doe",
  "createdAt":"2026-01-15T09:00:00Z",
  "sessions":[{"id":"49d971b3-18f1-4f1c-848e-8de8a0112dce","device":"Chrome on Windows","current":true}],
  "wishlist":[]},
  "accessTokenExpiresAt":"2026-09-09T00:40:42Z","errors":[]}}}
```

The access token is in the payload and travels in
`Authorization: Bearer` from here on. The refresh token is not in the
payload: it is set as `zappy_refresh`, httpOnly, Secure, SameSite Lax,
on the path `/graphql`.

### `refreshSession`

```
{"query":"mutation { refreshSession { customer { email } accessTokenExpiresAt errors { code } } }"}
```

```json
{"data":{"refreshSession":{"customer":{"email":"jane@example.com"},
  "accessTokenExpiresAt":"2026-09-09T00:40:44Z","errors":[]}}}
```

It takes no arguments. The token is in the cookie and the answer sets a
new one, because a refresh token is used once.

### `placeOrder`

```
{"query":"mutation { placeOrder(idempotencyKey: \"checkout-1\") { order { id number status subtotal { amount } discount { amount } shipping { amount } total { amount } promotionCode placedAt lines { productName quantity unitPrice { amount } lineTotal { amount } } } errors { code } } }"}
```

```json
{"data":{"placeOrder":{"order":{
  "id":"64c1557a-7b55-464b-b594-8a9405386146","number":"ZM-000001","status":"PAID",
  "subtotal":{"amount":1970},"discount":{"amount":0},"shipping":{"amount":495},
  "total":{"amount":2465},"promotionCode":null,"placedAt":"2026-09-09T00:26:13Z",
  "lines":[{"productName":"MBJ Women's Solid Short Sleeve Boat Neck V","quantity":2,
            "unitPrice":{"amount":985},"lineTotal":{"amount":1970}}]},
  "errors":[]}}}
```

`idempotencyKey` is accepted and ignored, as the contract says a
monolith may: one database transaction already makes the checkout
atomic, and a second call finds an empty cart. The console mailer then
prints what a mail server would have sent:

```
Mail to jane@example.com with subject Your Zappy Mart order ZM-000001
Hello Jane Doe,

Thank you for your order ZM-000001.

2 x MBJ Women's Solid Short Sleeve Boat Neck V  1970 cents

Subtotal  1970 cents
Shipping  495 cents
Discount  0 cents
Total     2465 cents
```

### `orders` and `order`

```
{"query":"{ orders(first: 5) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { id number total { amount } } } } }"}
```

```json
{"data":{"orders":{"totalCount":1,
  "pageInfo":{"hasNextPage":false,"endCursor":"NjRjMTU1N2EtN2I1NS00NjRiLWI1OTQtOGE5NDA1Mzg2MTQ2"},
  "edges":[{"cursor":"NjRjMTU1N2EtN2I1NS00NjRiLWI1OTQtOGE5NDA1Mzg2MTQ2",
            "node":{"id":"64c1557a-7b55-464b-b594-8a9405386146","number":"ZM-000001","total":{"amount":2465}}}]}}}
```

`order(id: ...)` answers one of them, and null for an order of anybody
else, so the answer tells nobody which ids exist.

### `logout` and `revokeSession`

```
{"query":"mutation { logout { success errors { code } } }"}
```

```json
{"data":{"logout":{"success":true,"errors":[]}}}
```

The refresh cookie is cleared and the session is revoked. The access
token that was just working stops working on the next request, because
`IdentifyVisitor` checks the session:

```json
{"data":{"me":null}}
```

`revokeSession(sessionId: ...)` does the same for a session on another
device and answers the sessions that stay open.

### `resetSeed`

Development profile only.

```
{"query":"mutation { resetSeed { success loadedProducts errors { code } } }"}
```

```json
{"data":{"resetSeed":{"success":true,"loadedProducts":20,"errors":[]}}}
```

## 10. The failures

Every refusal below is data in the payload, with a `UserErrorCode` a
client switches on and a message for the developer reading the response.

**Out of stock**, with what was left, so the client needs no second
query. `product-12` has a stock of one:

```json
{"data":{"addToCart":{"availableStock":1,"errors":[
  {"code":"OUT_OF_STOCK",
   "message":"There is not enough stock of WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive.",
   "field":"quantity"}]}}}
```

**A quantity of zero** is refused rather than treated as a removal:

```json
{"data":{"changeCartLineQuantity":{"errors":[
  {"code":"QUANTITY_INVALID","field":"quantity"}]}}}
```

**A promotion code outside its window.** `SUMMER2025` closed in 2025:

```json
{"data":{"applyPromotionCode":{"errors":[
  {"code":"CODE_EXPIRED",
   "message":"The promotion code SUMMER2025 is outside its validity window.","field":"code"}]}}}
```

The other three refusals of the seed are `CODE_UNKNOWN` for any text
nobody issued, `CODE_EXHAUSTED` for `ONCE`, which has used its one use,
and `CODE_MINIMUM_NOT_MET` for `FIVEOFF` on a cart under 2500 cents.

**An email address that is taken:**

```json
{"data":{"register":{"customer":null,"errors":[
  {"code":"EMAIL_TAKEN",
   "message":"A customer with that email address is already registered.","field":"input.email"}]}}}
```

**A wrong password**, and the same answer for an email address nobody
has, in the same time either way:

```json
{"data":{"login":{"customer":null,"errors":[
  {"code":"CREDENTIALS_INVALID",
   "message":"That email address and password do not go together."}]}}}
```

**A replayed refresh token.** Presenting a rotated token revokes the
whole family, so every device of that customer has to log in again:

```json
{"data":{"refreshSession":{"accessToken":null,"errors":[
  {"code":"SESSION_INVALID",
   "message":"That refresh token is unknown, expired or already used. Log in again."}]}}}
```

**A checkout with nothing in the cart:**

```json
{"data":{"placeOrder":{"order":null,"errors":[
  {"code":"CART_EMPTY","message":"The cart has no lines, so there is nothing to order."}]}}}
```

**A session that is not yours:**

```json
{"data":{"revokeSession":{"sessions":[],"errors":[
  {"code":"SESSION_NOT_FOUND","message":"You have no open session with that id.","field":"sessionId"}]}}}
```

**A mutation without an allowed origin** is the one refusal that is not
a `UserError`. It happens before the resolver runs and there is no data
at all:

```
curl -X POST http://localhost:8081/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { addToCart(productId: \"product-18\") { cart { id } } }"}'
```

```json
{"errors":[{"message":"A mutation needs an Origin header that this store allows.",
  "locations":[],"extensions":{"classification":"FORBIDDEN"}}]}
```

A query without an origin is answered normally. Only mutations are
checked.

## 11. The tests

```
./mvnw verify
```

A passing run ends like this:

```
[INFO] Tests run: 60, Failures: 0, Errors: 0, Skipped: 0      zappy-domain
[INFO] Tests run: 38, Failures: 0, Errors: 0, Skipped: 0      zappy-application
[INFO] Tests run: 39, Failures: 0, Errors: 0, Skipped: 0      zappy-adapters
[INFO] Tests run: 45, Failures: 0, Errors: 0, Skipped: 0      zappy-host
[INFO] Reactor Summary for Zappy Mart 1.0.0:
[INFO] Zappy Mart ......................................... SUCCESS
[INFO] Zappy Mart domain .................................. SUCCESS
[INFO] Zappy Mart application ............................. SUCCESS
[INFO] Zappy Mart adapters ................................ SUCCESS
[INFO] Zappy Mart host .................................... SUCCESS
[INFO] BUILD SUCCESS
```

One hundred and eighty two tests in four layers, each testing what its
layer is for.

**The domain tests read like the rules.** `CartTest` walks the three
rows of the totals table, the quantity rules and the merge.
`PromotionTest` walks the five codes of the seed. `OrderTest` walks the
factory. They use two builders so a test names only what matters:

```java
Cart cart = aCart().holding(SHIRT, 2)
        .withPromotion("FREESHIP", new PromotionRule.FreeShipping()).build();

assertThat(cart.shipping()).isEqualTo(Money.zero());
assertThat(cart.total()).isEqualTo(Money.euro(1970));
```

**The application tests run the use cases against a store in memory.**
`TheStore` implements every port with a map, so a use case is tested with
no database, no Spring and no mocking library:

```java
TheStore store = new TheStore().holding(SHIRT, LAST_DRIVE).knowing(JANE);
```

**The adapter tests check the pieces that touch the outside**: the
Argon2 parameters and the encoded prefix, the token round trip and the
refusal of a token another issuer signed, the cache that reads the
catalogue once, the cursor, the scalar format and the seed files.

**The host tests are the store end to end.** `@SpringBootTest` on a
random port, a `WebTestClient` that keeps cookies like a browser, and one
class per part of the contract. `StoreTest` resets the seed before each
test, so every test starts from the same twenty products:

```java
store.send("""
        mutation { addToCart(productId: "product-12") {
            availableStock cart { lines { quantity } } errors { code field }
        } }
        """)
        .jsonPath("$.data.addToCart.errors[0].code").isEqualTo("OUT_OF_STOCK")
        .jsonPath("$.data.addToCart.availableStock").isEqualTo(1);
```

The host tests run on H2 in memory with `create-drop`, through
`src/test/resources/application-test.yaml` and
`@ActiveProfiles({"development", "test"})`.

## 12. The conformance run

`tools/conformance/` runs the thirty three scenarios of
`contract/operations/` against any backend and compares every answer with
`contract/expected/`. Start the store, then:

```
cd ../../tools/conformance
npm install
node run.mjs --url http://localhost:8081/graphql
```

```
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

## 13. PostgreSQL instead of H2

The default database is H2 in PostgreSQL compatibility mode, so the
store runs without Docker. The PostgreSQL profile is in the same
`application.yaml` and the container is in `compose.yaml`:

```yaml
services:
  database:
    image: postgres:18
    environment:
      POSTGRES_DB: zappy_mart
      POSTGRES_USER: zappy
      POSTGRES_PASSWORD: zappy
    ports:
      - "5432:5432"
```

```
docker compose up -d
SPRING_PROFILES_ACTIVE=development,postgresql ./mvnw -pl zappy-host spring-boot:run
```

The schema comes from Hibernate either way, and the JDBC driver version
comes from the Spring Boot bill of materials. This path is written from
the profile and the compose file and has not been run here, because the
machine this was built on has no Docker.

## 14. The versions this project pins

Every version below is in
[`docs/versions.md`](../../docs/versions.md) with the date it was
verified. The Spring Boot parent manages all but three of them.

| What | Version | Where it comes from |
|---|---|---|
| JDK | Temurin 25.0.4.1, LTS | the machine, `maven.compiler.release` is 25 |
| Apache Maven | 3.9.16 | `.mvn/wrapper/maven-wrapper.properties` |
| Maven Wrapper | 3.3.4 | the same file, and the three wrapper files |
| Spring Boot | 4.1.1 | the parent in `pom.xml` |
| Spring for GraphQL | 2.0.5 | managed by the parent |
| Spring Security | 7.1.1 | managed, `spring-security-crypto` and `spring-security-oauth2-jose` |
| Hibernate | 7.4.5.Final | managed, through `spring-boot-starter-data-jpa` |
| graphql-java | 25.0 | managed, through Spring for GraphQL |
| Jackson | 3.1.5 | managed, and the reason the seed loader imports `tools.jackson` |
| H2 | 2.4.240 | managed, the default database |
| PostgreSQL JDBC | 42.7.13 | managed, for the `postgresql` profile |
| JUnit | 6.0.3 | managed |
| AssertJ | 3.27.7 | managed |
| Bouncy Castle | `bcprov-jdk18on` 1.85.2 | pinned in `pom.xml`, needed by `Argon2PasswordEncoder` |
| PostgreSQL image | `postgres:18` | `compose.yaml` |

Three decisions the version table implies:

- **No Lombok.** Records carry the value objects and the payloads, and
  the row classes that JPA needs write their own constructors. JEP 500
  removes the compiler internals Lombok reaches into, so a project
  starting on JDK 25 does not take that bet.
- **No field injection.** Every class takes its collaborators in its
  constructor, which is what makes the use cases testable without
  Spring.
- **No Testcontainers.** It is in the bill of materials at 2.0.5 and it
  is left out, because this machine has no Docker and a dependency that
  cannot be run cannot be claimed to work. The PostgreSQL profile and
  `compose.yaml` carry the same shape, and the row above says which
  image.

## 15. What this backend does not do

- **The signing key is generated at start.** Every restart invalidates
  every access token that was issued. A deployment loads a key pair
  instead, and the `JwtEncoder` and `JwtDecoder` in
  `JsonWebTokenIssuer` are the two lines that change.
- **The refresh cookie's path is `/graphql`.** `docs/security.md` asks
  for the path of the refresh mutation, and a GraphQL endpoint is one
  url, so the endpoint is the narrowest path there is. Every request to
  the store carries the cookie as a result. The federated backend of
  `docs/federation.md`, which has more than one url, is where that
  design gets its narrower path.
- **Rate limiting is in memory.** One process, one map, twenty attempts
  a minute per email address. Two processes would each count their own,
  and a shared store is where that goes.
- **The order number is a count.** `ZM-000001` and up, from the number
  of orders. It is unique under one writer and a sequence is what
  replaces it.
- **Payment is simulated.** An order is placed as `PAID`. The place
  where a payment provider goes is `Order.place`, and `OrderStatus`
  already has the `PLACED` value that provider would use.
- **The seed loads on every start in the development profile.** The
  store is a tutorial and every run starts from the same twenty
  products. In production neither the loader nor `resetSeed` exists.

A note on this machine: it runs an antivirus that inspects TLS, so Java
refused the Maven downloads until the certificate store was pointed at
the operating system.

```
export MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT
```

That belongs to the machine and not to the project, which is why it is
in this note and not in `.mvn/jvm.config`.

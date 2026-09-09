# The store in Kotlin 2.4 on Spring Boot 4.1

Zappy Mart as a hexagonal monolith in Kotlin, serving
`contract/schema.graphql` on `http://localhost:8082/graphql`. It is item
Z7 of [BACKLOG.md](../../BACKLOG.md), and it holds the same five modules
and the same rules as the Java backend of item Z6, so a reader who knows
one can read the other.

This file is the whole walk through: an empty folder, the build, every
source file with its path and its content, the run command, one request
per operation with the answer it gives, the failures, the tests and what
a passing run prints. Nothing is skipped and nothing is explained twice.

The rules behind the code are in [docs/principles.md](../../docs/principles.md),
the store itself in [docs/domain.md](../../docs/domain.md), the token model in
[docs/security.md](../../docs/security.md), the patterns in
[docs/patterns.md](../../docs/patterns.md) and the pinned versions in
[docs/versions.md](../../docs/versions.md).

## 1. What you need

- A JDK 25. This backend was built and run on Temurin 25.0.4.1+1.
- Nothing else. Gradle arrives through the wrapper, the database is an
  embedded H2 file, and there is no Docker in the default path.

Check the JDK first, because every command below needs it.

```
java -version
```

```
openjdk version "25.0.4.1" 2026-08-18 LTS
OpenJDK Runtime Environment Temurin-25.0.4.1+1 (build 25.0.4.1+1-LTS)
OpenJDK 64-Bit Server VM Temurin-25.0.4.1+1 (build 25.0.4.1+1-LTS, mixed mode, sharing)
```

When the JDK is not on the path, point at it for the session. On Windows
that is `set JAVA_HOME=C:\path\to\jdk-25` and
`set PATH=%JAVA_HOME%\bin;%PATH%`, on macOS and Linux
`export JAVA_HOME=/path/to/jdk-25` and `export PATH=$JAVA_HOME/bin:$PATH`.

## 2. The versions, and where each one comes from

| Item | Version | Where it comes from |
|---|---|---|
| JDK | Temurin 25.0.4.1+1 | `docs/versions.md` pins JDK 25, and this is the build it ran on |
| Gradle | 9.5.0 | the highest Gradle the Kotlin 2.4.10 plugin documents. The compatibility table at kotlinlang.org, read on 9 September 2026, gives KGP 2.4.0 to 2.4.10 the range 7.6.3 to 9.5.0 |
| Kotlin | 2.4.10, with `plugin.spring` and `plugin.jpa` | `docs/versions.md` |
| Spring Boot | 4.1.1 | `docs/versions.md` |
| `io.spring.dependency-management` | 1.1.7 | the current release on Maven Central, read on 9 September 2026 |
| Spring Framework | 7.0.9 | managed by Spring Boot 4.1.1 |
| Spring for GraphQL | 2.0.5 | managed by Spring Boot 4.1.1 |
| Spring Security | 7.1.1 | managed by Spring Boot 4.1.1 |
| Spring Data | 2026.0.1 | managed by Spring Boot 4.1.1 |
| Hibernate | 7.4.5.Final | managed by Spring Boot 4.1.1 |
| graphql-java | 25.0 | managed by Spring Boot 4.1.1 |
| Jackson | 3.1.5, with `tools.jackson.module:jackson-module-kotlin` | managed by Spring Boot 4.1.1 |
| kotlinx.coroutines | 1.11.0 | `docs/versions.md`, raised above the 1.10.2 the bill of materials manages |
| H2 | 2.4.240 | managed by Spring Boot 4.1.1 |
| PostgreSQL driver | 42.7.13 | managed by Spring Boot 4.1.1 |
| PostgreSQL image | `postgres:18` | `docs/versions.md` |
| Bouncy Castle | `org.bouncycastle:bcprov-jdk18on` 1.85.2 | the current release on Maven Central, read on 9 September 2026. `Argon2PasswordEncoder` needs it and the bill of materials does not manage it |
| JUnit | 6.0.3 | managed by Spring Boot 4.1.1 |
| AssertJ | 3.27.7 | managed by Spring Boot 4.1.1 |
| Argon2id parameters | memory 19456 KiB, iterations 2, parallelism 1, salt 16 bytes, hash 32 bytes | the OWASP password storage cheat sheet, read on 9 September 2026, second row of its recommended configurations |
| `actions/checkout` | v7 | the current major |
| `actions/setup-java` | v6 | the current major, verified on 9 September 2026 |

Kotlin and coroutines are raised above the versions Spring Boot manages,
because `docs/versions.md` pins them and the blog explains with them. The
build says so in one place, `bomProperty` in the root build file, so
every module resolves the same numbers.

## 3. From an empty folder to a build

Four commands make the folder, the settings file and the wrapper. The
wrapper needs a Gradle to generate it, and Gradle is not installed, so
the distribution is downloaded once into a temporary folder and deleted
afterwards. That is how this project's wrapper was made.

```
mkdir zappy-mart-kotlin && cd zappy-mart-kotlin
```

Write `settings.gradle.kts` and `build.gradle.kts` from section 4.1
first, and make the four module folders, because Gradle 9 refuses to
configure a project whose directory does not exist.

```
mkdir -p zappy-domain/src/main/kotlin zappy-application/src/main/kotlin \
         zappy-adapters/src/main/kotlin zappy-host/src/main/kotlin
```

Then fetch the Gradle the Kotlin plugin documents, generate the wrapper
with it and throw the download away.

```
curl -L -o /tmp/gradle-9.5.0-bin.zip https://services.gradle.org/distributions/gradle-9.5.0-bin.zip
unzip -q /tmp/gradle-9.5.0-bin.zip -d /tmp/gradle
/tmp/gradle/gradle-9.5.0/bin/gradle wrapper \
  --gradle-version 9.5.0 \
  --gradle-distribution-sha256-sum 553c78f50dafcd54d65b9a444649057857469edf836431389695608536d6b746
rm -rf /tmp/gradle /tmp/gradle-9.5.0-bin.zip
```

The checksum is the one Gradle publishes beside the distribution, and
putting it on the command line writes it into
`gradle/wrapper/gradle-wrapper.properties`, so every later run verifies
the download it makes. From here on every command is `./gradlew`, and
nothing else has to be installed.

```
./gradlew --version
```

```
------------------------------------------------------------
Gradle 9.5.0
------------------------------------------------------------
Launcher JVM:  25.0.4.1 (Eclipse Adoptium 25.0.4.1+1-LTS)
```

## 4. The shape

Four modules, in the order a dependency points:

```
zappy-domain        entities, value objects, the rules, the events. No framework at all.
zappy-application   use cases with one execute method, the ports they need, the unit of work.
zappy-adapters      GraphQL in, JPA out, security, mail, the seed loader.
zappy-host          the Spring Boot application, the wiring, the development profile.
```

The test of the shape is mechanical, and this build enforces it:
`zappy-domain` declares only the Kotlin standard library, so it cannot
import Spring, GraphQL or Hibernate even by accident. `zappy-application`
adds only coroutines. Everything that knows a framework lives in
`zappy-adapters` and `zappy-host`.

Inside the domain the five modules of `docs/domain.md` are five packages:
`catalogue`, `cart`, `promotions`, `ordering`, `accounts`, around a
`shared` kernel of `Money`, `EmailAddress`, `PromotionCode` and the
`Result` every use case answers with.

## 5. Every file

### 5.1 The build

The root build file declares the plugin versions once and applies the
shared settings to every module, so the toolchain, the repositories, the
bill of materials and the test runner have one home. Each module file
then says only what that module is.

`settings.gradle.kts`

```kotlin
pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}

rootProject.name = "zappy-mart-kotlin"

include("zappy-domain")
include("zappy-application")
include("zappy-adapters")
include("zappy-host")
```

`gradle.properties`

```properties
org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=768m
org.gradle.parallel=true
org.gradle.caching=true
kotlin.code.style=official
```

`build.gradle.kts`

```kotlin
import io.spring.gradle.dependencymanagement.dsl.DependencyManagementExtension
import org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension

plugins {
    kotlin("jvm") version "2.4.10" apply false
    kotlin("plugin.spring") version "2.4.10" apply false
    kotlin("plugin.jpa") version "2.4.10" apply false
    id("org.springframework.boot") version "4.1.1" apply false
    id("io.spring.dependency-management") version "1.1.7" apply false
}

subprojects {
    apply(plugin = "java-library")
    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "io.spring.dependency-management")

    group = "nl.zappymart"
    version = "1.0.0"

    repositories {
        mavenCentral()
    }

    configure<DependencyManagementExtension> {
        imports {
            mavenBom("org.springframework.boot:spring-boot-dependencies:4.1.1") {
                bomProperty("kotlin.version", "2.4.10")
                bomProperty("kotlin-coroutines.version", "1.11.0")
            }
        }
    }

    configure<KotlinJvmProjectExtension> {
        jvmToolchain(25)
        compilerOptions {
            freeCompilerArgs.add("-Xjsr305=strict")
        }
    }

    dependencies {
        add("testImplementation", "org.jetbrains.kotlin:kotlin-test-junit5")
        add("testImplementation", "org.junit.jupiter:junit-jupiter")
        add("testImplementation", "org.assertj:assertj-core")
        add("testRuntimeOnly", "org.junit.platform:junit-platform-launcher")
    }

    tasks.withType<Test>().configureEach {
        useJUnitPlatform()
        testLogging {
            events("passed", "skipped", "failed")
        }
    }
}
```

`zappy-domain/build.gradle.kts`

```kotlin
plugins {
    `java-test-fixtures`
}

dependencies {
    implementation(kotlin("stdlib"))
}
```

`zappy-application/build.gradle.kts`

```kotlin
dependencies {
    api(project(":zappy-domain"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core")

    testImplementation(testFixtures(project(":zappy-domain")))
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test")
}
```

`zappy-adapters/build.gradle.kts`

```kotlin
plugins {
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
}

val contractDirectory = rootProject.layout.projectDirectory.dir("../../contract")

val copyContract by tasks.registering(Copy::class) {
    into(layout.buildDirectory.dir("generated/contract"))
    from(contractDirectory.file("schema.graphql")) {
        into("graphql")
        rename { "schema.graphqls" }
    }
    from(contractDirectory.file("schema.development.graphql")) {
        into("graphql-development")
        rename { "development.graphqls" }
    }
    from(contractDirectory.dir("seed")) {
        into("contract-seed")
        include("*.json")
    }
}

sourceSets.named("main") {
    resources.srcDir(copyContract)
}

dependencies {
    api(project(":zappy-application"))

    api("org.springframework.boot:spring-boot-starter-web")
    api("org.springframework.boot:spring-boot-starter-graphql")
    api("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.security:spring-security-crypto")
    implementation("org.springframework.security:spring-security-oauth2-jose")
    implementation("org.bouncycastle:bcprov-jdk18on:1.85.2")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")

    runtimeOnly("com.h2database:h2")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation(testFixtures(project(":zappy-domain")))
}
```

`zappy-host/build.gradle.kts`

```kotlin
plugins {
    kotlin("plugin.spring")
    id("org.springframework.boot")
}

dependencies {
    implementation(project(":zappy-adapters"))
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.graphql:spring-graphql-test")
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveFileName.set("zappy-mart-kotlin.jar")
}
```

The `copyContract` task is what keeps this backend and the contract from
drifting: it copies `contract/schema.graphql`,
`contract/schema.development.graphql` and the four seed files into the
adapters module's resources at build time. The schema the server serves
and the seed it loads are the files in `contract/`, and editing them and
rebuilding is the whole update.

### 5.2 zappy-domain

The middle of the hexagon. Data classes for the things, value classes for
the values, sealed interfaces for the outcomes and the promotion rules,
and not one framework import.

`zappy-domain/src/main/kotlin/nl/zappymart/domain/shared/Money.kt`

```kotlin
package nl.zappymart.domain.shared

import java.math.BigDecimal
import java.math.RoundingMode

data class Money(val amount: Int, val currency: String) : Comparable<Money> {

    init {
        require(amount >= 0) { "An amount of money is never negative, and $amount is" }
        require(currency.length == 3) { "A currency is an ISO 4217 code of three letters, and $currency is not" }
    }

    operator fun plus(other: Money): Money {
        requireTheSameCurrencyAs(other)
        return Money(amount + other.amount, currency)
    }

    operator fun minus(other: Money): Money {
        requireTheSameCurrencyAs(other)
        return Money(amount - other.amount, currency)
    }

    operator fun times(count: Int): Money = Money(amount * count, currency)

    override fun compareTo(other: Money): Int {
        requireTheSameCurrencyAs(other)
        return amount.compareTo(other.amount)
    }

    fun percentageRoundedHalfUp(percentage: Int): Money {
        val discounted = BigDecimal(amount)
            .multiply(BigDecimal(percentage))
            .divide(BigDecimal(100), 0, RoundingMode.HALF_UP)
        return Money(discounted.toInt(), currency)
    }

    fun cappedAt(maximum: Money): Money = if (this > maximum) maximum else this

    private fun requireTheSameCurrencyAs(other: Money) =
        require(currency == other.currency) {
            "Two amounts of money in $currency and ${other.currency} cannot be combined"
        }

    companion object {
        const val EURO = "EUR"

        val NOTHING = Money(0, EURO)

        fun euro(amount: Int) = Money(amount, EURO)
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/shared/EmailAddress.kt`

```kotlin
package nl.zappymart.domain.shared

@JvmInline
value class EmailAddress private constructor(val value: String) {

    override fun toString(): String = value

    companion object {
        private val SHAPE = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

        fun of(text: String): Result<EmailAddress> {
            val normalised = text.trim().lowercase()
            return if (SHAPE.matches(normalised)) {
                Result.Success(EmailAddress(normalised))
            } else {
                refusal(UserErrorCode.EMAIL_INVALID, "That is not an email address.", "input.email")
            }
        }

        fun ofStored(value: String) = EmailAddress(value)
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/shared/PromotionCode.kt`

```kotlin
package nl.zappymart.domain.shared

@JvmInline
value class PromotionCode private constructor(val value: String) {

    override fun toString(): String = value

    companion object {
        fun of(text: String) = PromotionCode(text.trim().uppercase())
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/shared/UserErrorCode.kt`

```kotlin
package nl.zappymart.domain.shared

enum class UserErrorCode {
    PRODUCT_NOT_FOUND,
    OUT_OF_STOCK,
    QUANTITY_INVALID,
    CART_LINE_NOT_FOUND,
    CART_EMPTY,
    CODE_UNKNOWN,
    CODE_EXPIRED,
    CODE_EXHAUSTED,
    CODE_MINIMUM_NOT_MET,
    EMAIL_TAKEN,
    EMAIL_INVALID,
    PASSWORD_TOO_SHORT,
    PASSWORD_TOO_LONG,
    CREDENTIALS_INVALID,
    RATE_LIMITED,
    SESSION_INVALID,
    SESSION_NOT_FOUND,
    NOT_AUTHENTICATED,
    ORDER_NOT_FOUND,
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/shared/UserError.kt`

```kotlin
package nl.zappymart.domain.shared

data class UserError(val code: UserErrorCode, val message: String, val field: String? = null)
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/shared/Result.kt`

```kotlin
package nl.zappymart.domain.shared

sealed interface Result<out Value> {

    data class Success<Value>(val value: Value) : Result<Value>

    data class Refused(val errors: List<UserError>) : Result<Nothing>
}

fun refusal(code: UserErrorCode, message: String, field: String? = null): Result.Refused =
    Result.Refused(listOf(UserError(code, message, field)))

fun <Value> succeed(value: Value): Result<Value> = Result.Success(value)

inline fun <Value, Other> Result<Value>.map(transform: (Value) -> Other): Result<Other> =
    when (this) {
        is Result.Success -> Result.Success(transform(value))
        is Result.Refused -> this
    }

inline fun <Value, Other> Result<Value>.andThen(next: (Value) -> Result<Other>): Result<Other> =
    when (this) {
        is Result.Success -> next(value)
        is Result.Refused -> this
    }

fun <Value> Result<Value>.valueOrNull(): Value? =
    when (this) {
        is Result.Success -> value
        is Result.Refused -> null
    }

fun <Value> Result<Value>.errors(): List<UserError> =
    when (this) {
        is Result.Success -> emptyList()
        is Result.Refused -> errors
    }
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/shared/DomainEvent.kt`

```kotlin
package nl.zappymart.domain.shared

interface DomainEvent
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/catalogue/Category.kt`

```kotlin
package nl.zappymart.domain.catalogue

data class Category(val id: String, val name: String, val slug: String)
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/catalogue/Product.kt`

```kotlin
package nl.zappymart.domain.catalogue

import nl.zappymart.domain.shared.Money

data class Product(
    val id: String,
    val name: String,
    val slug: String,
    val description: String,
    val price: Money,
    val category: Category,
    val stock: Int,
    val imageUrl: String?,
) {

    fun hasStockFor(quantity: Int): Boolean = stock >= quantity

    fun withStockReducedBy(quantity: Int): Product {
        require(hasStockFor(quantity)) { "Product $id has $stock in stock and cannot give up $quantity" }
        return copy(stock = stock - quantity)
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/catalogue/ProductSpecification.kt`

```kotlin
package nl.zappymart.domain.catalogue

sealed interface ProductSpecification {

    fun isSatisfiedBy(product: Product): Boolean

    data class InCategory(val categorySlug: String) : ProductSpecification {
        override fun isSatisfiedBy(product: Product) = product.category.slug == categorySlug
    }

    data class NameContains(val text: String) : ProductSpecification {
        override fun isSatisfiedBy(product: Product) = product.name.contains(text, ignoreCase = true)
    }

    data object InStock : ProductSpecification {
        override fun isSatisfiedBy(product: Product) = product.stock > 0
    }

    data class MatchingAll(val parts: List<ProductSpecification>) : ProductSpecification {
        override fun isSatisfiedBy(product: Product) = parts.all { part -> part.isSatisfiedBy(product) }
    }

    companion object {
        val EVERYTHING = MatchingAll(emptyList())

        fun of(categorySlug: String?, nameContains: String?, inStockOnly: Boolean?): ProductSpecification {
            val parts = buildList {
                categorySlug?.let { slug -> add(InCategory(slug)) }
                nameContains?.takeIf { text -> text.isNotBlank() }?.let { text -> add(NameContains(text.trim())) }
                if (inStockOnly == true) add(InStock)
            }
            return MatchingAll(parts)
        }
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/cart/CartLine.kt`

```kotlin
package nl.zappymart.domain.cart

import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.Money

data class CartLine(val id: String, val product: Product, val quantity: Int) {

    init {
        require(quantity >= 1) { "A cart line holds one product or more, not $quantity" }
    }

    val lineTotal: Money get() = product.price * quantity
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/cart/Shipping.kt`

```kotlin
package nl.zappymart.domain.cart

import nl.zappymart.domain.promotions.AppliedPromotion
import nl.zappymart.domain.shared.Money

object Shipping {

    val CHARGE = Money.euro(495)

    val FREE_FROM_SUBTOTAL = Money.euro(5000)

    fun forSubtotal(subtotal: Money, promotion: AppliedPromotion?, cartHasLines: Boolean): Money = when {
        !cartHasLines -> Money.NOTHING
        promotion != null && promotion.takesShippingAway -> Money.NOTHING
        subtotal >= FREE_FROM_SUBTOTAL -> Money.NOTHING
        else -> CHARGE
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/cart/Cart.kt`

```kotlin
package nl.zappymart.domain.cart

import java.time.Instant
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.promotions.AppliedPromotion
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class Cart(
    val id: String,
    val customerId: String?,
    val lines: List<CartLine>,
    val promotionCode: PromotionCode?,
    val promotion: AppliedPromotion?,
    val updatedAt: Instant,
) {

    val subtotal: Money
        get() = lines.fold(Money.NOTHING) { runningTotal, line -> runningTotal + line.lineTotal }

    val shipping: Money get() = Shipping.forSubtotal(subtotal, promotion, lines.isNotEmpty())

    val discount: Money get() = promotion?.discount ?: Money.NOTHING

    val total: Money get() = subtotal + shipping - discount

    val isEmpty: Boolean get() = lines.isEmpty()

    fun lineFor(productId: String): CartLine? = lines.firstOrNull { line -> line.product.id == productId }

    fun withProductAdded(product: Product, quantity: Int, newLineId: String, moment: Instant): Result<Cart> {
        if (quantity < 1) {
            return refusal(UserErrorCode.QUANTITY_INVALID, "A quantity is one or more.", "quantity")
        }
        val existing = lineFor(product.id)
        val wanted = quantity + (existing?.quantity ?: 0)
        if (!product.hasStockFor(wanted)) {
            return outOfStock(product, wanted)
        }
        val changed = if (existing == null) {
            lines + CartLine(newLineId, product, wanted)
        } else {
            lines.map { line -> if (line.id == existing.id) line.copy(product = product, quantity = wanted) else line }
        }
        return Result.Success(copy(lines = changed, updatedAt = moment))
    }

    fun withLineQuantityChanged(lineId: String, quantity: Int, moment: Instant): Result<Cart> {
        if (quantity < 1) {
            return refusal(
                UserErrorCode.QUANTITY_INVALID,
                "A quantity is one or more, and removeCartLine is how a line goes away.",
                "quantity",
            )
        }
        val line = lines.firstOrNull { candidate -> candidate.id == lineId }
            ?: return refusal(UserErrorCode.CART_LINE_NOT_FOUND, "That line is not in this cart.", "lineId")
        if (!line.product.hasStockFor(quantity)) {
            return outOfStock(line.product, quantity)
        }
        val changed = lines.map { candidate ->
            if (candidate.id == lineId) candidate.copy(quantity = quantity) else candidate
        }
        return Result.Success(copy(lines = changed, updatedAt = moment))
    }

    fun withLineRemoved(lineId: String, moment: Instant): Result<Cart> {
        if (lines.none { line -> line.id == lineId }) {
            return refusal(UserErrorCode.CART_LINE_NOT_FOUND, "That line is not in this cart.", "lineId")
        }
        return Result.Success(copy(lines = lines.filterNot { line -> line.id == lineId }, updatedAt = moment))
    }

    fun withPromotion(applied: AppliedPromotion, moment: Instant): Cart =
        copy(promotionCode = applied.code, promotion = applied, updatedAt = moment)

    fun withoutPromotion(moment: Instant): Cart =
        if (promotionCode == null && promotion == null) {
            this
        } else {
            copy(promotionCode = null, promotion = null, updatedAt = moment)
        }

    fun emptied(moment: Instant): Cart =
        copy(lines = emptyList(), promotionCode = null, promotion = null, updatedAt = moment)

    fun belongingTo(customerId: String, moment: Instant): Cart = copy(customerId = customerId, updatedAt = moment)

    private fun outOfStock(product: Product, wanted: Int): Result.Refused = refusal(
        UserErrorCode.OUT_OF_STOCK,
        "${product.name} has ${product.stock} in stock and $wanted were asked for.",
        "quantity",
    )

    companion object {
        fun empty(id: String, customerId: String?, moment: Instant) =
            Cart(id, customerId, emptyList(), null, null, moment)
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/promotions/PromotionKind.kt`

```kotlin
package nl.zappymart.domain.promotions

enum class PromotionKind {
    PERCENTAGE,
    FIXED_AMOUNT,
    FREE_SHIPPING,
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/promotions/PromotionRule.kt`

```kotlin
package nl.zappymart.domain.promotions

import nl.zappymart.domain.shared.Money

sealed interface PromotionRule {

    val kind: PromotionKind

    fun discountFor(subtotal: Money): Money

    data class Percentage(val percentage: Int) : PromotionRule {

        init {
            require(percentage in 1..100) { "A percentage code takes between 1 and 100 percent, not $percentage" }
        }

        override val kind = PromotionKind.PERCENTAGE

        override fun discountFor(subtotal: Money) = subtotal.percentageRoundedHalfUp(percentage)
    }

    data class FixedAmount(val amount: Money) : PromotionRule {

        override val kind = PromotionKind.FIXED_AMOUNT

        override fun discountFor(subtotal: Money) = amount.cappedAt(subtotal)
    }

    data object FreeShipping : PromotionRule {

        override val kind = PromotionKind.FREE_SHIPPING

        override fun discountFor(subtotal: Money) = Money(0, subtotal.currency)
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/promotions/AppliedPromotion.kt`

```kotlin
package nl.zappymart.domain.promotions

import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode

data class AppliedPromotion(
    val code: PromotionCode,
    val kind: PromotionKind,
    val discount: Money,
) {
    val takesShippingAway: Boolean get() = kind == PromotionKind.FREE_SHIPPING
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/promotions/Promotion.kt`

```kotlin
package nl.zappymart.domain.promotions

import java.time.Instant
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class Promotion(
    val code: PromotionCode,
    val rule: PromotionRule,
    val minimumSubtotal: Money?,
    val validFrom: Instant,
    val validUntil: Instant,
    val usageLimit: Int?,
    val timesUsed: Int,
) {

    fun applyTo(subtotal: Money, moment: Instant): Result<AppliedPromotion> = when {
        moment.isBefore(validFrom) || moment.isAfter(validUntil) ->
            refusal(UserErrorCode.CODE_EXPIRED, "The code ${code.value} is outside its validity window.", "code")

        usageLimit != null && timesUsed >= usageLimit ->
            refusal(UserErrorCode.CODE_EXHAUSTED, "The code ${code.value} has reached its usage limit.", "code")

        minimumSubtotal != null && subtotal < minimumSubtotal ->
            refusal(
                UserErrorCode.CODE_MINIMUM_NOT_MET,
                "The code ${code.value} needs a subtotal of at least ${minimumSubtotal.amount} cents.",
                "code",
            )

        else -> Result.Success(AppliedPromotion(code, rule.kind, rule.discountFor(subtotal)))
    }

    fun usedOnce() = copy(timesUsed = timesUsed + 1)
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/ordering/OrderStatus.kt`

```kotlin
package nl.zappymart.domain.ordering

enum class OrderStatus {
    PLACED,
    PAID,
    CANCELLED,
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/ordering/OrderLine.kt`

```kotlin
package nl.zappymart.domain.ordering

import nl.zappymart.domain.shared.Money

data class OrderLine(
    val productId: String,
    val productName: String,
    val unitPrice: Money,
    val quantity: Int,
) {
    val lineTotal: Money get() = unitPrice * quantity
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/ordering/OrderPlaced.kt`

```kotlin
package nl.zappymart.domain.ordering

import java.time.Instant
import nl.zappymart.domain.shared.DomainEvent
import nl.zappymart.domain.shared.PromotionCode

data class OrderPlaced(
    val orderId: String,
    val orderNumber: String,
    val customerId: String,
    val promotionCode: PromotionCode?,
    val placedAt: Instant,
) : DomainEvent
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/ordering/Order.kt`

```kotlin
package nl.zappymart.domain.ordering

import java.time.Instant
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class Order(
    val id: String,
    val number: String,
    val customerId: String,
    val status: OrderStatus,
    val lines: List<OrderLine>,
    val promotionCode: PromotionCode?,
    val subtotal: Money,
    val discount: Money,
    val shipping: Money,
    val total: Money,
    val placedAt: Instant,
) {

    fun placed() = OrderPlaced(id, number, customerId, promotionCode, placedAt)

    companion object {

        fun place(cart: Cart, customerId: String, id: String, number: String, moment: Instant): Result<Order> {
            if (cart.isEmpty) {
                return refusal(UserErrorCode.CART_EMPTY, "There is nothing in the cart to order.")
            }
            val short = cart.lines.firstOrNull { line -> !line.product.hasStockFor(line.quantity) }
            if (short != null) {
                return refusal(
                    UserErrorCode.OUT_OF_STOCK,
                    "${short.product.name} has ${short.product.stock} in stock and ${short.quantity} were ordered.",
                )
            }
            return Result.Success(
                Order(
                    id = id,
                    number = number,
                    customerId = customerId,
                    status = OrderStatus.PAID,
                    lines = cart.lines.map { line ->
                        OrderLine(line.product.id, line.product.name, line.product.price, line.quantity)
                    },
                    promotionCode = cart.promotion?.code,
                    subtotal = cart.subtotal,
                    discount = cart.discount,
                    shipping = cart.shipping,
                    total = cart.total,
                    placedAt = moment,
                ),
            )
        }
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/accounts/PasswordHash.kt`

```kotlin
package nl.zappymart.domain.accounts

@JvmInline
value class PasswordHash(val value: String) {

    override fun toString(): String = "PasswordHash(hidden)"
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/accounts/PasswordPolicy.kt`

```kotlin
package nl.zappymart.domain.accounts

import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

object PasswordPolicy {

    const val MINIMUM_LENGTH = 12

    const val MAXIMUM_LENGTH = 128

    fun check(password: String): Result<Unit> = when {
        password.length < MINIMUM_LENGTH -> refusal(
            UserErrorCode.PASSWORD_TOO_SHORT,
            "A password is at least $MINIMUM_LENGTH characters long.",
            "input.password",
        )

        password.length > MAXIMUM_LENGTH -> refusal(
            UserErrorCode.PASSWORD_TOO_LONG,
            "A password is at most $MAXIMUM_LENGTH characters long.",
            "input.password",
        )

        else -> Result.Success(Unit)
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/accounts/Customer.kt`

```kotlin
package nl.zappymart.domain.accounts

import java.time.Instant
import nl.zappymart.domain.shared.EmailAddress

data class Customer(
    val id: String,
    val email: EmailAddress,
    val name: String,
    val passwordHash: PasswordHash,
    val createdAt: Instant,
)
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/accounts/Session.kt`

```kotlin
package nl.zappymart.domain.accounts

import java.time.Instant

data class Session(
    val id: String,
    val customerId: String,
    val device: String,
    val createdAt: Instant,
    val lastUsedAt: Instant,
    val expiresAt: Instant,
    val revokedAt: Instant?,
) {

    fun isOpenAt(moment: Instant): Boolean = revokedAt == null && moment.isBefore(expiresAt)

    fun usedAt(moment: Instant) = copy(lastUsedAt = moment)

    fun revokedAt(moment: Instant) = copy(revokedAt = moment)

    companion object {
        const val LIFETIME_IN_DAYS = 30L
    }
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/accounts/RefreshToken.kt`

```kotlin
package nl.zappymart.domain.accounts

import java.time.Instant

data class RefreshToken(
    val tokenHash: String,
    val sessionId: String,
    val issuedAt: Instant,
    val expiresAt: Instant,
    val rotatedAt: Instant?,
) {

    fun isUsableAt(moment: Instant): Boolean = rotatedAt == null && moment.isBefore(expiresAt)

    fun wasAlreadyUsed(): Boolean = rotatedAt != null

    fun rotatedAt(moment: Instant) = copy(rotatedAt = moment)
}
```

`zappy-domain/src/main/kotlin/nl/zappymart/domain/accounts/Wishlist.kt`

```kotlin
package nl.zappymart.domain.accounts

data class Wishlist(val ownerId: String, val productIds: List<String>) {

    fun with(productId: String): Wishlist =
        if (productIds.contains(productId)) this else copy(productIds = listOf(productId) + productIds)

    fun without(productId: String): Wishlist =
        copy(productIds = productIds.filterNot { saved -> saved == productId })

    fun mergedWith(other: Wishlist): Wishlist =
        other.productIds.reversed().fold(this) { running, productId -> running.with(productId) }

    companion object {
        fun emptyFor(ownerId: String) = Wishlist(ownerId, emptyList())
    }
}
```

Two decisions in this module are worth naming.

`Shipping` sits in the cart package rather than in ordering, although
`docs/domain.md` files the rule under Ordering. The charge is computed
from a cart while the visitor shops, and `Order.place` copies the four
amounts the cart showed, so the rule lives where the number is made and
the order takes a copy. There is still exactly one place that knows the
495 and the 5000.

`Cart` carries both a `promotionCode` and a `promotion`. The code is what
is stored: the text the visitor typed. The promotion is what that code
takes off this cart right now, and it is computed again on every read,
because a cart that grows or shrinks changes what a percentage is worth.
When the code stops applying at all, the cart drops it.

### 5.3 zappy-application

Use cases with one `execute`, the ports they need, and nothing else. A
use case reads like the rule it carries out.

`zappy-application/src/main/kotlin/nl/zappymart/application/Visitor.kt`

```kotlin
package nl.zappymart.application

data class Visitor(val customerId: String?, val sessionId: String?, val cartId: String?) {

    val isSignedIn: Boolean get() = customerId != null

    companion object {
        val ANONYMOUS = Visitor(null, null, null)
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/Page.kt`

```kotlin
package nl.zappymart.application

data class Page<Item>(val items: List<Item>, val hasNextPage: Boolean, val totalCount: Int) {

    companion object {
        const val MAXIMUM_SIZE = 100

        fun sizeAsked(first: Int): Int = first.coerceIn(0, MAXIMUM_SIZE)
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/ProductRepository.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification

interface ProductRepository {

    fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product>

    fun count(specification: ProductSpecification): Int

    fun findById(productId: String): Product?

    fun findBySlug(slug: String): Product?

    fun findAllByIds(productIds: List<String>): List<Product>

    fun reduceStock(quantityPerProductId: Map<String, Int>)
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/CategoryRepository.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.catalogue.Category

interface CategoryRepository {

    fun findAll(): List<Category>
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/CartRepository.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.cart.Cart

interface CartRepository {

    fun findById(cartId: String): Cart?

    fun findByCustomerId(customerId: String): Cart?

    fun save(cart: Cart): Cart

    fun delete(cartId: String)
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/PromotionRepository.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.shared.PromotionCode

interface PromotionRepository {

    fun findByCode(code: PromotionCode): Promotion?

    fun save(promotion: Promotion)
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/OrderRepository.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.ordering.Order

interface OrderRepository {

    fun save(order: Order): Order

    fun page(customerId: String, size: Int, afterOrderId: String?): List<Order>

    fun count(customerId: String): Int

    fun findForCustomer(orderId: String, customerId: String): Order?
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/CustomerRepository.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.shared.EmailAddress

interface CustomerRepository {

    fun findById(customerId: String): Customer?

    fun findByEmail(email: EmailAddress): Customer?

    fun save(customer: Customer): Customer
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/SessionRepository.kt`

```kotlin
package nl.zappymart.application.ports

import java.time.Instant
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session

interface SessionRepository {

    fun save(session: Session): Session

    fun findById(sessionId: String): Session?

    fun findOpenForCustomer(customerId: String, moment: Instant): List<Session>

    fun saveRefreshToken(token: RefreshToken): RefreshToken

    fun findRefreshTokenByHash(tokenHash: String): RefreshToken?

    fun revokeSessionAndItsTokens(sessionId: String, moment: Instant)
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/WishlistRepository.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.accounts.Wishlist

interface WishlistRepository {

    fun findByOwnerId(ownerId: String): Wishlist

    fun save(wishlist: Wishlist)

    fun delete(ownerId: String)
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/PasswordHasher.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.accounts.PasswordHash

interface PasswordHasher {

    fun hash(password: String): PasswordHash

    fun matches(password: String, hash: PasswordHash): Boolean
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/AccessTokenIssuer.kt`

```kotlin
package nl.zappymart.application.ports

import java.time.Instant

data class AccessToken(val value: String, val expiresAt: Instant)

data class SignedInVisitor(val customerId: String, val sessionId: String)

interface AccessTokenIssuer {

    fun issue(customerId: String, sessionId: String, moment: Instant): AccessToken

    fun verify(token: String): SignedInVisitor?
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/RefreshTokenIssuer.kt`

```kotlin
package nl.zappymart.application.ports

data class IssuedRefreshToken(val value: String, val tokenHash: String)

interface RefreshTokenIssuer {

    fun issue(): IssuedRefreshToken

    fun hashOf(value: String): String
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/Clock.kt`

```kotlin
package nl.zappymart.application.ports

import java.time.Instant

interface Clock {

    fun moment(): Instant
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/IdentifierFactory.kt`

```kotlin
package nl.zappymart.application.ports

interface IdentifierFactory {

    fun next(): String
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/OrderNumberFactory.kt`

```kotlin
package nl.zappymart.application.ports

import java.time.Instant

interface OrderNumberFactory {

    fun next(moment: Instant): String
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/Mailer.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Money

data class OrderConfirmation(
    val recipient: EmailAddress,
    val customerName: String,
    val orderNumber: String,
    val total: Money,
)

interface Mailer {

    fun send(confirmation: OrderConfirmation)
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/UnitOfWork.kt`

```kotlin
package nl.zappymart.application.ports

interface UnitOfWork {

    fun <Value> execute(work: () -> Value): Value
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/DomainEventPublisher.kt`

```kotlin
package nl.zappymart.application.ports

import nl.zappymart.domain.shared.DomainEvent

interface DomainEventPublisher {

    fun publish(event: DomainEvent)
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ports/RateLimiter.kt`

```kotlin
package nl.zappymart.application.ports

interface RateLimiter {

    fun allows(key: String): Boolean
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/catalogue/ListProducts.kt`

```kotlin
package nl.zappymart.application.catalogue

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import nl.zappymart.application.Page
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification

class ListProducts(private val products: ProductRepository) {

    suspend fun execute(
        specification: ProductSpecification,
        first: Int,
        afterProductId: String?,
    ): Page<Product> = coroutineScope {
        val size = Page.sizeAsked(first)
        val oneMoreThanTheSize = async(Dispatchers.IO) { products.page(specification, size + 1, afterProductId) }
        val matching = async(Dispatchers.IO) { products.count(specification) }
        val fetched = oneMoreThanTheSize.await()
        Page(fetched.take(size), fetched.size > size, matching.await())
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/catalogue/FindProduct.kt`

```kotlin
package nl.zappymart.application.catalogue

import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.catalogue.Product

class FindProduct(private val products: ProductRepository) {

    fun execute(slug: String): Product? = products.findBySlug(slug)
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/catalogue/ListCategories.kt`

```kotlin
package nl.zappymart.application.catalogue

import nl.zappymart.application.ports.CategoryRepository
import nl.zappymart.domain.catalogue.Category

class ListCategories(private val categories: CategoryRepository) {

    fun execute(): List<Category> = categories.findAll()
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/cart/VisitorCart.kt`

```kotlin
package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.shared.Result

class VisitorCart(
    private val carts: CartRepository,
    private val clock: Clock,
    private val identifiers: IdentifierFactory,
) {

    fun of(visitor: Visitor): Cart {
        val moment = clock.moment()
        val customerId = visitor.customerId
        if (customerId != null) {
            return carts.findByCustomerId(customerId) ?: Cart.empty(identifiers.next(), customerId, moment)
        }
        val cartId = visitor.cartId
        if (cartId != null) {
            val found = carts.findById(cartId)
            if (found != null) {
                return found
            }
        }
        return Cart.empty(identifiers.next(), null, moment)
    }

    fun moveToCustomer(visitor: Visitor, customerId: String): Cart {
        val moment = clock.moment()
        val customerCart = carts.findByCustomerId(customerId)
        val anonymousCart = visitor.cartId?.let { cartId -> carts.findById(cartId) }
        if (anonymousCart == null || anonymousCart.customerId != null) {
            return customerCart ?: Cart.empty(identifiers.next(), customerId, moment)
        }
        if (customerCart == null) {
            return carts.save(anonymousCart.belongingTo(customerId, moment))
        }
        val merged = anonymousCart.lines.fold(customerCart) { running, line ->
            when (val added = running.withProductAdded(line.product, line.quantity, identifiers.next(), moment)) {
                is Result.Success -> added.value
                is Result.Refused -> running
            }
        }
        carts.delete(anonymousCart.id)
        return carts.save(merged)
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/cart/CartPromotion.kt`

```kotlin
package nl.zappymart.application.cart

import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.map
import nl.zappymart.domain.shared.refusal

class CartPromotion(
    private val promotions: PromotionRepository,
    private val clock: Clock,
) {

    fun refreshed(cart: Cart): Cart {
        val code = cart.promotionCode ?: return cart
        val promotion = promotions.findByCode(code) ?: return cart.withoutPromotion(cart.updatedAt)
        return when (val applied = promotion.applyTo(cart.subtotal, clock.moment())) {
            is Result.Success -> cart.withPromotion(applied.value, cart.updatedAt)
            is Result.Refused -> cart.withoutPromotion(cart.updatedAt)
        }
    }

    fun applying(cart: Cart, text: String): Result<Cart> {
        val code = PromotionCode.of(text)
        val promotion = promotions.findByCode(code)
            ?: return refusal(UserErrorCode.CODE_UNKNOWN, "There is no promotion code ${code.value}.", "code")
        val moment = clock.moment()
        return promotion.applyTo(cart.subtotal, moment).map { applied -> cart.withPromotion(applied, moment) }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/cart/CartChange.kt`

```kotlin
package nl.zappymart.application.cart

import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.UserError
import nl.zappymart.domain.shared.UserErrorCode

data class CartChange(val cart: Cart, val availableStock: Int?, val errors: List<UserError>) {

    companion object {

        fun made(cart: Cart) = CartChange(cart, null, emptyList())

        fun refused(cart: Cart, errors: List<UserError>, product: Product?): CartChange {
            val ranOutOfStock = errors.any { error -> error.code == UserErrorCode.OUT_OF_STOCK }
            return CartChange(cart, if (ranOutOfStock) product?.stock else null, errors)
        }

        fun productNotFound(cart: Cart, productId: String) = CartChange(
            cart,
            null,
            listOf(UserError(UserErrorCode.PRODUCT_NOT_FOUND, "There is no product $productId.", "productId")),
        )
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/cart/ViewCart.kt`

```kotlin
package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.domain.cart.Cart

class ViewCart(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
) {

    fun execute(visitor: Visitor): Cart = cartPromotion.refreshed(visitorCart.of(visitor))
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/cart/AddToCart.kt`

```kotlin
package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.shared.Result

class AddToCart(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val products: ProductRepository,
    private val identifiers: IdentifierFactory,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, productId: String, quantity: Int): CartChange = unitOfWork.execute {
        val cart = cartPromotion.refreshed(visitorCart.of(visitor))
        val product = products.findById(productId)
        if (product == null) {
            CartChange.productNotFound(cart, productId)
        } else {
            when (val changed = cart.withProductAdded(product, quantity, identifiers.next(), clock.moment())) {
                is Result.Success -> CartChange.made(carts.save(cartPromotion.refreshed(changed.value)))
                is Result.Refused -> CartChange.refused(cart, changed.errors, product)
            }
        }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/cart/ChangeCartLineQuantity.kt`

```kotlin
package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.shared.Result

class ChangeCartLineQuantity(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, lineId: String, quantity: Int): CartChange = unitOfWork.execute {
        val cart = cartPromotion.refreshed(visitorCart.of(visitor))
        when (val changed = cart.withLineQuantityChanged(lineId, quantity, clock.moment())) {
            is Result.Success -> CartChange.made(carts.save(cartPromotion.refreshed(changed.value)))
            is Result.Refused -> CartChange.refused(cart, changed.errors, cart.lines.firstOrNull { line -> line.id == lineId }?.product)
        }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/cart/RemoveCartLine.kt`

```kotlin
package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.shared.Result

class RemoveCartLine(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, lineId: String): CartChange = unitOfWork.execute {
        val cart = cartPromotion.refreshed(visitorCart.of(visitor))
        when (val changed = cart.withLineRemoved(lineId, clock.moment())) {
            is Result.Success -> CartChange.made(carts.save(cartPromotion.refreshed(changed.value)))
            is Result.Refused -> CartChange.refused(cart, changed.errors, null)
        }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/cart/ApplyPromotionCode.kt`

```kotlin
package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.shared.Result

class ApplyPromotionCode(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, code: String): CartChange = unitOfWork.execute {
        val cart = cartPromotion.refreshed(visitorCart.of(visitor))
        when (val changed = cartPromotion.applying(cart, code)) {
            is Result.Success -> CartChange.made(carts.save(changed.value))
            is Result.Refused -> CartChange.refused(cart, changed.errors, null)
        }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/cart/RemovePromotionCode.kt`

```kotlin
package nl.zappymart.application.cart

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.UnitOfWork

class RemovePromotionCode(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor): CartChange = unitOfWork.execute {
        val cart = cartPromotion.refreshed(visitorCart.of(visitor))
        CartChange.made(carts.save(cart.withoutPromotion(clock.moment())))
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ordering/PlaceOrder.kt`

```kotlin
package nl.zappymart.application.ordering

import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.CartPromotion
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.DomainEventPublisher
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.OrderNumberFactory
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

class PlaceOrder(
    private val visitorCart: VisitorCart,
    private val cartPromotion: CartPromotion,
    private val carts: CartRepository,
    private val products: ProductRepository,
    private val orders: OrderRepository,
    private val identifiers: IdentifierFactory,
    private val orderNumbers: OrderNumberFactory,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
    private val events: DomainEventPublisher,
) {

    fun execute(visitor: Visitor): Result<Order> {
        val customerId = visitor.customerId
            ?: return refusal(UserErrorCode.NOT_AUTHENTICATED, "Placing an order needs a signed in customer.")
        return unitOfWork.execute {
            val cart = cartPromotion.refreshed(visitorCart.of(visitor))
            val moment = clock.moment()
            val placed = Order.place(cart, customerId, identifiers.next(), orderNumbers.next(moment), moment)
            if (placed is Result.Success) {
                val order = placed.value
                products.reduceStock(order.lines.associate { line -> line.productId to line.quantity })
                orders.save(order)
                carts.save(cart.emptied(moment))
                events.publish(order.placed())
            }
            placed
        }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ordering/ListOrders.kt`

```kotlin
package nl.zappymart.application.ordering

import nl.zappymart.application.Page
import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.domain.ordering.Order

class ListOrders(private val orders: OrderRepository) {

    fun execute(visitor: Visitor, first: Int, afterOrderId: String?): Page<Order> {
        val customerId = visitor.customerId ?: return Page(emptyList(), false, 0)
        val size = Page.sizeAsked(first)
        val fetched = orders.page(customerId, size + 1, afterOrderId)
        return Page(fetched.take(size), fetched.size > size, orders.count(customerId))
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ordering/FindOrder.kt`

```kotlin
package nl.zappymart.application.ordering

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.domain.ordering.Order

class FindOrder(private val orders: OrderRepository) {

    fun execute(visitor: Visitor, orderId: String): Order? {
        val customerId = visitor.customerId ?: return null
        return orders.findForCustomer(orderId, customerId)
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/ordering/SendOrderConfirmation.kt`

```kotlin
package nl.zappymart.application.ordering

import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.Mailer
import nl.zappymart.application.ports.OrderConfirmation
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.domain.ordering.OrderPlaced

class SendOrderConfirmation(
    private val customers: CustomerRepository,
    private val orders: OrderRepository,
    private val mailer: Mailer,
) {

    fun handle(event: OrderPlaced) {
        val customer = customers.findById(event.customerId) ?: return
        val order = orders.findForCustomer(event.orderId, event.customerId) ?: return
        mailer.send(OrderConfirmation(customer.email, customer.name, order.number, order.total))
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/promotions/CountPromotionUse.kt`

```kotlin
package nl.zappymart.application.promotions

import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.domain.ordering.OrderPlaced

class CountPromotionUse(private val promotions: PromotionRepository) {

    fun handle(event: OrderPlaced) {
        val code = event.promotionCode ?: return
        val promotion = promotions.findByCode(code) ?: return
        promotions.save(promotion.usedOnce())
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/Authentication.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.ports.AccessToken
import nl.zappymart.domain.accounts.Customer

data class Authentication(
    val customer: Customer,
    val sessionId: String,
    val accessToken: AccessToken,
    val refreshToken: String,
)
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/SignIn.kt`

```kotlin
package nl.zappymart.application.accounts

import java.time.temporal.ChronoUnit
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session

class SignIn(
    private val sessions: SessionRepository,
    private val accessTokens: AccessTokenIssuer,
    private val refreshTokens: RefreshTokenIssuer,
    private val identifiers: IdentifierFactory,
    private val clock: Clock,
) {

    fun start(customer: Customer, device: String): Authentication {
        val moment = clock.moment()
        val expiresAt = moment.plus(Session.LIFETIME_IN_DAYS, ChronoUnit.DAYS)
        val session = sessions.save(
            Session(
                id = identifiers.next(),
                customerId = customer.id,
                device = device,
                createdAt = moment,
                lastUsedAt = moment,
                expiresAt = expiresAt,
                revokedAt = null,
            ),
        )
        val issued = refreshTokens.issue()
        sessions.saveRefreshToken(RefreshToken(issued.tokenHash, session.id, moment, expiresAt, null))
        return Authentication(
            customer,
            session.id,
            accessTokens.issue(customer.id, session.id, moment),
            issued.value,
        )
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/IdentifyVisitor.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.SessionRepository

class IdentifyVisitor(
    private val accessTokens: AccessTokenIssuer,
    private val sessions: SessionRepository,
    private val clock: Clock,
) {

    fun execute(bearerToken: String?, cartId: String?): Visitor {
        val signedIn = bearerToken?.takeIf { token -> token.isNotBlank() }?.let { token -> accessTokens.verify(token) }
            ?: return Visitor(null, null, cartId)
        val session = sessions.findById(signedIn.sessionId)
        if (session == null || !session.isOpenAt(clock.moment()) || session.customerId != signedIn.customerId) {
            return Visitor(null, null, cartId)
        }
        return Visitor(signedIn.customerId, signedIn.sessionId, cartId)
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/RegisterCustomer.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.application.ports.RateLimiter
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordPolicy
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class RegistrationRequest(val email: String, val name: String, val password: String, val device: String)

class RegisterCustomer(
    private val customers: CustomerRepository,
    private val passwords: PasswordHasher,
    private val identifiers: IdentifierFactory,
    private val clock: Clock,
    private val signIn: SignIn,
    private val visitorCart: VisitorCart,
    private val wishlistOwner: WishlistOwner,
    private val rateLimiter: RateLimiter,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, request: RegistrationRequest): Result<Authentication> {
        if (!rateLimiter.allows("register:${request.email.trim().lowercase()}")) {
            return refusal(UserErrorCode.RATE_LIMITED, "Too many attempts. Please wait and try again.")
        }
        val email = when (val parsed = EmailAddress.of(request.email)) {
            is Result.Refused -> return parsed
            is Result.Success -> parsed.value
        }
        val policy = PasswordPolicy.check(request.password)
        if (policy is Result.Refused) {
            return policy
        }
        return unitOfWork.execute {
            if (customers.findByEmail(email) != null) {
                refusal(UserErrorCode.EMAIL_TAKEN, "That email address is already registered.", "input.email")
            } else {
                val customer = customers.save(
                    Customer(
                        id = identifiers.next(),
                        email = email,
                        name = request.name.trim(),
                        passwordHash = passwords.hash(request.password),
                        createdAt = clock.moment(),
                    ),
                )
                wishlistOwner.moveToCustomer(visitor, customer.id)
                visitorCart.moveToCustomer(visitor, customer.id)
                Result.Success(signIn.start(customer, request.device))
            }
        }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/LogInCustomer.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.application.ports.RateLimiter
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class LoginRequest(val email: String, val password: String, val device: String)

class LogInCustomer(
    private val customers: CustomerRepository,
    private val passwords: PasswordHasher,
    private val signIn: SignIn,
    private val visitorCart: VisitorCart,
    private val wishlistOwner: WishlistOwner,
    private val rateLimiter: RateLimiter,
    private val unitOfWork: UnitOfWork,
) {

    private val hashThatMatchesNobody: PasswordHash by lazy {
        passwords.hash("a password that belongs to no customer at all")
    }

    fun execute(visitor: Visitor, request: LoginRequest): Result<Authentication> {
        val address = request.email.trim().lowercase()
        if (!rateLimiter.allows("login:$address")) {
            return refusal(UserErrorCode.RATE_LIMITED, "Too many attempts. Please wait and try again.")
        }
        return unitOfWork.execute {
            val customer = EmailAddress.of(address).let { parsed ->
                if (parsed is Result.Success) customers.findByEmail(parsed.value) else null
            }
            val hash = customer?.passwordHash ?: hashThatMatchesNobody
            val matches = passwords.matches(request.password, hash)
            if (customer == null || !matches) {
                refusal(
                    UserErrorCode.CREDENTIALS_INVALID,
                    "That email address and password do not match a customer.",
                )
            } else {
                wishlistOwner.moveToCustomer(visitor, customer.id)
                visitorCart.moveToCustomer(visitor, customer.id)
                Result.Success(signIn.start(customer, request.device))
            }
        }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/RefreshSession.kt`

```kotlin
package nl.zappymart.application.accounts

import java.time.Instant
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

class RefreshSession(
    private val sessions: SessionRepository,
    private val customers: CustomerRepository,
    private val accessTokens: AccessTokenIssuer,
    private val refreshTokens: RefreshTokenIssuer,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(presentedToken: String?): Result<Authentication> {
        if (presentedToken.isNullOrBlank()) {
            return sessionInvalid()
        }
        return unitOfWork.execute {
            val moment = clock.moment()
            val stored = sessions.findRefreshTokenByHash(refreshTokens.hashOf(presentedToken))
            when {
                stored == null -> sessionInvalid()

                stored.wasAlreadyUsed() -> {
                    sessions.revokeSessionAndItsTokens(stored.sessionId, moment)
                    sessionInvalid()
                }

                !stored.isUsableAt(moment) -> sessionInvalid()

                else -> rotate(stored, moment)
            }
        }
    }

    private fun rotate(stored: RefreshToken, moment: Instant): Result<Authentication> {
        val session = sessions.findById(stored.sessionId)
        if (session == null || !session.isOpenAt(moment)) {
            return sessionInvalid()
        }
        val customer = customers.findById(session.customerId) ?: return sessionInvalid()
        sessions.saveRefreshToken(stored.rotatedAt(moment))
        val issued = refreshTokens.issue()
        sessions.saveRefreshToken(RefreshToken(issued.tokenHash, session.id, moment, session.expiresAt, null))
        sessions.save(session.usedAt(moment))
        return Result.Success(
            Authentication(
                customer,
                session.id,
                accessTokens.issue(customer.id, session.id, moment),
                issued.value,
            ),
        )
    }

    private fun sessionInvalid() = refusal(
        UserErrorCode.SESSION_INVALID,
        "That session cannot be refreshed. Please log in again.",
    )
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/LogOut.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.UnitOfWork

class LogOut(
    private val sessions: SessionRepository,
    private val refreshTokens: RefreshTokenIssuer,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, presentedToken: String?): Boolean = unitOfWork.execute {
        val moment = clock.moment()
        val sessionId = visitor.sessionId
            ?: presentedToken?.let { token -> sessions.findRefreshTokenByHash(refreshTokens.hashOf(token))?.sessionId }
        if (sessionId != null) {
            sessions.revokeSessionAndItsTokens(sessionId, moment)
        }
        true
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/RevokeSession.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

class RevokeSession(
    private val sessions: SessionRepository,
    private val clock: Clock,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, sessionId: String): Result<List<Session>> {
        val customerId = visitor.customerId
            ?: return refusal(UserErrorCode.NOT_AUTHENTICATED, "Revoking a session needs a signed in customer.")
        return unitOfWork.execute {
            val moment = clock.moment()
            val session = sessions.findById(sessionId)
            if (session == null || session.customerId != customerId) {
                refusal(UserErrorCode.SESSION_NOT_FOUND, "That session does not belong to you.", "sessionId")
            } else {
                sessions.revokeSessionAndItsTokens(sessionId, moment)
                Result.Success(sessions.findOpenForCustomer(customerId, moment))
            }
        }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/FindSignedInCustomer.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.domain.accounts.Customer

class FindSignedInCustomer(private val customers: CustomerRepository) {

    fun execute(visitor: Visitor): Customer? = visitor.customerId?.let { id -> customers.findById(id) }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/ListSessions.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.domain.accounts.Session

class ListSessions(
    private val sessions: SessionRepository,
    private val clock: Clock,
) {

    fun execute(customerId: String): List<Session> = sessions.findOpenForCustomer(customerId, clock.moment())
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/WishlistOwner.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.WishlistRepository

class WishlistOwner(
    private val wishlists: WishlistRepository,
    private val visitorCart: VisitorCart,
    private val carts: CartRepository,
) {

    fun forReading(visitor: Visitor): String? = visitor.customerId ?: visitor.cartId

    fun forWriting(visitor: Visitor): String = visitor.customerId ?: carts.save(visitorCart.of(visitor)).id

    fun moveToCustomer(visitor: Visitor, customerId: String) {
        val anonymousOwnerId = visitor.cartId ?: return
        val anonymous = wishlists.findByOwnerId(anonymousOwnerId)
        if (anonymous.productIds.isEmpty()) {
            return
        }
        wishlists.save(wishlists.findByOwnerId(customerId).mergedWith(anonymous))
        wishlists.delete(anonymousOwnerId)
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/WishlistChange.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.UserError

data class WishlistChange(val products: List<Product>, val anonymousCartId: String?, val errors: List<UserError>)
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/ViewWishlist.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.domain.catalogue.Product

class ViewWishlist(
    private val wishlists: WishlistRepository,
    private val products: ProductRepository,
    private val wishlistOwner: WishlistOwner,
) {

    fun execute(visitor: Visitor): List<Product> {
        val ownerId = wishlistOwner.forReading(visitor) ?: return emptyList()
        return inWishlistOrder(wishlists.findByOwnerId(ownerId).productIds)
    }

    fun inWishlistOrder(productIds: List<String>): List<Product> {
        if (productIds.isEmpty()) {
            return emptyList()
        }
        val found = products.findAllByIds(productIds).associateBy { product -> product.id }
        return productIds.mapNotNull { productId -> found[productId] }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/AddToWishlist.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.domain.shared.UserError
import nl.zappymart.domain.shared.UserErrorCode

class AddToWishlist(
    private val wishlists: WishlistRepository,
    private val products: ProductRepository,
    private val viewWishlist: ViewWishlist,
    private val wishlistOwner: WishlistOwner,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, productId: String): WishlistChange = unitOfWork.execute {
        val ownerId = wishlistOwner.forWriting(visitor)
        val anonymousCartId = if (visitor.isSignedIn) null else ownerId
        if (products.findById(productId) == null) {
            WishlistChange(
                viewWishlist.inWishlistOrder(wishlists.findByOwnerId(ownerId).productIds),
                anonymousCartId,
                listOf(UserError(UserErrorCode.PRODUCT_NOT_FOUND, "There is no product $productId.", "productId")),
            )
        } else {
            val saved = wishlists.findByOwnerId(ownerId).with(productId)
            wishlists.save(saved)
            WishlistChange(viewWishlist.inWishlistOrder(saved.productIds), anonymousCartId, emptyList())
        }
    }
}
```

`zappy-application/src/main/kotlin/nl/zappymart/application/accounts/RemoveFromWishlist.kt`

```kotlin
package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.application.ports.WishlistRepository

class RemoveFromWishlist(
    private val wishlists: WishlistRepository,
    private val viewWishlist: ViewWishlist,
    private val wishlistOwner: WishlistOwner,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, productId: String): WishlistChange = unitOfWork.execute {
        val ownerId = wishlistOwner.forWriting(visitor)
        val saved = wishlists.findByOwnerId(ownerId).without(productId)
        wishlists.save(saved)
        WishlistChange(
            viewWishlist.inWishlistOrder(saved.productIds),
            if (visitor.isSignedIn) null else ownerId,
            emptyList(),
        )
    }
}
```

`PlaceOrder` is the one to read twice. It reserves the stock, saves the
order and empties the cart inside one `unitOfWork.execute`, because
`docs/domain.md` says reserving is all or nothing, and it publishes
`OrderPlaced` for the two things that may happen afterwards: counting the
promotion code and sending the confirmation. Those two run after the
transaction commits, so a mail that fails cannot undo an order.

`ListProducts` is the only suspending use case, and section 11 explains
why it is the only one.

### 5.4 zappy-adapters

GraphQL on the way in, JPA and mail on the way out, and the security
pieces in between.

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/SecurityProperties.kt`

```kotlin
package nl.zappymart.adapters.graphql

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "zappy.security")
data class SecurityProperties(
    val allowedOrigins: List<String> = listOf(
        "http://localhost:5173",
        "http://localhost:3001",
        "http://localhost:4200",
    ),
    val cookiesSecure: Boolean = true,
    val graphQlPath: String = "/graphql",
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/Cookies.kt`

```kotlin
package nl.zappymart.adapters.graphql

import java.time.Duration
import nl.zappymart.domain.accounts.Session
import org.springframework.http.ResponseCookie

class Cookies(private val properties: SecurityProperties) {

    fun refreshToken(value: String): String = ResponseCookie.from(REFRESH_TOKEN_NAME, value)
        .httpOnly(true)
        .secure(properties.cookiesSecure)
        .sameSite("Lax")
        .path(properties.graphQlPath)
        .maxAge(Duration.ofDays(Session.LIFETIME_IN_DAYS))
        .build()
        .toString()

    fun clearedRefreshToken(): String = ResponseCookie.from(REFRESH_TOKEN_NAME, "")
        .httpOnly(true)
        .secure(properties.cookiesSecure)
        .sameSite("Lax")
        .path(properties.graphQlPath)
        .maxAge(Duration.ZERO)
        .build()
        .toString()

    fun cart(cartId: String): String = ResponseCookie.from(CART_NAME, cartId)
        .httpOnly(true)
        .secure(properties.cookiesSecure)
        .sameSite("Lax")
        .path("/")
        .maxAge(Duration.ofDays(CART_LIFETIME_IN_DAYS))
        .build()
        .toString()

    companion object {
        const val REFRESH_TOKEN_NAME = "zappy_refresh"
        const val CART_NAME = "zappy_cart"
        const val CART_LIFETIME_IN_DAYS = 30L
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/RequestContext.kt`

```kotlin
package nl.zappymart.adapters.graphql

import nl.zappymart.application.Visitor

class RequestContext(
    startingVisitor: Visitor,
    val presentedRefreshToken: String?,
    val device: String,
    private val cookies: Cookies,
) {

    var visitor: Visitor = startingVisitor
        private set

    private val cookiesToSet = mutableListOf<String>()

    fun signedIn(customerId: String, sessionId: String, refreshToken: String) {
        visitor = visitor.copy(customerId = customerId, sessionId = sessionId)
        cookiesToSet.add(cookies.refreshToken(refreshToken))
    }

    fun signedOut() {
        visitor = visitor.copy(customerId = null, sessionId = null)
        cookiesToSet.add(cookies.clearedRefreshToken())
    }

    fun remembersCart(cartId: String) {
        if (visitor.cartId == cartId) {
            return
        }
        visitor = visitor.copy(cartId = cartId)
        cookiesToSet.add(cookies.cart(cartId))
    }

    fun cookiesToSet(): List<String> = cookiesToSet.toList()

    companion object {
        const val KEY = "requestContext"
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/RequestContextInterceptor.kt`

```kotlin
package nl.zappymart.adapters.graphql

import graphql.ExecutionResultImpl
import graphql.GraphqlErrorBuilder
import graphql.language.OperationDefinition
import graphql.parser.Parser
import nl.zappymart.application.accounts.IdentifyVisitor
import org.springframework.graphql.execution.ErrorType
import org.springframework.graphql.server.WebGraphQlInterceptor
import org.springframework.graphql.server.WebGraphQlRequest
import org.springframework.graphql.server.WebGraphQlResponse
import org.springframework.graphql.support.DefaultExecutionGraphQlResponse
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component
import reactor.core.publisher.Mono

@Component
class RequestContextInterceptor(
    private val identifyVisitor: IdentifyVisitor,
    private val properties: SecurityProperties,
) : WebGraphQlInterceptor {

    private val cookies = Cookies(properties)

    override fun intercept(request: WebGraphQlRequest, chain: WebGraphQlInterceptor.Chain): Mono<WebGraphQlResponse> {
        if (changesSomething(request) && !comesFromAnAllowedOrigin(request)) {
            return Mono.just(refuseTheOrigin(request))
        }
        val context = RequestContext(
            startingVisitor = identifyVisitor.execute(bearerTokenOf(request), cookieValueOf(request, Cookies.CART_NAME)),
            presentedRefreshToken = cookieValueOf(request, Cookies.REFRESH_TOKEN_NAME),
            device = request.headers.getFirst(HttpHeaders.USER_AGENT) ?: "An unnamed device",
            cookies = cookies,
        )
        request.configureExecutionInput { _, builder ->
            builder.graphQLContext { holder -> holder.put(RequestContext.KEY, context) }.build()
        }
        return chain.next(request).doOnNext { response ->
            context.cookiesToSet().forEach { cookie -> response.responseHeaders.add(HttpHeaders.SET_COOKIE, cookie) }
        }
    }

    private fun changesSomething(request: WebGraphQlRequest): Boolean = try {
        Parser.parse(request.document)
            .getDefinitionsOfType(OperationDefinition::class.java)
            .filter { definition -> request.operationName == null || definition.name == request.operationName }
            .any { definition -> definition.operation == OperationDefinition.Operation.MUTATION }
    } catch (malformed: RuntimeException) {
        false
    }

    private fun comesFromAnAllowedOrigin(request: WebGraphQlRequest): Boolean {
        val origin = request.headers.getFirst(HttpHeaders.ORIGIN) ?: return false
        return properties.allowedOrigins.contains(origin)
    }

    private fun refuseTheOrigin(request: WebGraphQlRequest): WebGraphQlResponse {
        val error = GraphqlErrorBuilder.newError()
            .message("A mutation needs an allowed Origin header. See docs/security.md.")
            .errorType(ErrorType.FORBIDDEN)
            .build()
        val result = ExecutionResultImpl.newExecutionResult().addError(error).build()
        return WebGraphQlResponse(DefaultExecutionGraphQlResponse(request.toExecutionInput(), result))
    }

    private fun bearerTokenOf(request: WebGraphQlRequest): String? =
        request.headers.getFirst(HttpHeaders.AUTHORIZATION)
            ?.takeIf { header -> header.startsWith(BEARER_PREFIX, ignoreCase = true) }
            ?.substring(BEARER_PREFIX.length)
            ?.trim()

    private fun cookieValueOf(request: WebGraphQlRequest, name: String): String? =
        request.cookies.getFirst(name)?.value?.takeIf { value -> value.isNotBlank() }

    private companion object {
        const val BEARER_PREFIX = "Bearer "
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/DateTimeScalar.kt`

```kotlin
package nl.zappymart.adapters.graphql

import graphql.GraphQLContext
import graphql.execution.CoercedVariables
import graphql.language.StringValue
import graphql.language.Value
import graphql.schema.Coercing
import graphql.schema.CoercingParseLiteralException
import graphql.schema.CoercingParseValueException
import graphql.schema.CoercingSerializeException
import graphql.schema.GraphQLScalarType
import java.time.Instant
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit
import java.util.Locale

object DateTimeScalar {

    val TYPE: GraphQLScalarType = GraphQLScalarType.newScalar()
        .name("DateTime")
        .description("A moment in time as an ISO 8601 string in UTC with second precision.")
        .coercing(InstantCoercing())
        .build()

    private class InstantCoercing : Coercing<Instant, String> {

        override fun serialize(dataFetcherResult: Any, graphQLContext: GraphQLContext, locale: Locale): String =
            when (dataFetcherResult) {
                is Instant -> dataFetcherResult.truncatedTo(ChronoUnit.SECONDS).toString()
                is String -> dataFetcherResult
                else -> throw CoercingSerializeException("A DateTime is an Instant, not ${dataFetcherResult::class}")
            }

        override fun parseValue(input: Any, graphQLContext: GraphQLContext, locale: Locale): Instant = try {
            Instant.parse(input.toString())
        } catch (malformed: DateTimeParseException) {
            throw CoercingParseValueException("A DateTime is an ISO 8601 moment in UTC", malformed)
        }

        override fun parseLiteral(
            input: Value<*>,
            variables: CoercedVariables,
            graphQLContext: GraphQLContext,
            locale: Locale,
        ): Instant {
            if (input !is StringValue) {
                throw CoercingParseLiteralException("A DateTime literal is a string")
            }
            return try {
                Instant.parse(input.value)
            } catch (malformed: DateTimeParseException) {
                throw CoercingParseLiteralException("A DateTime is an ISO 8601 moment in UTC", malformed)
            }
        }

        override fun valueToLiteral(input: Any, graphQLContext: GraphQLContext, locale: Locale): Value<*> =
            StringValue.of(serialize(input, graphQLContext, locale))
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/Cursors.kt`

```kotlin
package nl.zappymart.adapters.graphql

import java.util.Base64

object Cursors {

    fun of(id: String): String = Base64.getUrlEncoder().withoutPadding().encodeToString(id.toByteArray())

    fun idOf(cursor: String?): String? {
        if (cursor.isNullOrBlank()) {
            return null
        }
        return try {
            String(Base64.getUrlDecoder().decode(cursor))
        } catch (malformed: IllegalArgumentException) {
            null
        }
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/Payloads.kt`

```kotlin
package nl.zappymart.adapters.graphql

import java.time.Instant
import nl.zappymart.application.Page
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.shared.UserError

data class PageInfo(val hasNextPage: Boolean, val endCursor: String?)

data class ProductEdge(val cursor: String, val node: Product)

data class ProductConnection(val edges: List<ProductEdge>, val pageInfo: PageInfo, val totalCount: Int) {

    companion object {
        fun of(page: Page<Product>): ProductConnection {
            val edges = page.items.map { product -> ProductEdge(Cursors.of(product.id), product) }
            return ProductConnection(edges, PageInfo(page.hasNextPage, edges.lastOrNull()?.cursor), page.totalCount)
        }
    }
}

data class OrderEdge(val cursor: String, val node: Order)

data class OrderConnection(val edges: List<OrderEdge>, val pageInfo: PageInfo, val totalCount: Int) {

    companion object {
        fun of(page: Page<Order>): OrderConnection {
            val edges = page.items.map { order -> OrderEdge(Cursors.of(order.id), order) }
            return OrderConnection(edges, PageInfo(page.hasNextPage, edges.lastOrNull()?.cursor), page.totalCount)
        }
    }
}

data class ProductFilterInput(
    val categorySlug: String? = null,
    val nameContains: String? = null,
    val inStockOnly: Boolean? = null,
)

data class RegisterInput(val email: String, val name: String, val password: String)

data class LoginInput(val email: String, val password: String, val device: String? = null)

data class AuthenticationPayload(
    val customer: Customer?,
    val accessToken: String?,
    val accessTokenExpiresAt: Instant?,
    val errors: List<UserError>,
)

data class CartPayload(val cart: Cart?, val availableStock: Int?, val errors: List<UserError>)

data class OrderPayload(val order: Order?, val errors: List<UserError>)

data class LogoutPayload(val success: Boolean, val errors: List<UserError>)

data class RevokeSessionPayload(val sessions: List<Session>, val errors: List<UserError>)

data class WishlistPayload(val products: List<Product>, val errors: List<UserError>)

data class ResetSeedPayload(val success: Boolean, val loadedProducts: Int, val errors: List<UserError>)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/CatalogueController.kt`

```kotlin
package nl.zappymart.adapters.graphql

import nl.zappymart.application.catalogue.FindProduct
import nl.zappymart.application.catalogue.ListCategories
import nl.zappymart.application.catalogue.ListProducts
import nl.zappymart.domain.catalogue.Category
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.stereotype.Controller

@Controller
class CatalogueController(
    private val listProducts: ListProducts,
    private val findProduct: FindProduct,
    private val listCategories: ListCategories,
) {

    @QueryMapping
    suspend fun products(
        @Argument filter: ProductFilterInput?,
        @Argument first: Int?,
        @Argument after: String?,
    ): ProductConnection {
        val specification = ProductSpecification.of(filter?.categorySlug, filter?.nameContains, filter?.inStockOnly)
        return ProductConnection.of(
            listProducts.execute(specification, first ?: DEFAULT_PRODUCT_PAGE_SIZE, Cursors.idOf(after)),
        )
    }

    @QueryMapping
    fun product(@Argument slug: String): Product? = findProduct.execute(slug)

    @QueryMapping
    fun categories(): List<Category> = listCategories.execute()

    private companion object {
        const val DEFAULT_PRODUCT_PAGE_SIZE = 24
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/CartController.kt`

```kotlin
package nl.zappymart.adapters.graphql

import nl.zappymart.application.cart.AddToCart
import nl.zappymart.application.cart.ApplyPromotionCode
import nl.zappymart.application.cart.CartChange
import nl.zappymart.application.cart.ChangeCartLineQuantity
import nl.zappymart.application.cart.RemoveCartLine
import nl.zappymart.application.cart.RemovePromotionCode
import nl.zappymart.application.cart.ViewCart
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.promotions.AppliedPromotion
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.ContextValue
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.graphql.data.method.annotation.SchemaMapping
import org.springframework.stereotype.Controller

@Controller
class CartController(
    private val viewCart: ViewCart,
    private val addToCart: AddToCart,
    private val changeCartLineQuantity: ChangeCartLineQuantity,
    private val removeCartLine: RemoveCartLine,
    private val applyPromotionCode: ApplyPromotionCode,
    private val removePromotionCode: RemovePromotionCode,
) {

    @QueryMapping
    fun cart(@ContextValue requestContext: RequestContext): Cart = viewCart.execute(requestContext.visitor)

    @MutationMapping
    fun addToCart(
        @ContextValue requestContext: RequestContext,
        @Argument productId: String,
        @Argument quantity: Int?,
    ): CartPayload = answer(requestContext, addToCart.execute(requestContext.visitor, productId, quantity ?: 1))

    @MutationMapping
    fun changeCartLineQuantity(
        @ContextValue requestContext: RequestContext,
        @Argument lineId: String,
        @Argument quantity: Int,
    ): CartPayload = answer(requestContext, changeCartLineQuantity.execute(requestContext.visitor, lineId, quantity))

    @MutationMapping
    fun removeCartLine(
        @ContextValue requestContext: RequestContext,
        @Argument lineId: String,
    ): CartPayload = answer(requestContext, removeCartLine.execute(requestContext.visitor, lineId))

    @MutationMapping
    fun applyPromotionCode(
        @ContextValue requestContext: RequestContext,
        @Argument code: String,
    ): CartPayload = answer(requestContext, applyPromotionCode.execute(requestContext.visitor, code))

    @MutationMapping
    fun removePromotionCode(@ContextValue requestContext: RequestContext): CartPayload =
        answer(requestContext, removePromotionCode.execute(requestContext.visitor))

    @SchemaMapping(typeName = "AppliedPromotion", field = "code")
    fun appliedPromotionCode(promotion: AppliedPromotion): String = promotion.code.value

    private fun answer(requestContext: RequestContext, change: CartChange): CartPayload {
        if (change.cart.customerId == null) {
            requestContext.remembersCart(change.cart.id)
        }
        return CartPayload(change.cart, change.availableStock, change.errors)
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/AccountController.kt`

```kotlin
package nl.zappymart.adapters.graphql

import nl.zappymart.application.accounts.Authentication
import nl.zappymart.application.accounts.FindSignedInCustomer
import nl.zappymart.application.accounts.ListSessions
import nl.zappymart.application.accounts.LogInCustomer
import nl.zappymart.application.accounts.LogOut
import nl.zappymart.application.accounts.LoginRequest
import nl.zappymart.application.accounts.RefreshSession
import nl.zappymart.application.accounts.RegisterCustomer
import nl.zappymart.application.accounts.RegistrationRequest
import nl.zappymart.application.accounts.RevokeSession
import nl.zappymart.application.accounts.ViewWishlist
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.Result
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.ContextValue
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.graphql.data.method.annotation.SchemaMapping
import org.springframework.stereotype.Controller

@Controller
class AccountController(
    private val registerCustomer: RegisterCustomer,
    private val logInCustomer: LogInCustomer,
    private val refreshSession: RefreshSession,
    private val logOut: LogOut,
    private val revokeSession: RevokeSession,
    private val findSignedInCustomer: FindSignedInCustomer,
    private val listSessions: ListSessions,
    private val viewWishlist: ViewWishlist,
) {

    @QueryMapping
    fun me(@ContextValue requestContext: RequestContext): Customer? =
        findSignedInCustomer.execute(requestContext.visitor)

    @MutationMapping
    fun register(
        @ContextValue requestContext: RequestContext,
        @Argument input: RegisterInput,
    ): AuthenticationPayload = answer(
        requestContext,
        registerCustomer.execute(
            requestContext.visitor,
            RegistrationRequest(input.email, input.name, input.password, requestContext.device),
        ),
    )

    @MutationMapping
    fun login(
        @ContextValue requestContext: RequestContext,
        @Argument input: LoginInput,
    ): AuthenticationPayload = answer(
        requestContext,
        logInCustomer.execute(
            requestContext.visitor,
            LoginRequest(input.email, input.password, input.device ?: requestContext.device),
        ),
    )

    @MutationMapping
    fun refreshSession(@ContextValue requestContext: RequestContext): AuthenticationPayload =
        answer(requestContext, refreshSession.execute(requestContext.presentedRefreshToken))

    @MutationMapping
    fun logout(@ContextValue requestContext: RequestContext): LogoutPayload {
        val success = logOut.execute(requestContext.visitor, requestContext.presentedRefreshToken)
        requestContext.signedOut()
        return LogoutPayload(success, emptyList())
    }

    @MutationMapping
    fun revokeSession(
        @ContextValue requestContext: RequestContext,
        @Argument sessionId: String,
    ): RevokeSessionPayload = when (val outcome = revokeSession.execute(requestContext.visitor, sessionId)) {
        is Result.Success -> RevokeSessionPayload(outcome.value, emptyList())
        is Result.Refused -> RevokeSessionPayload(emptyList(), outcome.errors)
    }

    @SchemaMapping(typeName = "Customer", field = "email")
    fun customerEmail(customer: Customer): String = customer.email.value

    @SchemaMapping(typeName = "Customer", field = "sessions")
    fun customerSessions(customer: Customer): List<Session> = listSessions.execute(customer.id)

    @SchemaMapping(typeName = "Customer", field = "wishlist")
    fun customerWishlist(
        customer: Customer,
        @ContextValue requestContext: RequestContext,
    ): List<Product> = viewWishlist.execute(requestContext.visitor)

    @SchemaMapping(typeName = "Session", field = "current")
    fun sessionIsCurrent(session: Session, @ContextValue requestContext: RequestContext): Boolean =
        session.id == requestContext.visitor.sessionId

    private fun answer(requestContext: RequestContext, outcome: Result<Authentication>): AuthenticationPayload =
        when (outcome) {
            is Result.Success -> {
                val authentication = outcome.value
                requestContext.signedIn(
                    authentication.customer.id,
                    authentication.sessionId,
                    authentication.refreshToken,
                )
                AuthenticationPayload(
                    authentication.customer,
                    authentication.accessToken.value,
                    authentication.accessToken.expiresAt,
                    emptyList(),
                )
            }

            is Result.Refused -> AuthenticationPayload(null, null, null, outcome.errors)
        }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/WishlistController.kt`

```kotlin
package nl.zappymart.adapters.graphql

import nl.zappymart.application.accounts.AddToWishlist
import nl.zappymart.application.accounts.RemoveFromWishlist
import nl.zappymart.application.accounts.ViewWishlist
import nl.zappymart.application.accounts.WishlistChange
import nl.zappymart.domain.catalogue.Product
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.ContextValue
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.stereotype.Controller

@Controller
class WishlistController(
    private val viewWishlist: ViewWishlist,
    private val addToWishlist: AddToWishlist,
    private val removeFromWishlist: RemoveFromWishlist,
) {

    @QueryMapping
    fun wishlist(@ContextValue requestContext: RequestContext): List<Product> =
        viewWishlist.execute(requestContext.visitor)

    @MutationMapping
    fun addToWishlist(
        @ContextValue requestContext: RequestContext,
        @Argument productId: String,
    ): WishlistPayload = answer(requestContext, addToWishlist.execute(requestContext.visitor, productId))

    @MutationMapping
    fun removeFromWishlist(
        @ContextValue requestContext: RequestContext,
        @Argument productId: String,
    ): WishlistPayload = answer(requestContext, removeFromWishlist.execute(requestContext.visitor, productId))

    private fun answer(requestContext: RequestContext, change: WishlistChange): WishlistPayload {
        change.anonymousCartId?.let { cartId -> requestContext.remembersCart(cartId) }
        return WishlistPayload(change.products, change.errors)
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/graphql/OrderController.kt`

```kotlin
package nl.zappymart.adapters.graphql

import nl.zappymart.application.ordering.FindOrder
import nl.zappymart.application.ordering.ListOrders
import nl.zappymart.application.ordering.PlaceOrder
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.shared.Result
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.ContextValue
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.graphql.data.method.annotation.SchemaMapping
import org.springframework.stereotype.Controller

@Controller
class OrderController(
    private val listOrders: ListOrders,
    private val findOrder: FindOrder,
    private val placeOrder: PlaceOrder,
) {

    @QueryMapping
    fun orders(
        @ContextValue requestContext: RequestContext,
        @Argument first: Int?,
        @Argument after: String?,
    ): OrderConnection = OrderConnection.of(
        listOrders.execute(requestContext.visitor, first ?: DEFAULT_ORDER_PAGE_SIZE, Cursors.idOf(after)),
    )

    @QueryMapping
    fun order(@ContextValue requestContext: RequestContext, @Argument id: String): Order? =
        findOrder.execute(requestContext.visitor, id)

    @MutationMapping
    fun placeOrder(
        @ContextValue requestContext: RequestContext,
        @Argument idempotencyKey: String?,
    ): OrderPayload = when (val outcome = placeOrder.execute(requestContext.visitor)) {
        is Result.Success -> OrderPayload(outcome.value, emptyList())
        is Result.Refused -> OrderPayload(null, outcome.errors)
    }

    @SchemaMapping(typeName = "Order", field = "promotionCode")
    fun orderPromotionCode(order: Order): String? = order.promotionCode?.value

    private companion object {
        const val DEFAULT_ORDER_PAGE_SIZE = 10
    }
}
```

`RequestContextInterceptor` is the transport. It parses the document to
see whether it carries a mutation, refuses a mutation that comes without
an allowed `Origin` before any resolver runs, reads the bearer token and
the two cookies, puts one `RequestContext` into the GraphQL context, and
writes the `Set-Cookie` headers the resolvers asked for once the answer
is ready. Every controller takes that context as `@ContextValue
requestContext` and never touches a header itself.

Three field resolvers exist only to unwrap a value class at the boundary:
`Customer.email`, `AppliedPromotion.code` and `Order.promotionCode`. A
Kotlin `value class` has a mangled getter on the JVM, which a GraphQL
property fetcher cannot find, so the adapter unwraps them by hand. That
is the price of keeping `EmailAddress` and `PromotionCode` real types
inside, and it is three lines.

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/CategoryEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "categories")
class CategoryEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "slug", nullable = false, unique = true, length = 128)
    var slug: String = "",

    @Column(name = "position", nullable = false)
    var position: Int = 0,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/ProductEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "products")
class ProductEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "slug", nullable = false, unique = true, length = 191)
    var slug: String = "",

    @Column(name = "description", nullable = false, length = 2000)
    var description: String = "",

    @Column(name = "price_amount", nullable = false)
    var priceAmount: Int = 0,

    @Column(name = "currency", nullable = false, length = 3)
    var currency: String = "EUR",

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    var category: CategoryEntity = CategoryEntity(),

    @Column(name = "stock", nullable = false)
    var stock: Int = 0,

    @Column(name = "image_url")
    var imageUrl: String? = null,

    @Column(name = "catalogue_position", nullable = false)
    var cataloguePosition: Int = 0,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/CartEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "carts")
class CartEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "customer_id", length = 64)
    var customerId: String? = null,

    @Column(name = "promotion_code", length = 64)
    var promotionCode: String? = null,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.EPOCH,

    @OneToMany(
        mappedBy = "cart",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.EAGER,
    )
    @OrderBy("position ASC")
    var lines: MutableList<CartLineEntity> = mutableListOf(),
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/CartLineEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "cart_lines")
class CartLineEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cart_id", nullable = false)
    var cart: CartEntity? = null,

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    var product: ProductEntity = ProductEntity(),

    @Column(name = "quantity", nullable = false)
    var quantity: Int = 1,

    @Column(name = "position", nullable = false)
    var position: Int = 0,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/PromotionEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "promotions")
class PromotionEntity(

    @Id
    @Column(name = "code", length = 64)
    var code: String = "",

    @Column(name = "kind", nullable = false, length = 32)
    var kind: String = "",

    @Column(name = "percentage")
    var percentage: Int? = null,

    @Column(name = "amount")
    var amount: Int? = null,

    @Column(name = "minimum_subtotal")
    var minimumSubtotal: Int? = null,

    @Column(name = "currency", nullable = false, length = 3)
    var currency: String = "EUR",

    @Column(name = "valid_from", nullable = false)
    var validFrom: Instant = Instant.EPOCH,

    @Column(name = "valid_until", nullable = false)
    var validUntil: Instant = Instant.EPOCH,

    @Column(name = "usage_limit")
    var usageLimit: Int? = null,

    @Column(name = "times_used", nullable = false)
    var timesUsed: Int = 0,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/OrderEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "orders")
class OrderEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "sequence_number", nullable = false, unique = true)
    var sequenceNumber: Long = 0,

    @Column(name = "number", nullable = false, unique = true, length = 64)
    var number: String = "",

    @Column(name = "customer_id", nullable = false, length = 64)
    var customerId: String = "",

    @Column(name = "status", nullable = false, length = 32)
    var status: String = "",

    @Column(name = "promotion_code", length = 64)
    var promotionCode: String? = null,

    @Column(name = "subtotal", nullable = false)
    var subtotal: Int = 0,

    @Column(name = "discount", nullable = false)
    var discount: Int = 0,

    @Column(name = "shipping", nullable = false)
    var shipping: Int = 0,

    @Column(name = "total", nullable = false)
    var total: Int = 0,

    @Column(name = "currency", nullable = false, length = 3)
    var currency: String = "EUR",

    @Column(name = "placed_at", nullable = false)
    var placedAt: Instant = Instant.EPOCH,

    @OneToMany(
        mappedBy = "order",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.EAGER,
    )
    @OrderBy("position ASC")
    var lines: MutableList<OrderLineEntity> = mutableListOf(),
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/OrderLineEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "order_lines")
class OrderLineEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    @Column(name = "id")
    var id: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    var order: OrderEntity? = null,

    @Column(name = "product_id", nullable = false, length = 64)
    var productId: String = "",

    @Column(name = "product_name", nullable = false)
    var productName: String = "",

    @Column(name = "unit_price", nullable = false)
    var unitPrice: Int = 0,

    @Column(name = "currency", nullable = false, length = 3)
    var currency: String = "EUR",

    @Column(name = "quantity", nullable = false)
    var quantity: Int = 1,

    @Column(name = "position", nullable = false)
    var position: Int = 0,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/CustomerEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "customers")
class CustomerEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "email", nullable = false, unique = true, length = 191)
    var email: String = "",

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "password_hash", nullable = false, length = 512)
    var passwordHash: String = "",

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.EPOCH,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/SessionEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "sessions")
class SessionEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "customer_id", nullable = false, length = 64)
    var customerId: String = "",

    @Column(name = "device", nullable = false)
    var device: String = "",

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.EPOCH,

    @Column(name = "last_used_at", nullable = false)
    var lastUsedAt: Instant = Instant.EPOCH,

    @Column(name = "expires_at", nullable = false)
    var expiresAt: Instant = Instant.EPOCH,

    @Column(name = "revoked_at")
    var revokedAt: Instant? = null,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/RefreshTokenEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "refresh_tokens")
class RefreshTokenEntity(

    @Id
    @Column(name = "token_hash", length = 128)
    var tokenHash: String = "",

    @Column(name = "session_id", nullable = false, length = 64)
    var sessionId: String = "",

    @Column(name = "issued_at", nullable = false)
    var issuedAt: Instant = Instant.EPOCH,

    @Column(name = "expires_at", nullable = false)
    var expiresAt: Instant = Instant.EPOCH,

    @Column(name = "rotated_at")
    var rotatedAt: Instant? = null,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/entities/WishlistEntryEntity.kt`

```kotlin
package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "wishlist_entries")
class WishlistEntryEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    @Column(name = "id")
    var id: Long? = null,

    @Column(name = "owner_id", nullable = false, length = 64)
    var ownerId: String = "",

    @Column(name = "product_id", nullable = false, length = 64)
    var productId: String = "",

    @Column(name = "position", nullable = false)
    var position: Int = 0,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/SpringDataRepositories.kt`

```kotlin
package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.CartEntity
import nl.zappymart.adapters.persistence.entities.CategoryEntity
import nl.zappymart.adapters.persistence.entities.CustomerEntity
import nl.zappymart.adapters.persistence.entities.OrderEntity
import nl.zappymart.adapters.persistence.entities.ProductEntity
import nl.zappymart.adapters.persistence.entities.PromotionEntity
import nl.zappymart.adapters.persistence.entities.RefreshTokenEntity
import nl.zappymart.adapters.persistence.entities.SessionEntity
import nl.zappymart.adapters.persistence.entities.WishlistEntryEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface CategoryEntities : JpaRepository<CategoryEntity, String> {
    fun findAllByOrderByPositionAsc(): List<CategoryEntity>
    fun findBySlug(slug: String): CategoryEntity?
}

interface ProductEntities : JpaRepository<ProductEntity, String> {
    fun findBySlug(slug: String): ProductEntity?
    fun findByIdIn(ids: Collection<String>): List<ProductEntity>
}

interface CartEntities : JpaRepository<CartEntity, String> {
    fun findByCustomerId(customerId: String): CartEntity?
}

interface PromotionEntities : JpaRepository<PromotionEntity, String>

interface OrderEntities : JpaRepository<OrderEntity, String> {
    fun findByCustomerIdOrderBySequenceNumberDesc(customerId: String): List<OrderEntity>
    fun countByCustomerId(customerId: String): Long
    fun findByIdAndCustomerId(orderId: String, customerId: String): OrderEntity?

    @Query("select coalesce(max(placed.sequenceNumber), 0) from OrderEntity placed")
    fun highestSequenceNumber(): Long
}

interface CustomerEntities : JpaRepository<CustomerEntity, String> {
    fun findByEmail(email: String): CustomerEntity?
}

interface SessionEntities : JpaRepository<SessionEntity, String> {
    fun findByCustomerIdOrderByCreatedAtDesc(customerId: String): List<SessionEntity>
}

interface RefreshTokenEntities : JpaRepository<RefreshTokenEntity, String> {
    fun findBySessionId(sessionId: String): List<RefreshTokenEntity>
}

interface WishlistEntries : JpaRepository<WishlistEntryEntity, Long> {
    fun findByOwnerIdOrderByPositionAsc(ownerId: String): List<WishlistEntryEntity>
    fun deleteByOwnerId(ownerId: String)
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/EntityMapping.kt`

```kotlin
package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.CartEntity
import nl.zappymart.adapters.persistence.entities.CategoryEntity
import nl.zappymart.adapters.persistence.entities.CustomerEntity
import nl.zappymart.adapters.persistence.entities.OrderEntity
import nl.zappymart.adapters.persistence.entities.ProductEntity
import nl.zappymart.adapters.persistence.entities.PromotionEntity
import nl.zappymart.adapters.persistence.entities.RefreshTokenEntity
import nl.zappymart.adapters.persistence.entities.SessionEntity
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.cart.CartLine
import nl.zappymart.domain.catalogue.Category
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.ordering.OrderLine
import nl.zappymart.domain.ordering.OrderStatus
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.promotions.PromotionKind
import nl.zappymart.domain.promotions.PromotionRule
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode

fun CategoryEntity.asCategory() = Category(id, name, slug)

fun ProductEntity.asProduct() = Product(
    id = id,
    name = name,
    slug = slug,
    description = description,
    price = Money(priceAmount, currency),
    category = category.asCategory(),
    stock = stock,
    imageUrl = imageUrl,
)

fun CartEntity.asCart(): Cart = Cart(
    id = id,
    customerId = customerId,
    lines = lines.map { line -> CartLine(line.id, line.product.asProduct(), line.quantity) },
    promotionCode = promotionCode?.let { code -> PromotionCode.of(code) },
    promotion = null,
    updatedAt = updatedAt,
)

fun PromotionEntity.asPromotion(): Promotion = Promotion(
    code = PromotionCode.of(code),
    rule = when (PromotionKind.valueOf(kind)) {
        PromotionKind.PERCENTAGE -> PromotionRule.Percentage(requireNotNull(percentage))
        PromotionKind.FIXED_AMOUNT -> PromotionRule.FixedAmount(Money(requireNotNull(amount), currency))
        PromotionKind.FREE_SHIPPING -> PromotionRule.FreeShipping
    },
    minimumSubtotal = minimumSubtotal?.let { value -> Money(value, currency) },
    validFrom = validFrom,
    validUntil = validUntil,
    usageLimit = usageLimit,
    timesUsed = timesUsed,
)

fun OrderEntity.asOrder(): Order = Order(
    id = id,
    number = number,
    customerId = customerId,
    status = OrderStatus.valueOf(status),
    lines = lines.map { line ->
        OrderLine(line.productId, line.productName, Money(line.unitPrice, line.currency), line.quantity)
    },
    promotionCode = promotionCode?.let { code -> PromotionCode.of(code) },
    subtotal = Money(subtotal, currency),
    discount = Money(discount, currency),
    shipping = Money(shipping, currency),
    total = Money(total, currency),
    placedAt = placedAt,
)

fun CustomerEntity.asCustomer() = Customer(
    id = id,
    email = EmailAddress.ofStored(email),
    name = name,
    passwordHash = PasswordHash(passwordHash),
    createdAt = createdAt,
)

fun SessionEntity.asSession() = Session(
    id = id,
    customerId = customerId,
    device = device,
    createdAt = createdAt,
    lastUsedAt = lastUsedAt,
    expiresAt = expiresAt,
    revokedAt = revokedAt,
)

fun RefreshTokenEntity.asRefreshToken() = RefreshToken(tokenHash, sessionId, issuedAt, expiresAt, rotatedAt)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/JpaProductRepository.kt`

```kotlin
package nl.zappymart.adapters.persistence

import jakarta.persistence.EntityManager
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Predicate
import jakarta.persistence.criteria.Root
import nl.zappymart.adapters.persistence.entities.CategoryEntity
import nl.zappymart.adapters.persistence.entities.ProductEntity
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaProductRepository(
    private val products: ProductEntities,
    private val entityManager: EntityManager,
) : ProductRepository {

    override fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product> {
        if (size <= 0) {
            return emptyList()
        }
        val builder = entityManager.criteriaBuilder
        val query = builder.createQuery(ProductEntity::class.java)
        val root = query.from(ProductEntity::class.java)
        query.where(*whereParts(specification, afterProductId, root, builder).toTypedArray())
        query.orderBy(builder.asc(root.get<Int>("cataloguePosition")))
        return entityManager.createQuery(query)
            .setMaxResults(size)
            .resultList
            .map { entity -> entity.asProduct() }
    }

    override fun count(specification: ProductSpecification): Int {
        val builder = entityManager.criteriaBuilder
        val query = builder.createQuery(Long::class.javaObjectType)
        val root = query.from(ProductEntity::class.java)
        query.select(builder.count(root))
        query.where(*whereParts(specification, null, root, builder).toTypedArray())
        return entityManager.createQuery(query).singleResult.toInt()
    }

    override fun findById(productId: String): Product? =
        products.findById(productId).orElse(null)?.asProduct()

    override fun findBySlug(slug: String): Product? = products.findBySlug(slug)?.asProduct()

    override fun findAllByIds(productIds: List<String>): List<Product> =
        if (productIds.isEmpty()) emptyList() else products.findByIdIn(productIds).map { entity -> entity.asProduct() }

    @Transactional
    override fun reduceStock(quantityPerProductId: Map<String, Int>) {
        quantityPerProductId.forEach { (productId, quantity) ->
            val entity = products.findById(productId).orElseThrow {
                IllegalStateException("Product $productId disappeared while the order was being placed")
            }
            check(entity.stock >= quantity) {
                "Product $productId has ${entity.stock} in stock and $quantity were reserved"
            }
            entity.stock -= quantity
            products.save(entity)
        }
    }

    private fun whereParts(
        specification: ProductSpecification,
        afterProductId: String?,
        root: Root<ProductEntity>,
        builder: CriteriaBuilder,
    ): List<Predicate> {
        val parts = mutableListOf(predicateFor(specification, root, builder))
        val afterPosition = afterProductId?.let { productId -> products.findById(productId).orElse(null) }
        if (afterPosition != null) {
            parts.add(builder.gt(root.get<Int>("cataloguePosition"), afterPosition.cataloguePosition))
        }
        return parts
    }

    private fun predicateFor(
        specification: ProductSpecification,
        root: Root<ProductEntity>,
        builder: CriteriaBuilder,
    ): Predicate = when (specification) {
        is ProductSpecification.InCategory -> builder.equal(
            root.get<CategoryEntity>("category").get<String>("slug"),
            specification.categorySlug,
        )

        is ProductSpecification.NameContains -> builder.like(
            builder.lower(root.get("name")),
            "%${specification.text.lowercase()}%",
        )

        is ProductSpecification.InStock -> builder.gt(root.get<Int>("stock"), 0)

        is ProductSpecification.MatchingAll -> builder.and(
            *specification.parts.map { part -> predicateFor(part, root, builder) }.toTypedArray(),
        )
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/CachedProductRepository.kt`

```kotlin
package nl.zappymart.adapters.persistence

import java.util.concurrent.ConcurrentHashMap
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification

class CachedProductRepository(private val products: ProductRepository) : ProductRepository {

    private data class PageKey(val specification: ProductSpecification, val size: Int, val afterProductId: String?)

    private val pages = ConcurrentHashMap<PageKey, List<Product>>()

    private val counts = ConcurrentHashMap<ProductSpecification, Int>()

    override fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product> =
        pages.computeIfAbsent(PageKey(specification, size, afterProductId)) { key ->
            products.page(key.specification, key.size, key.afterProductId)
        }

    override fun count(specification: ProductSpecification): Int =
        counts.computeIfAbsent(specification) { key -> products.count(key) }

    override fun findById(productId: String): Product? = products.findById(productId)

    override fun findBySlug(slug: String): Product? = products.findBySlug(slug)

    override fun findAllByIds(productIds: List<String>): List<Product> = products.findAllByIds(productIds)

    override fun reduceStock(quantityPerProductId: Map<String, Int>) {
        products.reduceStock(quantityPerProductId)
        forget()
    }

    fun forget() {
        pages.clear()
        counts.clear()
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/JpaCategoryRepository.kt`

```kotlin
package nl.zappymart.adapters.persistence

import nl.zappymart.application.ports.CategoryRepository
import nl.zappymart.domain.catalogue.Category
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaCategoryRepository(private val categories: CategoryEntities) : CategoryRepository {

    override fun findAll(): List<Category> =
        categories.findAllByOrderByPositionAsc().map { entity -> entity.asCategory() }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/JpaCartRepository.kt`

```kotlin
package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.CartEntity
import nl.zappymart.adapters.persistence.entities.CartLineEntity
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.domain.cart.Cart
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaCartRepository(
    private val carts: CartEntities,
    private val products: ProductEntities,
) : CartRepository {

    override fun findById(cartId: String): Cart? = carts.findById(cartId).orElse(null)?.asCart()

    override fun findByCustomerId(customerId: String): Cart? =
        carts.findByCustomerId(customerId)?.asCart()

    @Transactional
    override fun save(cart: Cart): Cart {
        val entity = carts.findById(cart.id).orElseGet { CartEntity(id = cart.id) }
        entity.customerId = cart.customerId
        entity.promotionCode = cart.promotionCode?.value
        entity.updatedAt = cart.updatedAt
        entity.lines.removeIf { line -> cart.lines.none { wanted -> wanted.id == line.id } }
        cart.lines.forEachIndexed { position, line ->
            val existing = entity.lines.firstOrNull { candidate -> candidate.id == line.id }
            if (existing == null) {
                entity.lines.add(
                    CartLineEntity(
                        id = line.id,
                        cart = entity,
                        product = products.getReferenceById(line.product.id),
                        quantity = line.quantity,
                        position = position,
                    ),
                )
            } else {
                existing.quantity = line.quantity
                existing.position = position
            }
        }
        carts.save(entity)
        return cart
    }

    @Transactional
    override fun delete(cartId: String) {
        carts.findById(cartId).ifPresent { entity -> carts.delete(entity) }
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/JpaPromotionRepository.kt`

```kotlin
package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.PromotionEntity
import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.promotions.PromotionRule
import nl.zappymart.domain.shared.PromotionCode
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaPromotionRepository(private val promotions: PromotionEntities) : PromotionRepository {

    override fun findByCode(code: PromotionCode): Promotion? =
        promotions.findById(code.value).orElse(null)?.asPromotion()

    @Transactional
    override fun save(promotion: Promotion) {
        val entity = promotions.findById(promotion.code.value).orElseGet {
            PromotionEntity(code = promotion.code.value)
        }
        entity.kind = promotion.rule.kind.name
        entity.percentage = (promotion.rule as? PromotionRule.Percentage)?.percentage
        entity.amount = (promotion.rule as? PromotionRule.FixedAmount)?.amount?.amount
        entity.minimumSubtotal = promotion.minimumSubtotal?.amount
        entity.validFrom = promotion.validFrom
        entity.validUntil = promotion.validUntil
        entity.usageLimit = promotion.usageLimit
        entity.timesUsed = promotion.timesUsed
        promotions.save(entity)
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/JpaOrderRepository.kt`

```kotlin
package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.OrderEntity
import nl.zappymart.adapters.persistence.entities.OrderLineEntity
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.domain.ordering.Order
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaOrderRepository(private val orders: OrderEntities) : OrderRepository {

    @Transactional
    override fun save(order: Order): Order {
        val entity = OrderEntity(
            sequenceNumber = orders.highestSequenceNumber() + 1,
            id = order.id,
            number = order.number,
            customerId = order.customerId,
            status = order.status.name,
            promotionCode = order.promotionCode?.value,
            subtotal = order.subtotal.amount,
            discount = order.discount.amount,
            shipping = order.shipping.amount,
            total = order.total.amount,
            currency = order.total.currency,
            placedAt = order.placedAt,
        )
        order.lines.forEachIndexed { position, line ->
            entity.lines.add(
                OrderLineEntity(
                    order = entity,
                    productId = line.productId,
                    productName = line.productName,
                    unitPrice = line.unitPrice.amount,
                    currency = line.unitPrice.currency,
                    quantity = line.quantity,
                    position = position,
                ),
            )
        }
        return orders.save(entity).asOrder()
    }

    override fun page(customerId: String, size: Int, afterOrderId: String?): List<Order> {
        if (size <= 0) {
            return emptyList()
        }
        val newestFirst = orders.findByCustomerIdOrderBySequenceNumberDesc(customerId)
        val startAt = if (afterOrderId == null) {
            0
        } else {
            newestFirst.indexOfFirst { entity -> entity.id == afterOrderId } + 1
        }
        if (startAt <= 0 && afterOrderId != null) {
            return emptyList()
        }
        return newestFirst.drop(startAt).take(size).map { entity -> entity.asOrder() }
    }

    override fun count(customerId: String): Int = orders.countByCustomerId(customerId).toInt()

    override fun findForCustomer(orderId: String, customerId: String): Order? =
        orders.findByIdAndCustomerId(orderId, customerId)?.asOrder()
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/JpaCustomerRepository.kt`

```kotlin
package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.CustomerEntity
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.shared.EmailAddress
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaCustomerRepository(private val customers: CustomerEntities) : CustomerRepository {

    override fun findById(customerId: String): Customer? =
        customers.findById(customerId).orElse(null)?.asCustomer()

    override fun findByEmail(email: EmailAddress): Customer? =
        customers.findByEmail(email.value)?.asCustomer()

    @Transactional
    override fun save(customer: Customer): Customer {
        val entity = customers.findById(customer.id).orElseGet { CustomerEntity(id = customer.id) }
        entity.email = customer.email.value
        entity.name = customer.name
        entity.passwordHash = customer.passwordHash.value
        entity.createdAt = customer.createdAt
        return customers.save(entity).asCustomer()
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/JpaSessionRepository.kt`

```kotlin
package nl.zappymart.adapters.persistence

import java.time.Instant
import nl.zappymart.adapters.persistence.entities.RefreshTokenEntity
import nl.zappymart.adapters.persistence.entities.SessionEntity
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaSessionRepository(
    private val sessions: SessionEntities,
    private val refreshTokens: RefreshTokenEntities,
) : SessionRepository {

    @Transactional
    override fun save(session: Session): Session {
        val entity = sessions.findById(session.id).orElseGet { SessionEntity(id = session.id) }
        entity.customerId = session.customerId
        entity.device = session.device
        entity.createdAt = session.createdAt
        entity.lastUsedAt = session.lastUsedAt
        entity.expiresAt = session.expiresAt
        entity.revokedAt = session.revokedAt
        return sessions.save(entity).asSession()
    }

    override fun findById(sessionId: String): Session? = sessions.findById(sessionId).orElse(null)?.asSession()

    override fun findOpenForCustomer(customerId: String, moment: Instant): List<Session> =
        sessions.findByCustomerIdOrderByCreatedAtDesc(customerId)
            .map { entity -> entity.asSession() }
            .filter { session -> session.isOpenAt(moment) }

    @Transactional
    override fun saveRefreshToken(token: RefreshToken): RefreshToken {
        val entity = refreshTokens.findById(token.tokenHash).orElseGet {
            RefreshTokenEntity(tokenHash = token.tokenHash)
        }
        entity.sessionId = token.sessionId
        entity.issuedAt = token.issuedAt
        entity.expiresAt = token.expiresAt
        entity.rotatedAt = token.rotatedAt
        return refreshTokens.save(entity).asRefreshToken()
    }

    override fun findRefreshTokenByHash(tokenHash: String): RefreshToken? =
        refreshTokens.findById(tokenHash).orElse(null)?.asRefreshToken()

    @Transactional
    override fun revokeSessionAndItsTokens(sessionId: String, moment: Instant) {
        sessions.findById(sessionId).ifPresent { entity ->
            entity.revokedAt = entity.revokedAt ?: moment
            sessions.save(entity)
        }
        refreshTokens.findBySessionId(sessionId).forEach { token ->
            token.rotatedAt = token.rotatedAt ?: moment
            refreshTokens.save(token)
        }
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/persistence/JpaWishlistRepository.kt`

```kotlin
package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.WishlistEntryEntity
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.domain.accounts.Wishlist
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaWishlistRepository(private val entries: WishlistEntries) : WishlistRepository {

    override fun findByOwnerId(ownerId: String): Wishlist = Wishlist(
        ownerId,
        entries.findByOwnerIdOrderByPositionAsc(ownerId).map { entry -> entry.productId },
    )

    @Transactional
    override fun save(wishlist: Wishlist) {
        entries.deleteByOwnerId(wishlist.ownerId)
        entries.flush()
        wishlist.productIds.forEachIndexed { position, productId ->
            entries.save(WishlistEntryEntity(ownerId = wishlist.ownerId, productId = productId, position = position))
        }
    }

    @Transactional
    override fun delete(ownerId: String) {
        entries.deleteByOwnerId(ownerId)
    }
}
```

`JpaProductRepository` is where the specification stops being an idea and
becomes a query: one `when` over the sealed `ProductSpecification` turns
each part into a criteria predicate, and `MatchingAll` folds them with
`and`. The same specification is testable without a database through
`isSatisfiedBy`, which is what makes the pattern worth its keep.

`CachedProductRepository` wraps the port and caches the two answers that
are expensive and safe to keep: a page and a count. It never caches one
product, because a cart refusal has to see the stock as it is now.

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/security/Argon2PasswordHasher.kt`

```kotlin
package nl.zappymart.adapters.security

import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.domain.accounts.PasswordHash
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.stereotype.Component

@Component
class Argon2PasswordHasher : PasswordHasher {

    private val encoder = Argon2PasswordEncoder(
        SALT_LENGTH_IN_BYTES,
        HASH_LENGTH_IN_BYTES,
        PARALLELISM,
        MEMORY_IN_KIBIBYTES,
        ITERATIONS,
    )

    override fun hash(password: String) = PasswordHash(requireNotNull(encoder.encode(password)))

    override fun matches(password: String, hash: PasswordHash) = encoder.matches(password, hash.value)

    private companion object {
        const val SALT_LENGTH_IN_BYTES = 16
        const val HASH_LENGTH_IN_BYTES = 32
        const val PARALLELISM = 1
        const val MEMORY_IN_KIBIBYTES = 19456
        const val ITERATIONS = 2
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/security/JsonWebTokenIssuer.kt`

```kotlin
package nl.zappymart.adapters.security

import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jose.jwk.source.ImmutableJWKSet
import com.nimbusds.jose.proc.SecurityContext
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
import nl.zappymart.application.ports.AccessToken
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.SignedInVisitor
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.oauth2.jwt.JwtException
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import org.springframework.stereotype.Component

@Component
class JsonWebTokenIssuer : AccessTokenIssuer {

    private val signingKey: RSAKey = generateSigningKey()

    private val encoder = NimbusJwtEncoder(ImmutableJWKSet<SecurityContext>(JWKSet(signingKey)))

    private val decoder = NimbusJwtDecoder.withPublicKey(signingKey.toRSAPublicKey()).build()

    override fun issue(customerId: String, sessionId: String, moment: Instant): AccessToken {
        val expiresAt = moment.plus(LIFETIME_IN_MINUTES, ChronoUnit.MINUTES).truncatedTo(ChronoUnit.SECONDS)
        val claims = JwtClaimsSet.builder()
            .issuer(ISSUER)
            .subject(customerId)
            .issuedAt(moment.truncatedTo(ChronoUnit.SECONDS))
            .expiresAt(expiresAt)
            .claim(SESSION_CLAIM, sessionId)
            .build()
        val header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(signingKey.keyID).build()
        return AccessToken(encoder.encode(JwtEncoderParameters.from(header, claims)).tokenValue, expiresAt)
    }

    override fun verify(token: String): SignedInVisitor? = try {
        val decoded = decoder.decode(token)
        val customerId = decoded.subject
        val sessionId = decoded.getClaimAsString(SESSION_CLAIM)
        if (customerId == null || sessionId == null) null else SignedInVisitor(customerId, sessionId)
    } catch (refused: JwtException) {
        null
    }

    private fun generateSigningKey(): RSAKey {
        val generator = KeyPairGenerator.getInstance("RSA")
        generator.initialize(KEY_SIZE_IN_BITS)
        val pair = generator.generateKeyPair()
        return RSAKey.Builder(pair.public as RSAPublicKey)
            .privateKey(pair.private as RSAPrivateKey)
            .keyID(UUID.randomUUID().toString())
            .build()
    }

    private companion object {
        const val ISSUER = "zappy-mart"
        const val SESSION_CLAIM = "sessionId"
        const val LIFETIME_IN_MINUTES = 15L
        const val KEY_SIZE_IN_BITS = 2048
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/security/RandomRefreshTokenIssuer.kt`

```kotlin
package nl.zappymart.adapters.security

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import java.util.HexFormat
import nl.zappymart.application.ports.IssuedRefreshToken
import nl.zappymart.application.ports.RefreshTokenIssuer
import org.springframework.stereotype.Component

@Component
class RandomRefreshTokenIssuer : RefreshTokenIssuer {

    private val random = SecureRandom()

    override fun issue(): IssuedRefreshToken {
        val bytes = ByteArray(TOKEN_LENGTH_IN_BYTES)
        random.nextBytes(bytes)
        val value = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        return IssuedRefreshToken(value, hashOf(value))
    }

    override fun hashOf(value: String): String =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.toByteArray()))

    private companion object {
        const val TOKEN_LENGTH_IN_BYTES = 32
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/security/InMemoryRateLimiter.kt`

```kotlin
package nl.zappymart.adapters.security

import java.time.Duration
import java.util.concurrent.ConcurrentHashMap
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.RateLimiter
import org.springframework.stereotype.Component

@Component
class InMemoryRateLimiter(private val clock: Clock) : RateLimiter {

    private val attempts = ConcurrentHashMap<String, MutableList<Long>>()

    override fun allows(key: String): Boolean {
        val now = clock.moment().toEpochMilli()
        val within = attempts.computeIfAbsent(key) { _ -> mutableListOf() }
        synchronized(within) {
            within.removeIf { moment -> now - moment > WINDOW.toMillis() }
            if (within.size >= MAXIMUM_ATTEMPTS) {
                return false
            }
            within.add(now)
            return true
        }
    }

    fun forget() {
        attempts.clear()
    }

    private companion object {
        const val MAXIMUM_ATTEMPTS = 20
        val WINDOW: Duration = Duration.ofMinutes(1)
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/identifiers/RandomIdentifierFactory.kt`

```kotlin
package nl.zappymart.adapters.identifiers

import java.util.UUID
import nl.zappymart.application.ports.IdentifierFactory
import org.springframework.stereotype.Component

@Component
class RandomIdentifierFactory : IdentifierFactory {

    override fun next(): String = UUID.randomUUID().toString()
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/identifiers/DatedOrderNumberFactory.kt`

```kotlin
package nl.zappymart.adapters.identifiers

import java.security.SecureRandom
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import nl.zappymart.application.ports.OrderNumberFactory
import org.springframework.stereotype.Component

@Component
class DatedOrderNumberFactory : OrderNumberFactory {

    private val random = SecureRandom()

    override fun next(moment: Instant): String {
        val day = DAY_FORMAT.format(moment.atOffset(ZoneOffset.UTC))
        val tail = (1..TAIL_LENGTH)
            .map { _ -> ALPHABET[random.nextInt(ALPHABET.length)] }
            .joinToString("")
        return "ZM-$day-$tail"
    }

    private companion object {
        val DAY_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMdd")
        const val ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        const val TAIL_LENGTH = 6
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/time/SystemClock.kt`

```kotlin
package nl.zappymart.adapters.time

import java.time.Instant
import nl.zappymart.application.ports.Clock
import org.springframework.stereotype.Component

@Component
class SystemClock : Clock {

    override fun moment(): Instant = Instant.now()
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/transaction/TransactionalUnitOfWork.kt`

```kotlin
package nl.zappymart.adapters.transaction

import nl.zappymart.application.ports.UnitOfWork
import org.springframework.stereotype.Component
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate

@Component
class TransactionalUnitOfWork(transactionManager: PlatformTransactionManager) : UnitOfWork {

    private val template = TransactionTemplate(transactionManager)

    override fun <Value> execute(work: () -> Value): Value =
        requireNotNull(template.execute { _ -> Outcome(work()) }).value

    private class Outcome<Value>(val value: Value)
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/events/SpringDomainEventPublisher.kt`

```kotlin
package nl.zappymart.adapters.events

import nl.zappymart.application.ports.DomainEventPublisher
import nl.zappymart.domain.shared.DomainEvent
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component

@Component
class SpringDomainEventPublisher(
    private val publisher: ApplicationEventPublisher,
) : DomainEventPublisher {

    override fun publish(event: DomainEvent) {
        publisher.publishEvent(event)
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/events/OrderPlacedListener.kt`

```kotlin
package nl.zappymart.adapters.events

import nl.zappymart.application.ordering.SendOrderConfirmation
import nl.zappymart.application.promotions.CountPromotionUse
import nl.zappymart.domain.ordering.OrderPlaced
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener

@Component
class OrderPlacedListener(
    private val countPromotionUse: CountPromotionUse,
    private val sendOrderConfirmation: SendOrderConfirmation,
) {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun onOrderPlaced(event: OrderPlaced) {
        countPromotionUse.handle(event)
        sendOrderConfirmation.handle(event)
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/mail/ConsoleMailer.kt`

```kotlin
package nl.zappymart.adapters.mail

import nl.zappymart.application.ports.Mailer
import nl.zappymart.application.ports.OrderConfirmation
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class ConsoleMailer : Mailer {

    private val log = LoggerFactory.getLogger(ConsoleMailer::class.java)

    override fun send(confirmation: OrderConfirmation) {
        log.info(
            "Order confirmation for order {} to {}, total {} {}",
            confirmation.orderNumber,
            confirmation.recipient.value,
            confirmation.total.amount,
            confirmation.total.currency,
        )
    }
}
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/seed/SeedFiles.kt`

```kotlin
package nl.zappymart.adapters.seed

import java.time.Instant

data class SeedMoney(val amount: Int, val currency: String)

data class SeedCategory(val id: String, val name: String, val slug: String)

data class SeedProduct(
    val id: String,
    val name: String,
    val slug: String,
    val description: String,
    val price: SeedMoney,
    val categorySlug: String,
    val stock: Int,
    val imageUrl: String?,
)

data class SeedPromotionCode(
    val code: String,
    val kind: String,
    val percentage: Int?,
    val amount: SeedMoney?,
    val minimumSubtotal: SeedMoney?,
    val validFrom: Instant,
    val validUntil: Instant,
    val usageLimit: Int?,
    val timesUsed: Int,
)

data class SeedCustomer(
    val id: String,
    val email: String,
    val name: String,
    val password: String,
    val createdAt: Instant,
    val wishlist: List<String>,
)
```

`zappy-adapters/src/main/kotlin/nl/zappymart/adapters/seed/SeedLoader.kt`

```kotlin
package nl.zappymart.adapters.seed

import jakarta.persistence.EntityManager
import nl.zappymart.adapters.persistence.CachedProductRepository
import nl.zappymart.adapters.persistence.entities.CategoryEntity
import nl.zappymart.adapters.persistence.entities.CustomerEntity
import nl.zappymart.adapters.persistence.entities.ProductEntity
import nl.zappymart.adapters.persistence.entities.PromotionEntity
import nl.zappymart.adapters.persistence.entities.WishlistEntryEntity
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.domain.shared.PromotionCode
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import tools.jackson.core.type.TypeReference
import tools.jackson.databind.ObjectMapper

@Component
class SeedLoader(
    private val entityManager: EntityManager,
    private val objectMapper: ObjectMapper,
    private val passwords: PasswordHasher,
    private val cachedProducts: CachedProductRepository,
) {

    @Transactional
    fun load(): Int {
        emptyTheStore()
        val categories = readSeedFile<SeedCategory>("categories.json")
        val products = readSeedFile<SeedProduct>("products.json")
        val promotionCodes = readSeedFile<SeedPromotionCode>("promotion-codes.json")
        val customers = readSeedFile<SeedCustomer>("customers.json")

        val categoryBySlug = categories.mapIndexed { position, category ->
            val entity = CategoryEntity(category.id, category.name, category.slug, position)
            entityManager.persist(entity)
            category.slug to entity
        }.toMap()

        products.forEachIndexed { position, product ->
            entityManager.persist(
                ProductEntity(
                    id = product.id,
                    name = product.name,
                    slug = product.slug,
                    description = product.description,
                    priceAmount = product.price.amount,
                    currency = product.price.currency,
                    category = requireNotNull(categoryBySlug[product.categorySlug]) {
                        "The seed puts ${product.id} in the unknown category ${product.categorySlug}"
                    },
                    stock = product.stock,
                    imageUrl = product.imageUrl,
                    cataloguePosition = position,
                ),
            )
        }

        promotionCodes.forEach { code ->
            entityManager.persist(
                PromotionEntity(
                    code = PromotionCode.of(code.code).value,
                    kind = code.kind,
                    percentage = code.percentage,
                    amount = code.amount?.amount,
                    minimumSubtotal = code.minimumSubtotal?.amount,
                    currency = code.amount?.currency ?: code.minimumSubtotal?.currency ?: "EUR",
                    validFrom = code.validFrom,
                    validUntil = code.validUntil,
                    usageLimit = code.usageLimit,
                    timesUsed = code.timesUsed,
                ),
            )
        }

        customers.forEach { customer ->
            entityManager.persist(
                CustomerEntity(
                    id = customer.id,
                    email = customer.email.trim().lowercase(),
                    name = customer.name,
                    passwordHash = passwords.hash(customer.password).value,
                    createdAt = customer.createdAt,
                ),
            )
            customer.wishlist.forEachIndexed { position, productId ->
                entityManager.persist(WishlistEntryEntity(ownerId = customer.id, productId = productId, position = position))
            }
        }

        entityManager.flush()
        entityManager.clear()
        cachedProducts.forget()
        return products.size
    }

    private fun emptyTheStore() {
        TABLES_IN_DELETION_ORDER.forEach { entityName ->
            entityManager.createQuery("delete from $entityName").executeUpdate()
        }
        entityManager.flush()
        entityManager.clear()
        cachedProducts.forget()
    }

    private inline fun <reified Item> readSeedFile(name: String): List<Item> =
        ClassPathResource("$SEED_LOCATION/$name").inputStream.use { stream ->
            objectMapper.readValue(stream, object : TypeReference<List<Item>>() {})
        }

    private companion object {
        const val SEED_LOCATION = "contract-seed"

        val TABLES_IN_DELETION_ORDER = listOf(
            "OrderLineEntity",
            "OrderEntity",
            "CartLineEntity",
            "CartEntity",
            "RefreshTokenEntity",
            "SessionEntity",
            "WishlistEntryEntity",
            "PromotionEntity",
            "ProductEntity",
            "CategoryEntity",
            "CustomerEntity",
        )
    }
}
```

`JsonWebTokenIssuer` generates an RSA key pair when the application
starts, which is right for development and for the conformance run and
wrong for anything else: every restart invalidates every access token
that is out. A deployment reads the key from its secret store instead,
and the one method to change is `generateSigningKey`.

`SystemClock` answers with every digit `Instant.now()` gives. The
`DateTime` scalar cuts the answer back to whole seconds, which is what
the contract asks for, and keeping the precision inside means two logins
in the same second still sort newest first.

### 5.5 zappy-host

The Spring Boot application, the wiring of the use cases, the
configuration, and the two things that exist only in the development
profile.

`zappy-host/src/main/kotlin/nl/zappymart/host/ZappyMartApplication.kt`

```kotlin
package nl.zappymart.host

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.persistence.autoconfigure.EntityScan
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.context.annotation.ComponentScan
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@SpringBootApplication
@ComponentScan(basePackages = ["nl.zappymart.host", "nl.zappymart.adapters"])
@ConfigurationPropertiesScan(basePackages = ["nl.zappymart.adapters"])
@EntityScan(basePackages = ["nl.zappymart.adapters.persistence.entities"])
@EnableJpaRepositories(basePackages = ["nl.zappymart.adapters.persistence"])
class ZappyMartApplication

fun main(arguments: Array<String>) {
    runApplication<ZappyMartApplication>(*arguments)
}
```

`zappy-host/src/main/kotlin/nl/zappymart/host/UseCaseConfiguration.kt`

```kotlin
package nl.zappymart.host

import nl.zappymart.application.accounts.AddToWishlist
import nl.zappymart.application.accounts.FindSignedInCustomer
import nl.zappymart.application.accounts.IdentifyVisitor
import nl.zappymart.application.accounts.ListSessions
import nl.zappymart.application.accounts.LogInCustomer
import nl.zappymart.application.accounts.LogOut
import nl.zappymart.application.accounts.RefreshSession
import nl.zappymart.application.accounts.RegisterCustomer
import nl.zappymart.application.accounts.RemoveFromWishlist
import nl.zappymart.application.accounts.RevokeSession
import nl.zappymart.application.accounts.SignIn
import nl.zappymart.application.accounts.ViewWishlist
import nl.zappymart.application.accounts.WishlistOwner
import nl.zappymart.application.cart.AddToCart
import nl.zappymart.application.cart.ApplyPromotionCode
import nl.zappymart.application.cart.CartPromotion
import nl.zappymart.application.cart.ChangeCartLineQuantity
import nl.zappymart.application.cart.RemoveCartLine
import nl.zappymart.application.cart.RemovePromotionCode
import nl.zappymart.application.cart.ViewCart
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.catalogue.FindProduct
import nl.zappymart.application.catalogue.ListCategories
import nl.zappymart.application.catalogue.ListProducts
import nl.zappymart.application.ordering.FindOrder
import nl.zappymart.application.ordering.ListOrders
import nl.zappymart.application.ordering.PlaceOrder
import nl.zappymart.application.ordering.SendOrderConfirmation
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.CategoryRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.DomainEventPublisher
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.Mailer
import nl.zappymart.application.ports.OrderNumberFactory
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.application.ports.RateLimiter
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.application.promotions.CountPromotionUse
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class UseCaseConfiguration {

    @Bean
    fun listProducts(products: ProductRepository) = ListProducts(products)

    @Bean
    fun findProduct(products: ProductRepository) = FindProduct(products)

    @Bean
    fun listCategories(categories: CategoryRepository) = ListCategories(categories)

    @Bean
    fun cartPromotion(promotions: PromotionRepository, clock: Clock) = CartPromotion(promotions, clock)

    @Bean
    fun visitorCart(carts: CartRepository, clock: Clock, identifiers: IdentifierFactory) =
        VisitorCart(carts, clock, identifiers)

    @Bean
    fun viewCart(visitorCart: VisitorCart, cartPromotion: CartPromotion) = ViewCart(visitorCart, cartPromotion)

    @Bean
    fun addToCart(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        products: ProductRepository,
        identifiers: IdentifierFactory,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = AddToCart(visitorCart, cartPromotion, carts, products, identifiers, clock, unitOfWork)

    @Bean
    fun changeCartLineQuantity(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = ChangeCartLineQuantity(visitorCart, cartPromotion, carts, clock, unitOfWork)

    @Bean
    fun removeCartLine(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = RemoveCartLine(visitorCart, cartPromotion, carts, clock, unitOfWork)

    @Bean
    fun applyPromotionCode(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        unitOfWork: UnitOfWork,
    ) = ApplyPromotionCode(visitorCart, cartPromotion, carts, unitOfWork)

    @Bean
    fun removePromotionCode(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = RemovePromotionCode(visitorCart, cartPromotion, carts, clock, unitOfWork)

    @Bean
    @Suppress("LongParameterList")
    fun placeOrder(
        visitorCart: VisitorCart,
        cartPromotion: CartPromotion,
        carts: CartRepository,
        products: ProductRepository,
        orders: OrderRepository,
        identifiers: IdentifierFactory,
        orderNumbers: OrderNumberFactory,
        clock: Clock,
        unitOfWork: UnitOfWork,
        events: DomainEventPublisher,
    ) = PlaceOrder(
        visitorCart,
        cartPromotion,
        carts,
        products,
        orders,
        identifiers,
        orderNumbers,
        clock,
        unitOfWork,
        events,
    )

    @Bean
    fun listOrders(orders: OrderRepository) = ListOrders(orders)

    @Bean
    fun findOrder(orders: OrderRepository) = FindOrder(orders)

    @Bean
    fun sendOrderConfirmation(customers: CustomerRepository, orders: OrderRepository, mailer: Mailer) =
        SendOrderConfirmation(customers, orders, mailer)

    @Bean
    fun countPromotionUse(promotions: PromotionRepository) = CountPromotionUse(promotions)

    @Bean
    fun signIn(
        sessions: SessionRepository,
        accessTokens: AccessTokenIssuer,
        refreshTokens: RefreshTokenIssuer,
        identifiers: IdentifierFactory,
        clock: Clock,
    ) = SignIn(sessions, accessTokens, refreshTokens, identifiers, clock)

    @Bean
    fun wishlistOwner(wishlists: WishlistRepository, visitorCart: VisitorCart, carts: CartRepository) =
        WishlistOwner(wishlists, visitorCart, carts)

    @Bean
    fun registerCustomer(
        customers: CustomerRepository,
        passwords: PasswordHasher,
        identifiers: IdentifierFactory,
        clock: Clock,
        signIn: SignIn,
        visitorCart: VisitorCart,
        wishlistOwner: WishlistOwner,
        rateLimiter: RateLimiter,
        unitOfWork: UnitOfWork,
    ) = RegisterCustomer(customers, passwords, identifiers, clock, signIn, visitorCart, wishlistOwner, rateLimiter, unitOfWork)

    @Bean
    fun logInCustomer(
        customers: CustomerRepository,
        passwords: PasswordHasher,
        signIn: SignIn,
        visitorCart: VisitorCart,
        wishlistOwner: WishlistOwner,
        rateLimiter: RateLimiter,
        unitOfWork: UnitOfWork,
    ) = LogInCustomer(customers, passwords, signIn, visitorCart, wishlistOwner, rateLimiter, unitOfWork)

    @Bean
    fun refreshSession(
        sessions: SessionRepository,
        customers: CustomerRepository,
        accessTokens: AccessTokenIssuer,
        refreshTokens: RefreshTokenIssuer,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = RefreshSession(sessions, customers, accessTokens, refreshTokens, clock, unitOfWork)

    @Bean
    fun logOut(
        sessions: SessionRepository,
        refreshTokens: RefreshTokenIssuer,
        clock: Clock,
        unitOfWork: UnitOfWork,
    ) = LogOut(sessions, refreshTokens, clock, unitOfWork)

    @Bean
    fun revokeSession(sessions: SessionRepository, clock: Clock, unitOfWork: UnitOfWork) =
        RevokeSession(sessions, clock, unitOfWork)

    @Bean
    fun findSignedInCustomer(customers: CustomerRepository) = FindSignedInCustomer(customers)

    @Bean
    fun listSessions(sessions: SessionRepository, clock: Clock) = ListSessions(sessions, clock)

    @Bean
    fun identifyVisitor(accessTokens: AccessTokenIssuer, sessions: SessionRepository, clock: Clock) =
        IdentifyVisitor(accessTokens, sessions, clock)

    @Bean
    fun viewWishlist(
        wishlists: WishlistRepository,
        products: ProductRepository,
        wishlistOwner: WishlistOwner,
    ) = ViewWishlist(wishlists, products, wishlistOwner)

    @Bean
    fun addToWishlist(
        wishlists: WishlistRepository,
        products: ProductRepository,
        viewWishlist: ViewWishlist,
        wishlistOwner: WishlistOwner,
        unitOfWork: UnitOfWork,
    ) = AddToWishlist(wishlists, products, viewWishlist, wishlistOwner, unitOfWork)

    @Bean
    fun removeFromWishlist(
        wishlists: WishlistRepository,
        viewWishlist: ViewWishlist,
        wishlistOwner: WishlistOwner,
        unitOfWork: UnitOfWork,
    ) = RemoveFromWishlist(wishlists, viewWishlist, wishlistOwner, unitOfWork)
}
```

`zappy-host/src/main/kotlin/nl/zappymart/host/PersistenceConfiguration.kt`

```kotlin
package nl.zappymart.host

import nl.zappymart.adapters.persistence.CachedProductRepository
import nl.zappymart.adapters.persistence.JpaProductRepository
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary

@Configuration
class PersistenceConfiguration {

    @Bean
    @Primary
    fun cachedProductRepository(catalogue: JpaProductRepository) = CachedProductRepository(catalogue)
}
```

`zappy-host/src/main/kotlin/nl/zappymart/host/GraphQlConfiguration.kt`

```kotlin
package nl.zappymart.host

import nl.zappymart.adapters.graphql.DateTimeScalar
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.graphql.execution.RuntimeWiringConfigurer

@Configuration
class GraphQlConfiguration {

    @Bean
    fun dateTimeScalarConfigurer() = RuntimeWiringConfigurer { wiring -> wiring.scalar(DateTimeScalar.TYPE) }
}
```

`zappy-host/src/main/kotlin/nl/zappymart/host/SeedAtStart.kt`

```kotlin
package nl.zappymart.host

import nl.zappymart.adapters.seed.SeedLoader
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile

@Configuration
@Profile("development")
class SeedAtStart {

    private val log = LoggerFactory.getLogger(SeedAtStart::class.java)

    @Bean
    fun loadTheSeedAtStart(seedLoader: SeedLoader) = ApplicationRunner { _ ->
        log.info("Loaded {} products from contract/seed", seedLoader.load())
    }
}
```

`zappy-host/src/main/kotlin/nl/zappymart/host/ResetSeedController.kt`

```kotlin
package nl.zappymart.host

import nl.zappymart.adapters.graphql.ResetSeedPayload
import nl.zappymart.adapters.seed.SeedLoader
import org.springframework.context.annotation.Profile
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.stereotype.Controller

@Controller
@Profile("development")
class ResetSeedController(private val seedLoader: SeedLoader) {

    @MutationMapping
    fun resetSeed(): ResetSeedPayload = ResetSeedPayload(true, seedLoader.load(), emptyList())
}
```

`zappy-host/src/main/resources/application.yaml`

```yaml
spring:
  application:
    name: zappy-mart-kotlin
  profiles:
    default: development
  jpa:
    hibernate:
      ddl-auto: update
    open-in-view: false
    properties:
      hibernate:
        jdbc:
          time_zone: UTC
  datasource:
    url: jdbc:h2:file:./build/database/zappy-mart;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;AUTO_SERVER=TRUE
    driver-class-name: org.h2.Driver
    username: zappy
    password: zappy
  graphql:
    path: /graphql
    graphiql:
      enabled: true
    schema:
      inspection:
        enabled: true

server:
  port: 8082

management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      probes:
        enabled: true
      show-details: never

zappy:
  security:
    allowed-origins:
      - http://localhost:5173
      - http://localhost:3001
      - http://localhost:4200
    cookies-secure: true
    graph-ql-path: /graphql

logging:
  level:
    nl.zappymart: INFO

---
spring:
  config:
    activate:
      on-profile: development
  graphql:
    schema:
      locations:
        - classpath:graphql/**/
        - classpath:graphql-development/**/

---
spring:
  config:
    activate:
      on-profile: postgres
  datasource:
    url: jdbc:postgresql://localhost:5432/zappymart
    driver-class-name: org.postgresql.Driver
    username: zappy
    password: zappy
  jpa:
    hibernate:
      ddl-auto: update
```

Every use case is a plain class with a constructor, so the host makes
each one a `@Bean` by hand. That is more lines than a component scan and
it is the point: `UseCaseConfiguration` is the one file that says what
this application is made of, and a reader who wants to know what
`PlaceOrder` needs reads its parameter list.

`resetSeed` exists only under the `development` profile, twice over: the
controller carries `@Profile("development")` and the development schema
file is added to `spring.graphql.schema.locations` only in that profile's
block. Outside development the field is not on `Mutation` at all, so a
document that asks for it does not validate.

### 5.6 The tests

Domain rules have unit tests that read like the rule, use cases have unit
tests with in memory ports and no database, and the host has one
integration test that talks to a running server over HTTP with a real
cookie jar.

`zappy-domain/src/testFixtures/kotlin/nl/zappymart/domain/builders/ProductBuilder.kt`

```kotlin
package nl.zappymart.domain.builders

import nl.zappymart.domain.catalogue.Category
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.Money

class ProductBuilder {

    private var id = "product-01"
    private var name = "A product"
    private var slug = "a-product"
    private var price = Money.euro(1000)
    private var category = Category("category-electronics", "Electronics", "electronics")
    private var stock = 10

    fun withId(id: String) = apply { this.id = id }

    fun named(name: String) = apply {
        this.name = name
        this.slug = name.lowercase().replace(" ", "-")
    }

    fun costing(amountInCents: Int) = apply { price = Money.euro(amountInCents) }

    fun inCategory(slug: String) = apply { category = Category("category-$slug", slug, slug) }

    fun withStock(stock: Int) = apply { this.stock = stock }

    fun build() = Product(id, name, slug, "A description", price, category, stock, "/images/products/$slug.svg")
}

fun aProduct() = ProductBuilder()
```

`zappy-domain/src/testFixtures/kotlin/nl/zappymart/domain/builders/CartBuilder.kt`

```kotlin
package nl.zappymart.domain.builders

import java.time.Instant
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.cart.CartLine
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.promotions.AppliedPromotion
import nl.zappymart.domain.promotions.PromotionKind
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode

val A_MOMENT: Instant = Instant.parse("2026-09-09T10:00:00Z")

class CartBuilder {

    private val lines = mutableListOf<CartLine>()
    private var customerId: String? = null
    private var promotion: AppliedPromotion? = null

    fun holding(product: Product, quantity: Int = 1) = apply {
        lines.add(CartLine("line-${lines.size + 1}", product, quantity))
    }

    fun ownedBy(customerId: String) = apply { this.customerId = customerId }

    fun withPercentageOff(code: String, discountInCents: Int) = apply {
        promotion = AppliedPromotion(PromotionCode.of(code), PromotionKind.PERCENTAGE, Money.euro(discountInCents))
    }

    fun withFreeShipping(code: String) = apply {
        promotion = AppliedPromotion(PromotionCode.of(code), PromotionKind.FREE_SHIPPING, Money.NOTHING)
    }

    fun build() = Cart("cart-01", customerId, lines.toList(), promotion?.code, promotion, A_MOMENT)
}

fun aCart() = CartBuilder()
```

`zappy-domain/src/test/kotlin/nl/zappymart/domain/shared/MoneyTest.kt`

```kotlin
package nl.zappymart.domain.shared

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class MoneyTest {

    @Test
    fun `adds and subtracts amounts in the same currency`() {
        assertThat(Money.euro(1970) + Money.euro(495)).isEqualTo(Money.euro(2465))
        assertThat(Money.euro(2465) - Money.euro(495)).isEqualTo(Money.euro(1970))
    }

    @Test
    fun `multiplies a price by a quantity`() {
        assertThat(Money.euro(985) * 2).isEqualTo(Money.euro(1970))
    }

    @Test
    fun `rounds a percentage half up to whole cents`() {
        assertThat(Money.euro(5599).percentageRoundedHalfUp(10)).isEqualTo(Money.euro(560))
        assertThat(Money.euro(1970).percentageRoundedHalfUp(10)).isEqualTo(Money.euro(197))
        assertThat(Money.euro(5).percentageRoundedHalfUp(10)).isEqualTo(Money.euro(1))
    }

    @Test
    fun `caps an amount at a maximum`() {
        assertThat(Money.euro(500).cappedAt(Money.euro(300))).isEqualTo(Money.euro(300))
        assertThat(Money.euro(200).cappedAt(Money.euro(300))).isEqualTo(Money.euro(200))
    }

    @Test
    fun `refuses to combine two currencies`() {
        assertThatThrownBy { Money.euro(100) + Money(100, "USD") }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `refuses a negative amount`() {
        assertThatThrownBy { Money.euro(-1) }.isInstanceOf(IllegalArgumentException::class.java)
    }
}
```

`zappy-domain/src/test/kotlin/nl/zappymart/domain/cart/CartTest.kt`

```kotlin
package nl.zappymart.domain.cart

import nl.zappymart.domain.builders.A_MOMENT
import nl.zappymart.domain.builders.aCart
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class CartTest {

    private val boatNeck = aProduct().withId("product-18").named("Boat neck").costing(985).withStock(25).build()

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    @Test
    fun `an empty cart pays nothing at all`() {
        val cart = aCart().build()
        assertThat(cart.subtotal).isEqualTo(Money.NOTHING)
        assertThat(cart.shipping).isEqualTo(Money.NOTHING)
        assertThat(cart.total).isEqualTo(Money.NOTHING)
    }

    @Test
    fun `a cart below five thousand cents pays the shipping charge`() {
        val cart = aCart().holding(boatNeck, 2).build()
        assertThat(cart.subtotal).isEqualTo(Money.euro(1970))
        assertThat(cart.shipping).isEqualTo(Money.euro(495))
        assertThat(cart.total).isEqualTo(Money.euro(2465))
    }

    @Test
    fun `a free shipping code takes the charge away and discounts nothing`() {
        val cart = aCart().holding(boatNeck, 2).withFreeShipping("FREESHIP").build()
        assertThat(cart.shipping).isEqualTo(Money.NOTHING)
        assertThat(cart.discount).isEqualTo(Money.NOTHING)
        assertThat(cart.total).isEqualTo(Money.euro(1970))
    }

    @Test
    fun `a cart of five thousand cents or more pays no shipping`() {
        val cart = aCart().holding(jacket).withPercentageOff("WELCOME10", 560).build()
        assertThat(cart.subtotal).isEqualTo(Money.euro(5599))
        assertThat(cart.shipping).isEqualTo(Money.NOTHING)
        assertThat(cart.discount).isEqualTo(Money.euro(560))
        assertThat(cart.total).isEqualTo(Money.euro(5039))
    }

    @Test
    fun `adding a product that is already on a line raises the quantity`() {
        val cart = aCart().holding(boatNeck, 2).build()
        val changed = cart.withProductAdded(boatNeck, 3, "line-new", A_MOMENT) as Result.Success
        assertThat(changed.value.lines).hasSize(1)
        assertThat(changed.value.lines.first().quantity).isEqualTo(5)
    }

    @Test
    fun `adding more than the stock is refused with the product named`() {
        val lastOne = aProduct().withId("product-12").named("Gaming drive").costing(11400).withStock(1).build()
        val cart = aCart().holding(lastOne).build()
        val refused = cart.withProductAdded(lastOne, 1, "line-new", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.OUT_OF_STOCK)
        assertThat(refused.errors.first().message).contains("Gaming drive")
    }

    @Test
    fun `a quantity below one is refused`() {
        val cart = aCart().build()
        val refused = cart.withProductAdded(boatNeck, 0, "line-new", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.QUANTITY_INVALID)
    }

    @Test
    fun `changing a quantity to zero is refused rather than removing the line`() {
        val cart = aCart().holding(boatNeck, 2).build()
        val refused = cart.withLineQuantityChanged("line-1", 0, A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.QUANTITY_INVALID)
    }

    @Test
    fun `changing a line that is not in the cart is refused`() {
        val cart = aCart().holding(boatNeck, 2).build()
        val refused = cart.withLineQuantityChanged("line-nine", 1, A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_LINE_NOT_FOUND)
    }

    @Test
    fun `removing a line that is already gone is refused`() {
        val cart = aCart().holding(boatNeck, 2).build()
        val emptied = (cart.withLineRemoved("line-1", A_MOMENT) as Result.Success).value
        val refused = emptied.withLineRemoved("line-1", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_LINE_NOT_FOUND)
    }

    @Test
    fun `emptying a cart drops its lines and its promotion code`() {
        val cart = aCart().holding(boatNeck, 2).withPercentageOff("WELCOME10", 197).build()
        val emptied = cart.emptied(A_MOMENT)
        assertThat(emptied.lines).isEmpty()
        assertThat(emptied.promotionCode).isNull()
        assertThat(emptied.promotion).isNull()
    }
}
```

`zappy-domain/src/test/kotlin/nl/zappymart/domain/promotions/PromotionTest.kt`

```kotlin
package nl.zappymart.domain.promotions

import java.time.Instant
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class PromotionTest {

    private val today: Instant = Instant.parse("2026-09-09T10:00:00Z")

    private fun promotion(
        code: String,
        rule: PromotionRule,
        minimumSubtotal: Money? = null,
        validFrom: String = "2026-01-01T00:00:00Z",
        validUntil: String = "2027-12-31T23:59:59Z",
        usageLimit: Int? = null,
        timesUsed: Int = 0,
    ) = Promotion(
        PromotionCode.of(code),
        rule,
        minimumSubtotal,
        Instant.parse(validFrom),
        Instant.parse(validUntil),
        usageLimit,
        timesUsed,
    )

    @Test
    fun `a percentage code takes its percentage of the subtotal rounded half up`() {
        val applied = promotion("WELCOME10", PromotionRule.Percentage(10))
            .applyTo(Money.euro(5599), today) as Result.Success
        assertThat(applied.value.kind).isEqualTo(PromotionKind.PERCENTAGE)
        assertThat(applied.value.discount).isEqualTo(Money.euro(560))
    }

    @Test
    fun `a fixed amount code never discounts more than the subtotal`() {
        val applied = promotion("FIVEOFF", PromotionRule.FixedAmount(Money.euro(500)))
            .applyTo(Money.euro(300), today) as Result.Success
        assertThat(applied.value.discount).isEqualTo(Money.euro(300))
    }

    @Test
    fun `a free shipping code discounts nothing`() {
        val applied = promotion("FREESHIP", PromotionRule.FreeShipping)
            .applyTo(Money.euro(1970), today) as Result.Success
        assertThat(applied.value.kind).isEqualTo(PromotionKind.FREE_SHIPPING)
        assertThat(applied.value.discount).isEqualTo(Money.NOTHING)
    }

    @Test
    fun `a code outside its window is expired`() {
        val refused = promotion(
            "SUMMER2025",
            PromotionRule.Percentage(10),
            validFrom = "2025-06-01T00:00:00Z",
            validUntil = "2025-08-31T23:59:59Z",
        ).applyTo(Money.euro(1970), today) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CODE_EXPIRED)
    }

    @Test
    fun `a code at its usage limit is exhausted`() {
        val refused = promotion("ONCE", PromotionRule.Percentage(10), usageLimit = 1, timesUsed = 1)
            .applyTo(Money.euro(1970), today) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CODE_EXHAUSTED)
    }

    @Test
    fun `a code below its minimum subtotal is refused`() {
        val refused = promotion(
            "FIVEOFF",
            PromotionRule.FixedAmount(Money.euro(500)),
            minimumSubtotal = Money.euro(2500),
        ).applyTo(Money.euro(1970), today) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CODE_MINIMUM_NOT_MET)
    }

    @Test
    fun `counting a use raises the recorded number`() {
        assertThat(promotion("ONCE", PromotionRule.Percentage(10)).usedOnce().timesUsed).isEqualTo(1)
    }
}
```

`zappy-domain/src/test/kotlin/nl/zappymart/domain/ordering/OrderTest.kt`

```kotlin
package nl.zappymart.domain.ordering

import nl.zappymart.domain.builders.A_MOMENT
import nl.zappymart.domain.builders.aCart
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class OrderTest {

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    @Test
    fun `an order keeps the names, the prices and the totals of the moment`() {
        val cart = aCart().holding(jacket, 2).withPercentageOff("WELCOME10", 1120).build()
        val placed = Order.place(cart, "customer-01", "order-01", "ZM-1", A_MOMENT) as Result.Success
        val order = placed.value
        assertThat(order.status).isEqualTo(OrderStatus.PAID)
        assertThat(order.lines).singleElement().satisfies({ line ->
            assertThat(line.productName).isEqualTo("Cotton jacket")
            assertThat(line.unitPrice).isEqualTo(Money.euro(5599))
            assertThat(line.lineTotal).isEqualTo(Money.euro(11198))
        })
        assertThat(order.subtotal).isEqualTo(Money.euro(11198))
        assertThat(order.discount).isEqualTo(Money.euro(1120))
        assertThat(order.shipping).isEqualTo(Money.NOTHING)
        assertThat(order.total).isEqualTo(Money.euro(10078))
        assertThat(order.promotionCode?.value).isEqualTo("WELCOME10")
    }

    @Test
    fun `an empty cart cannot be ordered`() {
        val refused = Order.place(aCart().build(), "customer-01", "order-01", "ZM-1", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_EMPTY)
    }

    @Test
    fun `a line above the stock stops the whole order and names the product`() {
        val lastOne = aProduct().withId("product-12").named("Gaming drive").withStock(1).build()
        val cart = aCart().holding(jacket).holding(lastOne, 2).build()
        val refused = Order.place(cart, "customer-01", "order-01", "ZM-1", A_MOMENT) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.OUT_OF_STOCK)
        assertThat(refused.errors.first().message).contains("Gaming drive")
    }

    @Test
    fun `a placed order announces itself`() {
        val cart = aCart().holding(jacket).build()
        val order = (Order.place(cart, "customer-01", "order-01", "ZM-1", A_MOMENT) as Result.Success).value
        assertThat(order.placed()).isEqualTo(OrderPlaced("order-01", "ZM-1", "customer-01", null, A_MOMENT))
    }
}
```

`zappy-domain/src/test/kotlin/nl/zappymart/domain/catalogue/ProductSpecificationTest.kt`

```kotlin
package nl.zappymart.domain.catalogue

import nl.zappymart.domain.builders.aProduct
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ProductSpecificationTest {

    private val ring = aProduct().named("Princess ring").inCategory("jewellery").withStock(0).build()

    private val jacket = aProduct().named("Cotton jacket").inCategory("mens-clothing").withStock(8).build()

    @Test
    fun `an empty specification keeps every product`() {
        assertThat(ProductSpecification.EVERYTHING.isSatisfiedBy(ring)).isTrue()
        assertThat(ProductSpecification.EVERYTHING.isSatisfiedBy(jacket)).isTrue()
    }

    @Test
    fun `a category filter keeps only that category`() {
        val specification = ProductSpecification.of("jewellery", null, null)
        assertThat(specification.isSatisfiedBy(ring)).isTrue()
        assertThat(specification.isSatisfiedBy(jacket)).isFalse()
    }

    @Test
    fun `a name filter ignores case`() {
        val specification = ProductSpecification.of(null, "COTTON", null)
        assertThat(specification.isSatisfiedBy(jacket)).isTrue()
        assertThat(specification.isSatisfiedBy(ring)).isFalse()
    }

    @Test
    fun `the in stock filter leaves out what has none`() {
        val specification = ProductSpecification.of(null, null, true)
        assertThat(specification.isSatisfiedBy(ring)).isFalse()
        assertThat(specification.isSatisfiedBy(jacket)).isTrue()
    }

    @Test
    fun `every part that is given has to hold`() {
        val specification = ProductSpecification.of("mens-clothing", "jacket", true)
        assertThat(specification.isSatisfiedBy(jacket)).isTrue()
        assertThat(ProductSpecification.of("jewellery", "jacket", true).isSatisfiedBy(jacket)).isFalse()
    }

    @Test
    fun `a blank name filter is left out`() {
        assertThat(ProductSpecification.of(null, "   ", null)).isEqualTo(ProductSpecification.EVERYTHING)
    }
}
```

`zappy-domain/src/test/kotlin/nl/zappymart/domain/accounts/AccountRulesTest.kt`

```kotlin
package nl.zappymart.domain.accounts

import java.time.Instant
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AccountRulesTest {

    @Test
    fun `an email address is trimmed and lowercased`() {
        val parsed = EmailAddress.of("  JANE@Example.COM ") as Result.Success
        assertThat(parsed.value.value).isEqualTo("jane@example.com")
    }

    @Test
    fun `text that is not an address is refused`() {
        val refused = EmailAddress.of("jane at example") as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.EMAIL_INVALID)
    }

    @Test
    fun `a password shorter than twelve characters is refused`() {
        val refused = PasswordPolicy.check("short") as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.PASSWORD_TOO_SHORT)
    }

    @Test
    fun `a password longer than one hundred and twenty eight characters is refused`() {
        val refused = PasswordPolicy.check("x".repeat(129)) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.PASSWORD_TOO_LONG)
    }

    @Test
    fun `the seed password clears the policy`() {
        assertThat(PasswordPolicy.check("correct horse battery staple")).isInstanceOf(Result.Success::class.java)
    }

    @Test
    fun `a password hash never prints itself`() {
        assertThat(PasswordHash("argon2id-secret").toString()).doesNotContain("secret")
    }

    @Test
    fun `a session is closed once it is revoked`() {
        val moment = Instant.parse("2026-09-09T10:00:00Z")
        val session = Session("session-01", "customer-01", "Chrome", moment, moment, moment.plusSeconds(60), null)
        assertThat(session.isOpenAt(moment)).isTrue()
        assertThat(session.revokedAt(moment).isOpenAt(moment)).isFalse()
        assertThat(session.isOpenAt(moment.plusSeconds(120))).isFalse()
    }

    @Test
    fun `a refresh token is usable once and a rotated one says so`() {
        val moment = Instant.parse("2026-09-09T10:00:00Z")
        val token = RefreshToken("hash", "session-01", moment, moment.plusSeconds(60), null)
        assertThat(token.isUsableAt(moment)).isTrue()
        assertThat(token.rotatedAt(moment).isUsableAt(moment)).isFalse()
        assertThat(token.rotatedAt(moment).wasAlreadyUsed()).isTrue()
    }

    @Test
    fun `a wishlist keeps the newest first and never doubles a product`() {
        val wishlist = Wishlist.emptyFor("customer-01").with("product-01").with("product-02").with("product-01")
        assertThat(wishlist.productIds).containsExactly("product-02", "product-01")
    }

    @Test
    fun `merging a wishlist adds and never replaces`() {
        val customer = Wishlist("customer-01", listOf("product-05"))
        val anonymous = Wishlist("cart-01", listOf("product-03", "product-05"))
        assertThat(customer.mergedWith(anonymous).productIds).containsExactly("product-03", "product-05")
    }

    @Test
    fun `removing a product that is not saved leaves the list alone`() {
        val wishlist = Wishlist("customer-01", listOf("product-05"))
        assertThat(wishlist.without("product-09").productIds).containsExactly("product-05")
    }
}
```

`zappy-application/src/test/kotlin/nl/zappymart/application/InMemoryStore.kt`

```kotlin
package nl.zappymart.application

import java.time.Instant
import nl.zappymart.application.ports.AccessToken
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.DomainEventPublisher
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.IssuedRefreshToken
import nl.zappymart.application.ports.Mailer
import nl.zappymart.application.ports.OrderConfirmation
import nl.zappymart.application.ports.OrderNumberFactory
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.application.ports.RateLimiter
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.SignedInVisitor
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.accounts.Wishlist
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.shared.DomainEvent
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.PromotionCode

class FixedClock(private var moment: Instant = Instant.parse("2026-09-09T10:00:00Z")) : Clock {
    override fun moment(): Instant = moment
    fun movesTo(later: Instant) {
        moment = later
    }
}

class CountingIdentifierFactory : IdentifierFactory {
    private var given = 0
    override fun next(): String {
        given += 1
        return "identifier-$given"
    }
}

class FixedOrderNumberFactory : OrderNumberFactory {
    override fun next(moment: Instant) = "ZM-TEST-1"
}

class DirectUnitOfWork : UnitOfWork {
    override fun <Value> execute(work: () -> Value): Value = work()
}

class RecordingEventPublisher : DomainEventPublisher {
    val published = mutableListOf<DomainEvent>()
    override fun publish(event: DomainEvent) {
        published.add(event)
    }
}

class RecordingMailer : Mailer {
    val sent = mutableListOf<OrderConfirmation>()
    override fun send(confirmation: OrderConfirmation) {
        sent.add(confirmation)
    }
}

class ReversingPasswordHasher : PasswordHasher {
    override fun hash(password: String) = PasswordHash(password.reversed())
    override fun matches(password: String, hash: PasswordHash) = password.reversed() == hash.value
}

class AllowingRateLimiter(private var allowing: Boolean = true) : RateLimiter {
    override fun allows(key: String) = allowing
    fun refusesEverything() {
        allowing = false
    }
}

class InMemoryProducts(products: List<Product> = emptyList()) : ProductRepository {

    private val byId = products.associateBy { product -> product.id }.toMutableMap()

    override fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product> {
        val matching = byId.values.filter { product -> specification.isSatisfiedBy(product) }.sortedBy { product -> product.id }
        val startAt = if (afterProductId == null) 0 else matching.indexOfFirst { product -> product.id == afterProductId } + 1
        return matching.drop(startAt).take(size)
    }

    override fun count(specification: ProductSpecification) =
        byId.values.count { product -> specification.isSatisfiedBy(product) }

    override fun findById(productId: String) = byId[productId]

    override fun findBySlug(slug: String) = byId.values.firstOrNull { product -> product.slug == slug }

    override fun findAllByIds(productIds: List<String>) = productIds.mapNotNull { productId -> byId[productId] }

    override fun reduceStock(quantityPerProductId: Map<String, Int>) {
        quantityPerProductId.forEach { (productId, quantity) ->
            val product = requireNotNull(byId[productId])
            byId[productId] = product.withStockReducedBy(quantity)
        }
    }
}

class InMemoryCarts : CartRepository {

    private val byId = mutableMapOf<String, Cart>()

    override fun findById(cartId: String) = byId[cartId]

    override fun findByCustomerId(customerId: String) =
        byId.values.firstOrNull { cart -> cart.customerId == customerId }

    override fun save(cart: Cart): Cart {
        byId[cart.id] = cart
        return cart
    }

    override fun delete(cartId: String) {
        byId.remove(cartId)
    }
}

class InMemoryPromotions(promotions: List<Promotion> = emptyList()) : PromotionRepository {

    private val byCode = promotions.associateBy { promotion -> promotion.code.value }.toMutableMap()

    override fun findByCode(code: PromotionCode) = byCode[code.value]

    override fun save(promotion: Promotion) {
        byCode[promotion.code.value] = promotion
    }
}

class InMemoryOrders : OrderRepository {

    private val placed = mutableListOf<Order>()

    override fun save(order: Order): Order {
        placed.add(order)
        return order
    }

    override fun page(customerId: String, size: Int, afterOrderId: String?): List<Order> {
        val newestFirst = placed.filter { order -> order.customerId == customerId }.reversed()
        val startAt = if (afterOrderId == null) 0 else newestFirst.indexOfFirst { order -> order.id == afterOrderId } + 1
        return newestFirst.drop(startAt).take(size)
    }

    override fun count(customerId: String) = placed.count { order -> order.customerId == customerId }

    override fun findForCustomer(orderId: String, customerId: String) =
        placed.firstOrNull { order -> order.id == orderId && order.customerId == customerId }
}

class InMemoryCustomers(customers: List<Customer> = emptyList()) : CustomerRepository {

    private val byId = customers.associateBy { customer -> customer.id }.toMutableMap()

    override fun findById(customerId: String) = byId[customerId]

    override fun findByEmail(email: EmailAddress) = byId.values.firstOrNull { customer -> customer.email == email }

    override fun save(customer: Customer): Customer {
        byId[customer.id] = customer
        return customer
    }
}

class InMemorySessions : SessionRepository {

    private val sessions = mutableMapOf<String, Session>()

    private val tokens = mutableMapOf<String, RefreshToken>()

    override fun save(session: Session): Session {
        sessions[session.id] = session
        return session
    }

    override fun findById(sessionId: String) = sessions[sessionId]

    override fun findOpenForCustomer(customerId: String, moment: Instant) = sessions.values
        .filter { session -> session.customerId == customerId && session.isOpenAt(moment) }
        .sortedByDescending { session -> session.createdAt }

    override fun saveRefreshToken(token: RefreshToken): RefreshToken {
        tokens[token.tokenHash] = token
        return token
    }

    override fun findRefreshTokenByHash(tokenHash: String) = tokens[tokenHash]

    override fun revokeSessionAndItsTokens(sessionId: String, moment: Instant) {
        sessions[sessionId]?.let { session -> sessions[sessionId] = session.revokedAt(moment) }
        tokens.values.filter { token -> token.sessionId == sessionId }.forEach { token ->
            tokens[token.tokenHash] = token.rotatedAt(token.rotatedAt ?: moment)
        }
    }
}

class InMemoryWishlists : WishlistRepository {

    private val byOwnerId = mutableMapOf<String, Wishlist>()

    override fun findByOwnerId(ownerId: String) = byOwnerId[ownerId] ?: Wishlist.emptyFor(ownerId)

    override fun save(wishlist: Wishlist) {
        byOwnerId[wishlist.ownerId] = wishlist
    }

    override fun delete(ownerId: String) {
        byOwnerId.remove(ownerId)
    }
}

class PredictableAccessTokenIssuer : AccessTokenIssuer {

    private val issued = mutableMapOf<String, SignedInVisitor>()

    override fun issue(customerId: String, sessionId: String, moment: Instant): AccessToken {
        val value = "access-token-for-$customerId-$sessionId"
        issued[value] = SignedInVisitor(customerId, sessionId)
        return AccessToken(value, moment.plusSeconds(900))
    }

    override fun verify(token: String) = issued[token]
}

class PredictableRefreshTokenIssuer : RefreshTokenIssuer {

    private var given = 0

    override fun issue(): IssuedRefreshToken {
        given += 1
        return IssuedRefreshToken("refresh-$given", hashOf("refresh-$given"))
    }

    override fun hashOf(value: String) = "hash-of-$value"
}
```

`zappy-application/src/test/kotlin/nl/zappymart/application/catalogue/ListProductsTest.kt`

```kotlin
package nl.zappymart.application.catalogue

import kotlinx.coroutines.test.runTest
import nl.zappymart.application.InMemoryProducts
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.catalogue.ProductSpecification
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ListProductsTest {

    private val catalogue = (1..25).map { position ->
        aProduct()
            .withId("product-%02d".format(position))
            .named("Product $position")
            .withStock(if (position == 7) 0 else 5)
            .build()
    }

    private val listProducts = ListProducts(InMemoryProducts(catalogue))

    @Test
    fun `a page carries the total across every page and says whether more follow`() = runTest {
        val page = listProducts.execute(ProductSpecification.EVERYTHING, 10, null)
        assertThat(page.items).hasSize(10)
        assertThat(page.totalCount).isEqualTo(25)
        assertThat(page.hasNextPage).isTrue()
    }

    @Test
    fun `the last page says no more follow`() = runTest {
        val page = listProducts.execute(ProductSpecification.EVERYTHING, 10, "product-15")
        assertThat(page.items).hasSize(10)
        assertThat(page.hasNextPage).isFalse()
    }

    @Test
    fun `a page larger than one hundred is answered with one hundred`() = runTest {
        val page = listProducts.execute(ProductSpecification.EVERYTHING, 500, null)
        assertThat(page.items).hasSize(25)
        assertThat(page.hasNextPage).isFalse()
    }

    @Test
    fun `the in stock filter changes the total`() = runTest {
        val page = listProducts.execute(ProductSpecification.of(null, null, true), 100, null)
        assertThat(page.totalCount).isEqualTo(24)
    }

    @Test
    fun `a page of nothing is a valid answer`() = runTest {
        val page = listProducts.execute(ProductSpecification.EVERYTHING, 0, null)
        assertThat(page.items).isEmpty()
        assertThat(page.hasNextPage).isTrue()
    }
}
```

`zappy-application/src/test/kotlin/nl/zappymart/application/cart/CartUseCasesTest.kt`

```kotlin
package nl.zappymart.application.cart

import java.time.Instant
import nl.zappymart.application.AllowingRateLimiter
import nl.zappymart.application.CountingIdentifierFactory
import nl.zappymart.application.DirectUnitOfWork
import nl.zappymart.application.FixedClock
import nl.zappymart.application.InMemoryCarts
import nl.zappymart.application.InMemoryProducts
import nl.zappymart.application.InMemoryPromotions
import nl.zappymart.application.Visitor
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.promotions.PromotionRule
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class CartUseCasesTest {

    private val boatNeck = aProduct().withId("product-18").named("Boat neck").costing(985).withStock(25).build()

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    private val clock = FixedClock()

    private val carts = InMemoryCarts()

    private val products = InMemoryProducts(listOf(boatNeck, jacket))

    private val promotions = InMemoryPromotions(
        listOf(
            Promotion(
                PromotionCode.of("WELCOME10"),
                PromotionRule.Percentage(10),
                null,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2027-12-31T23:59:59Z"),
                null,
                0,
            ),
            Promotion(
                PromotionCode.of("FIVEOFF"),
                PromotionRule.FixedAmount(Money.euro(500)),
                Money.euro(2500),
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2027-12-31T23:59:59Z"),
                null,
                0,
            ),
        ),
    )

    private val identifiers = CountingIdentifierFactory()

    private val unitOfWork = DirectUnitOfWork()

    private val cartPromotion = CartPromotion(promotions, clock)

    private val visitorCart = VisitorCart(carts, clock, identifiers)

    private val addToCart = AddToCart(visitorCart, cartPromotion, carts, products, identifiers, clock, unitOfWork)

    private val applyPromotionCode = ApplyPromotionCode(visitorCart, cartPromotion, carts, unitOfWork)

    private val removeCartLine = RemoveCartLine(visitorCart, cartPromotion, carts, clock, unitOfWork)

    private val viewCart = ViewCart(visitorCart, cartPromotion)

    private val rateLimiter = AllowingRateLimiter()

    @Test
    fun `a visitor without a cart gets an empty one`() {
        val cart = viewCart.execute(Visitor.ANONYMOUS)
        assertThat(cart.lines).isEmpty()
        assertThat(cart.total).isEqualTo(Money.NOTHING)
    }

    @Test
    fun `adding a product the store does not sell is refused`() {
        val change = addToCart.execute(Visitor.ANONYMOUS, "product-99", 1)
        assertThat(change.errors.map { error -> error.code }).containsExactly(UserErrorCode.PRODUCT_NOT_FOUND)
    }

    @Test
    fun `adding above the stock answers how many are available`() {
        val change = addToCart.execute(Visitor.ANONYMOUS, "product-03", 9)
        assertThat(change.errors.map { error -> error.code }).containsExactly(UserErrorCode.OUT_OF_STOCK)
        assertThat(change.availableStock).isEqualTo(8)
    }

    @Test
    fun `a promotion code follows the cart when a line changes`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-03", 1)
        val visitor = Visitor(null, null, started.cart.id)
        val applied = applyPromotionCode.execute(visitor, "welcome10")
        assertThat(applied.cart.discount).isEqualTo(Money.euro(560))

        val grown = addToCart.execute(visitor, "product-03", 1)
        assertThat(grown.cart.subtotal).isEqualTo(Money.euro(11198))
        assertThat(grown.cart.discount).isEqualTo(Money.euro(1120))
        assertThat(grown.cart.total).isEqualTo(Money.euro(10078))
    }

    @Test
    fun `a code that no longer holds leaves the cart when the cart shrinks`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-18", 3)
        val visitor = Visitor(null, null, started.cart.id)
        assertThat(applyPromotionCode.execute(visitor, "FIVEOFF").errors).isEmpty()

        val lineId = started.cart.lines.first().id
        val emptied = removeCartLine.execute(visitor, lineId)
        assertThat(emptied.cart.promotion).isNull()
        assertThat(emptied.cart.promotionCode).isNull()
        assertThat(emptied.cart.total).isEqualTo(Money.NOTHING)
    }

    @Test
    fun `applying a second code replaces the first`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-03", 1)
        val visitor = Visitor(null, null, started.cart.id)
        applyPromotionCode.execute(visitor, "WELCOME10")
        val replaced = applyPromotionCode.execute(visitor, "FIVEOFF")
        assertThat(replaced.cart.promotion?.code?.value).isEqualTo("FIVEOFF")
        assertThat(replaced.cart.discount).isEqualTo(Money.euro(500))
    }

    @Test
    fun `an unknown code leaves the cart as it was`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-03", 1)
        val visitor = Visitor(null, null, started.cart.id)
        applyPromotionCode.execute(visitor, "WELCOME10")
        val refused = applyPromotionCode.execute(visitor, "NOSUCHCODE")
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CODE_UNKNOWN)
        assertThat(refused.cart.promotion?.code?.value).isEqualTo("WELCOME10")
    }

    @Test
    fun `an anonymous cart moves to the customer on sign in`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-18", 2)
        val visitor = Visitor(null, null, started.cart.id)
        val moved = visitorCart.moveToCustomer(visitor, "customer-01")
        assertThat(moved.customerId).isEqualTo("customer-01")
        assertThat(moved.lines).hasSize(1)
        assertThat(carts.findByCustomerId("customer-01")?.subtotal).isEqualTo(Money.euro(1970))
        assertThat(rateLimiter.allows("anything")).isTrue()
    }

    @Test
    fun `two carts merge into one on sign in`() {
        val customerVisitor = Visitor("customer-01", "session-01", null)
        addToCart.execute(customerVisitor, "product-03", 1)
        val anonymous = addToCart.execute(Visitor.ANONYMOUS, "product-18", 2)

        val merged = visitorCart.moveToCustomer(Visitor(null, null, anonymous.cart.id), "customer-01")
        assertThat(merged.lines.map { line -> line.product.id }).containsExactlyInAnyOrder("product-03", "product-18")
        assertThat(carts.findById(anonymous.cart.id)).isNull()
    }
}
```

`zappy-application/src/test/kotlin/nl/zappymart/application/ordering/PlaceOrderTest.kt`

```kotlin
package nl.zappymart.application.ordering

import java.time.Instant
import nl.zappymart.application.CountingIdentifierFactory
import nl.zappymart.application.DirectUnitOfWork
import nl.zappymart.application.FixedClock
import nl.zappymart.application.FixedOrderNumberFactory
import nl.zappymart.application.InMemoryCarts
import nl.zappymart.application.InMemoryCustomers
import nl.zappymart.application.InMemoryOrders
import nl.zappymart.application.InMemoryProducts
import nl.zappymart.application.InMemoryPromotions
import nl.zappymart.application.RecordingEventPublisher
import nl.zappymart.application.RecordingMailer
import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.AddToCart
import nl.zappymart.application.cart.ApplyPromotionCode
import nl.zappymart.application.cart.CartPromotion
import nl.zappymart.application.cart.ViewCart
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.promotions.CountPromotionUse
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.promotions.PromotionRule
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class PlaceOrderTest {

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    private val clock = FixedClock()

    private val carts = InMemoryCarts()

    private val products = InMemoryProducts(listOf(jacket))

    private val orders = InMemoryOrders()

    private val customers = InMemoryCustomers(
        listOf(
            Customer(
                "customer-01",
                EmailAddress.ofStored("jane@example.com"),
                "Jane Doe",
                PasswordHash("hash"),
                Instant.parse("2026-01-15T09:00:00Z"),
            ),
        ),
    )

    private val promotions = InMemoryPromotions(
        listOf(
            Promotion(
                PromotionCode.of("WELCOME10"),
                PromotionRule.Percentage(10),
                null,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2027-12-31T23:59:59Z"),
                null,
                0,
            ),
        ),
    )

    private val identifiers = CountingIdentifierFactory()

    private val unitOfWork = DirectUnitOfWork()

    private val events = RecordingEventPublisher()

    private val mailer = RecordingMailer()

    private val cartPromotion = CartPromotion(promotions, clock)

    private val visitorCart = VisitorCart(carts, clock, identifiers)

    private val addToCart = AddToCart(visitorCart, cartPromotion, carts, products, identifiers, clock, unitOfWork)

    private val applyPromotionCode = ApplyPromotionCode(visitorCart, cartPromotion, carts, unitOfWork)

    private val viewCart = ViewCart(visitorCart, cartPromotion)

    private val placeOrder = PlaceOrder(
        visitorCart,
        cartPromotion,
        carts,
        products,
        orders,
        identifiers,
        FixedOrderNumberFactory(),
        clock,
        unitOfWork,
        events,
    )

    private val signedIn = Visitor("customer-01", "session-01", null)

    @Test
    fun `a visitor who is not signed in cannot order`() {
        val refused = placeOrder.execute(Visitor.ANONYMOUS) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.NOT_AUTHENTICATED)
    }

    @Test
    fun `an empty cart cannot be ordered`() {
        val refused = placeOrder.execute(signedIn) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_EMPTY)
    }

    @Test
    fun `placing an order empties the cart, reserves the stock and announces itself`() {
        addToCart.execute(signedIn, "product-03", 2)
        applyPromotionCode.execute(signedIn, "WELCOME10")

        val placed = placeOrder.execute(signedIn) as Result.Success
        assertThat(placed.value.total).isEqualTo(Money.euro(10078))
        assertThat(viewCart.execute(signedIn).lines).isEmpty()
        assertThat(products.findById("product-03")?.stock).isEqualTo(6)
        assertThat(events.published).hasSize(1)
    }

    @Test
    fun `a second order from the emptied cart is refused`() {
        addToCart.execute(signedIn, "product-03", 1)
        placeOrder.execute(signedIn)
        val refused = placeOrder.execute(signedIn) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.CART_EMPTY)
    }

    @Test
    fun `the placed event counts the code and sends the confirmation`() {
        addToCart.execute(signedIn, "product-03", 1)
        applyPromotionCode.execute(signedIn, "WELCOME10")
        val placed = placeOrder.execute(signedIn) as Result.Success

        CountPromotionUse(promotions).handle(placed.value.placed())
        SendOrderConfirmation(customers, orders, mailer).handle(placed.value.placed())

        assertThat(promotions.findByCode(PromotionCode.of("WELCOME10"))?.timesUsed).isEqualTo(1)
        assertThat(mailer.sent).singleElement().satisfies({ confirmation ->
            assertThat(confirmation.recipient.value).isEqualTo("jane@example.com")
            assertThat(confirmation.orderNumber).isEqualTo("ZM-TEST-1")
        })
    }

    @Test
    fun `the order history is newest first and pages`() {
        addToCart.execute(signedIn, "product-03", 1)
        placeOrder.execute(signedIn)
        addToCart.execute(signedIn, "product-03", 1)
        placeOrder.execute(signedIn)

        val listOrders = ListOrders(orders)
        val firstPage = listOrders.execute(signedIn, 1, null)
        assertThat(firstPage.totalCount).isEqualTo(2)
        assertThat(firstPage.hasNextPage).isTrue()

        val secondPage = listOrders.execute(signedIn, 1, firstPage.items.first().id)
        assertThat(secondPage.items).hasSize(1)
        assertThat(secondPage.hasNextPage).isFalse()
        assertThat(FindOrder(orders).execute(signedIn, secondPage.items.first().id)).isNotNull()
        assertThat(FindOrder(orders).execute(Visitor.ANONYMOUS, secondPage.items.first().id)).isNull()
    }
}
```

`zappy-application/src/test/kotlin/nl/zappymart/application/accounts/AccountUseCasesTest.kt`

```kotlin
package nl.zappymart.application.accounts

import java.time.Instant
import nl.zappymart.application.AllowingRateLimiter
import nl.zappymart.application.CountingIdentifierFactory
import nl.zappymart.application.DirectUnitOfWork
import nl.zappymart.application.FixedClock
import nl.zappymart.application.InMemoryCarts
import nl.zappymart.application.InMemoryCustomers
import nl.zappymart.application.InMemoryProducts
import nl.zappymart.application.InMemoryPromotions
import nl.zappymart.application.InMemorySessions
import nl.zappymart.application.InMemoryWishlists
import nl.zappymart.application.PredictableAccessTokenIssuer
import nl.zappymart.application.PredictableRefreshTokenIssuer
import nl.zappymart.application.ReversingPasswordHasher
import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.AddToCart
import nl.zappymart.application.cart.CartPromotion
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AccountUseCasesTest {

    private val jacket = aProduct().withId("product-03").named("Cotton jacket").costing(5599).withStock(8).build()

    private val clock = FixedClock()

    private val passwords = ReversingPasswordHasher()

    private val jane = Customer(
        "customer-01",
        EmailAddress.ofStored("jane@example.com"),
        "Jane Doe",
        passwords.hash("correct horse battery staple"),
        Instant.parse("2026-01-15T09:00:00Z"),
    )

    private val customers = InMemoryCustomers(listOf(jane))

    private val sessions = InMemorySessions()

    private val carts = InMemoryCarts()

    private val wishlists = InMemoryWishlists()

    private val products = InMemoryProducts(listOf(jacket))

    private val identifiers = CountingIdentifierFactory()

    private val unitOfWork = DirectUnitOfWork()

    private val accessTokens = PredictableAccessTokenIssuer()

    private val refreshTokens = PredictableRefreshTokenIssuer()

    private val rateLimiter = AllowingRateLimiter()

    private val visitorCart = VisitorCart(carts, clock, identifiers)

    private val cartPromotion = CartPromotion(InMemoryPromotions(), clock)

    private val addToCart = AddToCart(visitorCart, cartPromotion, carts, products, identifiers, clock, unitOfWork)

    private val wishlistOwner = WishlistOwner(wishlists, visitorCart, carts)

    private val viewWishlist = ViewWishlist(wishlists, products, wishlistOwner)

    private val addToWishlist = AddToWishlist(wishlists, products, viewWishlist, wishlistOwner, unitOfWork)

    private val removeFromWishlist = RemoveFromWishlist(wishlists, viewWishlist, wishlistOwner, unitOfWork)

    private val signIn = SignIn(sessions, accessTokens, refreshTokens, identifiers, clock)

    private val logInCustomer =
        LogInCustomer(customers, passwords, signIn, visitorCart, wishlistOwner, rateLimiter, unitOfWork)

    private val registerCustomer = RegisterCustomer(
        customers,
        passwords,
        identifiers,
        clock,
        signIn,
        visitorCart,
        wishlistOwner,
        rateLimiter,
        unitOfWork,
    )

    private val refreshSession =
        RefreshSession(sessions, customers, accessTokens, refreshTokens, clock, unitOfWork)

    private val logOut = LogOut(sessions, refreshTokens, clock, unitOfWork)

    private val revokeSession = RevokeSession(sessions, clock, unitOfWork)

    private val identifyVisitor = IdentifyVisitor(accessTokens, sessions, clock)

    @Test
    fun `a login with the seed password opens a session`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("JANE@Example.com", "correct horse battery staple", "Chrome on Windows"),
        ) as Result.Success
        assertThat(signedIn.value.customer.id).isEqualTo("customer-01")
        assertThat(sessions.findById(signedIn.value.sessionId)?.device).isEqualTo("Chrome on Windows")
    }

    @Test
    fun `a wrong password answers one code and never says whether the address exists`() {
        val wrongPassword = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "not the right password", "Chrome"),
        ) as Result.Refused
        val unknownAddress = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("nobody@example.com", "not the right password", "Chrome"),
        ) as Result.Refused
        assertThat(wrongPassword.errors).isEqualTo(unknownAddress.errors)
        assertThat(wrongPassword.errors.map { error -> error.code })
            .containsExactly(UserErrorCode.CREDENTIALS_INVALID)
    }

    @Test
    fun `too many attempts are rate limited`() {
        rateLimiter.refusesEverything()
        val refused = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.RATE_LIMITED)
    }

    @Test
    fun `registering with a taken address is refused`() {
        val refused = registerCustomer.execute(
            Visitor.ANONYMOUS,
            RegistrationRequest("jane@example.com", "Jane", "a long enough password", "Chrome"),
        ) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.EMAIL_TAKEN)
    }

    @Test
    fun `registering signs the new customer in and takes the cart along`() {
        val started = addToCart.execute(Visitor.ANONYMOUS, "product-03", 1)
        val visitor = Visitor(null, null, started.cart.id)
        val registered = registerCustomer.execute(
            visitor,
            RegistrationRequest("  NEW@Example.com ", "New Customer", "a long enough password", "Chrome"),
        ) as Result.Success
        assertThat(registered.value.customer.email.value).isEqualTo("new@example.com")
        assertThat(carts.findByCustomerId(registered.value.customer.id)?.lines).hasSize(1)
    }

    @Test
    fun `a refresh token is used once and a replay revokes the session`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Success
        val firstToken = signedIn.value.refreshToken

        val refreshed = refreshSession.execute(firstToken) as Result.Success
        assertThat(refreshed.value.refreshToken).isNotEqualTo(firstToken)

        val replayed = refreshSession.execute(firstToken) as Result.Refused
        assertThat(replayed.errors.map { error -> error.code }).containsExactly(UserErrorCode.SESSION_INVALID)

        val afterTheReplay = refreshSession.execute(refreshed.value.refreshToken) as Result.Refused
        assertThat(afterTheReplay.errors.map { error -> error.code }).containsExactly(UserErrorCode.SESSION_INVALID)
    }

    @Test
    fun `a refresh without a token is refused`() {
        val refused = refreshSession.execute(null) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.SESSION_INVALID)
    }

    @Test
    fun `a logged out session is refused on the next bearer request`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Success
        val bearer = signedIn.value.accessToken.value
        assertThat(identifyVisitor.execute(bearer, null).customerId).isEqualTo("customer-01")

        logOut.execute(Visitor("customer-01", signedIn.value.sessionId, null), signedIn.value.refreshToken)
        assertThat(identifyVisitor.execute(bearer, null).customerId).isNull()
    }

    @Test
    fun `logging out twice answers the same`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Success
        val visitor = Visitor("customer-01", signedIn.value.sessionId, null)
        assertThat(logOut.execute(visitor, signedIn.value.refreshToken)).isTrue()
        assertThat(logOut.execute(visitor, signedIn.value.refreshToken)).isTrue()
    }

    @Test
    fun `revoking a session that belongs to somebody else is refused`() {
        val signedIn = logInCustomer.execute(
            Visitor.ANONYMOUS,
            LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"),
        ) as Result.Success
        val refused = revokeSession.execute(
            Visitor("customer-01", signedIn.value.sessionId, null),
            "a-session-of-somebody-else",
        ) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.SESSION_NOT_FOUND)
    }

    @Test
    fun `an anonymous wishlist lives against the cart cookie and merges on login`() {
        val saved = addToWishlist.execute(Visitor.ANONYMOUS, "product-03")
        assertThat(saved.errors).isEmpty()
        assertThat(saved.products.map { product -> product.id }).containsExactly("product-03")
        val anonymousCartId = requireNotNull(saved.anonymousCartId)

        val visitor = Visitor(null, null, anonymousCartId)
        assertThat(viewWishlist.execute(visitor).map { product -> product.id }).containsExactly("product-03")

        logInCustomer.execute(visitor, LoginRequest("jane@example.com", "correct horse battery staple", "Chrome"))
        val asCustomer = Visitor("customer-01", "session-01", anonymousCartId)
        assertThat(viewWishlist.execute(asCustomer).map { product -> product.id }).containsExactly("product-03")
    }

    @Test
    fun `saving an unknown product to a wishlist is refused`() {
        val refused = addToWishlist.execute(Visitor.ANONYMOUS, "product-99")
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.PRODUCT_NOT_FOUND)
    }

    @Test
    fun `removing a product that is not on the wishlist is not an error`() {
        val change = removeFromWishlist.execute(Visitor.ANONYMOUS, "product-03")
        assertThat(change.errors).isEmpty()
        assertThat(change.products).isEmpty()
    }

    @Test
    fun `an unknown bearer token leaves the visitor anonymous`() {
        assertThat(identifyVisitor.execute("not-a-token", "cart-01"))
            .isEqualTo(Visitor(null, null, "cart-01"))
        assertThat(FindSignedInCustomer(customers).execute(Visitor.ANONYMOUS)).isNull()
        assertThat(ListSessions(sessions, clock).execute("customer-01")).isEmpty()
    }
}
```

`zappy-adapters/src/test/kotlin/nl/zappymart/adapters/graphql/GraphQlSupportTest.kt`

```kotlin
package nl.zappymart.adapters.graphql

import graphql.GraphQLContext
import graphql.execution.CoercedVariables
import graphql.language.StringValue
import graphql.schema.CoercingParseLiteralException
import graphql.schema.CoercingSerializeException
import java.time.Instant
import java.util.Locale
import nl.zappymart.application.Visitor
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class GraphQlSupportTest {

    private val coercing = DateTimeScalar.TYPE.coercing

    @Test
    fun `a cursor hides the id it carries and gives it back`() {
        val cursor = Cursors.of("product-01")
        assertThat(cursor).isNotEqualTo("product-01")
        assertThat(Cursors.idOf(cursor)).isEqualTo("product-01")
    }

    @Test
    fun `a cursor that is missing or malformed reads as no cursor at all`() {
        assertThat(Cursors.idOf(null)).isNull()
        assertThat(Cursors.idOf("  ")).isNull()
        assertThat(Cursors.idOf("not base sixty four!!")).isNull()
    }

    @Test
    fun `a moment is written in UTC with second precision`() {
        val serialised = coercing.serialize(
            Instant.parse("2026-09-09T14:30:00.123456Z"),
            GraphQLContext.getDefault(),
            Locale.ENGLISH,
        )
        assertThat(serialised).isEqualTo("2026-09-09T14:30:00Z")
    }

    @Test
    fun `a moment is read from a literal and from a variable`() {
        val moment = Instant.parse("2026-09-09T14:30:00Z")
        assertThat(
            coercing.parseLiteral(
                StringValue.of("2026-09-09T14:30:00Z"),
                CoercedVariables.emptyVariables(),
                GraphQLContext.getDefault(),
                Locale.ENGLISH,
            ),
        ).isEqualTo(moment)
        assertThat(coercing.parseValue("2026-09-09T14:30:00Z", GraphQLContext.getDefault(), Locale.ENGLISH))
            .isEqualTo(moment)
    }

    @Test
    fun `something that is not a moment is refused`() {
        assertThatThrownBy {
            coercing.serialize(42, GraphQLContext.getDefault(), Locale.ENGLISH)
        }.isInstanceOf(CoercingSerializeException::class.java)
        assertThatThrownBy {
            coercing.parseLiteral(
                graphql.language.IntValue.of(42),
                CoercedVariables.emptyVariables(),
                GraphQLContext.getDefault(),
                Locale.ENGLISH,
            )
        }.isInstanceOf(CoercingParseLiteralException::class.java)
    }

    @Test
    fun `signing in writes the refresh cookie and signing out clears it`() {
        val context = RequestContext(Visitor.ANONYMOUS, null, "Chrome", Cookies(SecurityProperties()))
        context.signedIn("customer-01", "session-01", "a-refresh-token")
        assertThat(context.visitor.customerId).isEqualTo("customer-01")
        assertThat(context.cookiesToSet()).singleElement().satisfies({ cookie ->
            assertThat(cookie).contains("zappy_refresh=a-refresh-token")
            assertThat(cookie).contains("HttpOnly")
            assertThat(cookie).contains("Secure")
            assertThat(cookie).contains("SameSite=Lax")
            assertThat(cookie).contains("Path=/graphql")
        })

        context.signedOut()
        assertThat(context.visitor.customerId).isNull()
        assertThat(context.cookiesToSet().last()).contains("Max-Age=0")
    }

    @Test
    fun `a cart cookie is written once for a cart the visitor did not have`() {
        val context = RequestContext(Visitor(null, null, "cart-01"), null, "Chrome", Cookies(SecurityProperties()))
        context.remembersCart("cart-01")
        assertThat(context.cookiesToSet()).isEmpty()

        context.remembersCart("cart-02")
        assertThat(context.cookiesToSet()).singleElement().satisfies({ cookie ->
            assertThat(cookie).contains("zappy_cart=cart-02")
            assertThat(cookie).contains("Path=/")
        })
    }

    @Test
    fun `cookies without the secure flag are for a plain http development host`() {
        val cookie = Cookies(SecurityProperties(cookiesSecure = false)).cart("cart-01")
        assertThat(cookie).doesNotContain("Secure")
    }
}
```

`zappy-adapters/src/test/kotlin/nl/zappymart/adapters/security/SecurityAdaptersTest.kt`

```kotlin
package nl.zappymart.adapters.security

import java.time.Instant
import nl.zappymart.adapters.identifiers.DatedOrderNumberFactory
import nl.zappymart.adapters.identifiers.RandomIdentifierFactory
import nl.zappymart.adapters.time.SystemClock
import nl.zappymart.application.ports.Clock
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class SecurityAdaptersTest {

    @Test
    fun `a password is hashed with argon2id and never stored in clear`() {
        val hasher = Argon2PasswordHasher()
        val hash = hasher.hash("correct horse battery staple")
        assertThat(hash.value).startsWith("\$argon2id\$")
        assertThat(hash.value).doesNotContain("correct horse")
        assertThat(hasher.matches("correct horse battery staple", hash)).isTrue()
        assertThat(hasher.matches("something else entirely", hash)).isFalse()
    }

    @Test
    fun `the same password hashes differently every time`() {
        val hasher = Argon2PasswordHasher()
        assertThat(hasher.hash("a long enough password").value)
            .isNotEqualTo(hasher.hash("a long enough password").value)
    }

    @Test
    fun `an access token carries the customer and the session and nothing personal`() {
        val issuer = JsonWebTokenIssuer()
        val moment = Instant.parse("2026-09-09T10:00:00Z")
        val issued = issuer.issue("customer-01", "session-01", moment)
        assertThat(issued.expiresAt).isEqualTo(moment.plusSeconds(900))
        assertThat(issuer.verify(issued.value)?.customerId).isEqualTo("customer-01")
        assertThat(issuer.verify(issued.value)?.sessionId).isEqualTo("session-01")
    }

    @Test
    fun `a token from another issuer or a broken one is refused`() {
        val issuer = JsonWebTokenIssuer()
        val other = JsonWebTokenIssuer()
        val moment = Instant.parse("2026-09-09T10:00:00Z")
        assertThat(issuer.verify(other.issue("customer-01", "session-01", moment).value)).isNull()
        assertThat(issuer.verify("not a token at all")).isNull()
    }

    @Test
    fun `an expired token is refused`() {
        val issuer = JsonWebTokenIssuer()
        val longAgo = Instant.parse("2020-01-01T10:00:00Z")
        assertThat(issuer.verify(issuer.issue("customer-01", "session-01", longAgo).value)).isNull()
    }

    @Test
    fun `a refresh token is random and is stored only as a hash`() {
        val issuer = RandomRefreshTokenIssuer()
        val first = issuer.issue()
        val second = issuer.issue()
        assertThat(first.value).isNotEqualTo(second.value)
        assertThat(first.tokenHash).isNotEqualTo(first.value)
        assertThat(issuer.hashOf(first.value)).isEqualTo(first.tokenHash)
        assertThat(first.tokenHash).hasSize(64)
    }

    @Test
    fun `an identifier is unique per call`() {
        val identifiers = RandomIdentifierFactory()
        assertThat(identifiers.next()).isNotEqualTo(identifiers.next())
    }

    @Test
    fun `an order number carries the day it was placed`() {
        val number = DatedOrderNumberFactory().next(Instant.parse("2026-09-09T10:00:00Z"))
        assertThat(number).startsWith("ZM-20260909-")
        assertThat(number).hasSize(18)
    }

    @Test
    fun `the rate limiter lets a burst through and then holds the rest back`() {
        val standingStill = object : Clock {
            override fun moment(): Instant = Instant.parse("2026-09-09T10:00:00Z")
        }
        val limiter = InMemoryRateLimiter(standingStill)
        repeat(20) { attempt -> assertThat(limiter.allows("login:jane@example.com")).isTrue() }
        assertThat(limiter.allows("login:jane@example.com")).isFalse()
        assertThat(limiter.allows("login:somebody-else@example.com")).isTrue()
        limiter.forget()
        assertThat(limiter.allows("login:jane@example.com")).isTrue()
    }

    @Test
    fun `the system clock keeps every digit, so two logins in one second still sort`() {
        val clock = SystemClock()
        val earlier = clock.moment()
        val later = clock.moment()
        assertThat(earlier).isBeforeOrEqualTo(later)
        assertThat(later).isAfter(Instant.parse("2026-01-01T00:00:00Z"))
    }
}
```

`zappy-adapters/src/test/kotlin/nl/zappymart/adapters/persistence/CachedProductRepositoryTest.kt`

```kotlin
package nl.zappymart.adapters.persistence

import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class CachedProductRepositoryTest {

    private class CountingProductRepository : ProductRepository {

        var pagesRead = 0
        var countsRead = 0
        var singleProductsRead = 0

        private val catalogue = listOf(aProduct().withId("product-01").named("Cotton jacket").build())

        override fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product> {
            pagesRead += 1
            return catalogue
        }

        override fun count(specification: ProductSpecification): Int {
            countsRead += 1
            return catalogue.size
        }

        override fun findById(productId: String): Product? {
            singleProductsRead += 1
            return catalogue.firstOrNull { product -> product.id == productId }
        }

        override fun findBySlug(slug: String): Product? {
            singleProductsRead += 1
            return catalogue.firstOrNull { product -> product.slug == slug }
        }

        override fun findAllByIds(productIds: List<String>): List<Product> {
            singleProductsRead += 1
            return catalogue.filter { product -> productIds.contains(product.id) }
        }

        override fun reduceStock(quantityPerProductId: Map<String, Int>) = Unit
    }

    private val catalogue = CountingProductRepository()

    private val cached = CachedProductRepository(catalogue)

    @Test
    fun `a page is read once and answered from the cache after that`() {
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        assertThat(catalogue.pagesRead).isEqualTo(1)
    }

    @Test
    fun `a different page is a different question`() {
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        cached.page(ProductSpecification.EVERYTHING, 5, "product-01")
        cached.page(ProductSpecification.of("jewellery", null, null), 5, null)
        assertThat(catalogue.pagesRead).isEqualTo(3)
    }

    @Test
    fun `a count is read once and answered from the cache after that`() {
        assertThat(cached.count(ProductSpecification.EVERYTHING)).isEqualTo(1)
        assertThat(cached.count(ProductSpecification.EVERYTHING)).isEqualTo(1)
        assertThat(catalogue.countsRead).isEqualTo(1)
    }

    @Test
    fun `reserving stock makes the cache read the catalogue again`() {
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        cached.reduceStock(mapOf("product-01" to 1))
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        assertThat(catalogue.pagesRead).isEqualTo(2)
    }

    @Test
    fun `one product is never answered from the cache, because its stock has to be fresh`() {
        cached.findById("product-01")
        cached.findById("product-01")
        cached.findBySlug("cotton-jacket")
        cached.findAllByIds(listOf("product-01"))
        assertThat(catalogue.singleProductsRead).isEqualTo(4)
    }
}
```

`zappy-host/src/test/kotlin/nl/zappymart/host/StoreClient.kt`

```kotlin
package nl.zappymart.host

import java.net.CookieManager
import java.net.CookiePolicy
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper

class StoreClient(private val port: Int, private val origin: String? = "http://localhost:5173") {

    private val cookies = CookieManager(null, CookiePolicy.ACCEPT_ALL)

    private val http: HttpClient = HttpClient.newBuilder().cookieHandler(cookies).build()

    private val json = JsonMapper.builder().build()

    var accessToken: String? = null
        private set

    fun ask(document: String): JsonNode {
        val body = json.writeValueAsString(mapOf("query" to document))
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port/graphql"))
            .header("Content-Type", "application/json")
            .apply { origin?.let { allowed -> header("Origin", allowed) } }
            .apply { accessToken?.let { token -> header("Authorization", "Bearer $token") } }
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()
        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        return json.readTree(response.body())
    }

    fun data(document: String, path: String): JsonNode {
        val answer = ask(document)
        check(answer.get("errors") == null) { "The store answered with errors: ${answer.get("errors")}" }
        return path.split(".").fold(requireNotNull(answer.get("data"))) { node, step ->
            requireNotNull(node.get(step)) { "There is no $step in $node" }
        }
    }

    fun texts(document: String, path: String, field: String): List<String> =
        data(document, path).values().map { node -> node.get(field).asString() }

    fun signsIn(email: String, password: String) {
        val payload = data(
            """mutation { login(input: {email: "$email", password: "$password", device: "Chrome on Windows"}) """ +
                """{ accessToken errors { code } } }""",
            "login",
        )
        accessToken = payload.get("accessToken").asString()
    }

    fun signsOut() {
        accessToken = null
    }

    fun refreshTokenCookie(): String? = cookies.cookieStore.cookies
        .firstOrNull { cookie -> cookie.name == "zappy_refresh" }
        ?.value

    fun cartCookie(): String? = cookies.cookieStore.cookies
        .firstOrNull { cookie -> cookie.name == "zappy_cart" }
        ?.value

    fun withoutOrigin() = StoreClient(port, null)
}
```

`zappy-host/src/test/kotlin/nl/zappymart/host/StoreIntegrationTest.kt`

```kotlin
package nl.zappymart.host

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.ActiveProfiles

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = [
        "spring.datasource.url=jdbc:h2:mem:zappy-mart-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "zappy.security.cookies-secure=false",
    ],
)
@ActiveProfiles("development")
class StoreIntegrationTest {

    @Autowired
    private lateinit var seedReset: ResetSeedController

    @LocalServerPort
    private var port: Int = 0

    private lateinit var store: StoreClient

    @BeforeEach
    fun startFromTheSeed() {
        store = StoreClient(port)
        assertThat(seedReset.resetSeed().loadedProducts).isEqualTo(TWENTY_PRODUCTS)
    }

    @Test
    fun `the catalogue answers in the seed order and pages forward`() {
        val page = store.data(
            "{ products(first: 3) { totalCount pageInfo { hasNextPage endCursor } " +
                "edges { cursor node { id slug price { amount currency } category { slug } } } } }",
            "products",
        )
        assertThat(page.get("totalCount").asInt()).isEqualTo(TWENTY_PRODUCTS)
        val firstThree: List<String> = page.get("edges").values().map { edge -> edge.get("node").get("id").asString() }
        assertThat(firstThree).containsExactly("product-01", "product-02", "product-03")
        assertThat(page.get("pageInfo").get("hasNextPage").asBoolean()).isTrue()

        val nextCursor = page.get("pageInfo").get("endCursor").asString()
        val second = store.data("{ products(first: 2, after: \"$nextCursor\") { edges { node { id } } } }", "products")
        val nextTwo: List<String> = second.get("edges").values().map { edge -> edge.get("node").get("id").asString() }
        assertThat(nextTwo).containsExactly("product-04", "product-05")
    }

    @Test
    fun `the in stock filter leaves out the product with no stock`() {
        val everything = store.data("{ products(first: 1) { totalCount } }", "products")
        val inStock = store.data("{ products(filter: {inStockOnly: true}, first: 1) { totalCount } }", "products")
        assertThat(everything.get("totalCount").asInt()).isEqualTo(TWENTY_PRODUCTS)
        assertThat(inStock.get("totalCount").asInt()).isEqualTo(TWENTY_PRODUCTS - 1)
    }

    @Test
    fun `the four categories come back in the seed order`() {
        assertThat(store.texts("{ categories { slug } }", "categories", "slug"))
            .containsExactly("mens-clothing", "jewellery", "electronics", "womens-clothing")
    }

    @Test
    fun `a product is found by its slug and an unknown slug answers null`() {
        val product = store.data("{ product(slug: \"mens-cotton-jacket\") { id price { amount } stock } }", "product")
        assertThat(product.get("id").asString()).isEqualTo("product-03")
        assertThat(product.get("price").get("amount").asInt()).isEqualTo(5599)
        assertThat(store.ask("{ product(slug: \"nothing-here\") { id } }").get("data").get("product").isNull).isTrue()
    }

    @Test
    fun `an empty cart pays nothing at all`() {
        val cart = store.data(
            "{ cart { lines { id } subtotal { amount } shipping { amount } total { amount } } }",
            "cart",
        )
        assertThat(cart.get("lines")).isEmpty()
        assertThat(cart.get("total").get("amount").asInt()).isZero()
    }

    @Test
    fun `the worked totals of the seed hold over the wire`() {
        val withoutCode = store.data(
            "mutation { addToCart(productId: \"product-18\", quantity: 2) " +
                "{ cart { subtotal { amount } shipping { amount } total { amount } } errors { code } } }",
            "addToCart.cart",
        )
        assertThat(withoutCode.get("subtotal").get("amount").asInt()).isEqualTo(1970)
        assertThat(withoutCode.get("shipping").get("amount").asInt()).isEqualTo(495)
        assertThat(withoutCode.get("total").get("amount").asInt()).isEqualTo(2465)

        val freeShipping = store.data(
            "mutation { applyPromotionCode(code: \"freeship\") " +
                "{ cart { shipping { amount } total { amount } promotion { code kind discount { amount } } } } }",
            "applyPromotionCode.cart",
        )
        assertThat(freeShipping.get("shipping").get("amount").asInt()).isZero()
        assertThat(freeShipping.get("total").get("amount").asInt()).isEqualTo(1970)
        assertThat(freeShipping.get("promotion").get("code").asString()).isEqualTo("FREESHIP")
        assertThat(freeShipping.get("promotion").get("kind").asString()).isEqualTo("FREE_SHIPPING")
        assertThat(freeShipping.get("promotion").get("discount").get("amount").asInt()).isZero()
    }

    @Test
    fun `a percentage code rounds half up and a large cart pays no shipping`() {
        store.data("mutation { addToCart(productId: \"product-03\") { errors { code } } }", "addToCart")
        val cart = store.data(
            "mutation { applyPromotionCode(code: \"WELCOME10\") " +
                "{ cart { subtotal { amount } shipping { amount } total { amount } promotion { discount { amount } } } } }",
            "applyPromotionCode.cart",
        )
        assertThat(cart.get("subtotal").get("amount").asInt()).isEqualTo(5599)
        assertThat(cart.get("shipping").get("amount").asInt()).isZero()
        assertThat(cart.get("promotion").get("discount").get("amount").asInt()).isEqualTo(560)
        assertThat(cart.get("total").get("amount").asInt()).isEqualTo(5039)
    }

    @Test
    fun `every refusal a promotion code can give comes back as a user error`() {
        store.data("mutation { addToCart(productId: \"product-18\", quantity: 2) { errors { code } } }", "addToCart")
        assertThat(codeOfFirstError("SUMMER2025")).isEqualTo("CODE_EXPIRED")
        assertThat(codeOfFirstError("ONCE")).isEqualTo("CODE_EXHAUSTED")
        assertThat(codeOfFirstError("NOTHINGATALL")).isEqualTo("CODE_UNKNOWN")
        assertThat(codeOfFirstError("FIVEOFF")).isEqualTo("CODE_MINIMUM_NOT_MET")
    }

    @Test
    fun `the product with no stock cannot go into a cart`() {
        val payload = store.data(
            "mutation { addToCart(productId: \"product-07\") { availableStock errors { code message } } }",
            "addToCart",
        )
        assertThat(payload.get("errors").first().get("code").asString()).isEqualTo("OUT_OF_STOCK")
        assertThat(payload.get("availableStock").asInt()).isZero()
    }

    @Test
    fun `the last item can be taken once and no more`() {
        store.data("mutation { addToCart(productId: \"product-12\") { errors { code } } }", "addToCart")
        val second = store.data(
            "mutation { addToCart(productId: \"product-12\") { availableStock errors { code } } }",
            "addToCart",
        )
        assertThat(second.get("errors").first().get("code").asString()).isEqualTo("OUT_OF_STOCK")
        assertThat(second.get("availableStock").asInt()).isEqualTo(1)
    }

    @Test
    fun `a cart line is changed and removed by its own id`() {
        val cart = store.data(
            "mutation { addToCart(productId: \"product-18\", quantity: 2) { cart { lines { id } } } }",
            "addToCart.cart",
        )
        val lineId = cart.get("lines").first().get("id").asString()

        val refusedQuantity = store.data(
            "mutation { changeCartLineQuantity(lineId: \"$lineId\", quantity: 0) { errors { code field } } }",
            "changeCartLineQuantity",
        )
        assertThat(refusedQuantity.get("errors").first().get("code").asString()).isEqualTo("QUANTITY_INVALID")

        val changed = store.data(
            "mutation { changeCartLineQuantity(lineId: \"$lineId\", quantity: 3) " +
                "{ cart { subtotal { amount } } errors { code } } }",
            "changeCartLineQuantity.cart",
        )
        assertThat(changed.get("subtotal").get("amount").asInt()).isEqualTo(2955)

        val emptied = store.data(
            "mutation { removeCartLine(lineId: \"$lineId\") { cart { lines { id } total { amount } } } }",
            "removeCartLine.cart",
        )
        assertThat(emptied.get("lines")).isEmpty()
        assertThat(emptied.get("total").get("amount").asInt()).isZero()

        val gone = store.data(
            "mutation { removeCartLine(lineId: \"$lineId\") { errors { code field } } }",
            "removeCartLine",
        )
        assertThat(gone.get("errors").first().get("code").asString()).isEqualTo("CART_LINE_NOT_FOUND")
    }

    @Test
    fun `the cart cookie is set on the first cart mutation and carries the cart`() {
        assertThat(store.cartCookie()).isNull()
        val first = store.data(
            "mutation { addToCart(productId: \"product-18\") { cart { id } } }",
            "addToCart.cart",
        )
        assertThat(store.cartCookie()).isEqualTo(first.get("id").asString())

        val readBack = store.data("{ cart { id lines { quantity } } }", "cart")
        assertThat(readBack.get("id").asString()).isEqualTo(first.get("id").asString())
        assertThat(readBack.get("lines")).hasSize(1)
    }

    @Test
    fun `a mutation without an allowed origin never reaches the resolver`() {
        val refused = store.withoutOrigin().ask("mutation { addToCart(productId: \"product-18\") { cart { id } } }")
        assertThat(refused.get("data")).isNull()
        assertThat(refused.get("errors").first().get("extensions").get("classification").asString())
            .isEqualTo("FORBIDDEN")

        val foreign = StoreClient(port, "http://evil.example")
            .ask("mutation { addToCart(productId: \"product-18\") { cart { id } } }")
        assertThat(foreign.get("errors").first().get("message").asString()).contains("Origin")
    }

    @Test
    fun `a query without an origin is answered as usual`() {
        val categories = store.withoutOrigin().data("{ categories { slug } }", "categories")
        assertThat(categories).hasSize(4)
    }

    @Test
    fun `the anonymous cart and wishlist move to the customer on login`() {
        store.data("mutation { addToCart(productId: \"product-18\", quantity: 2) { cart { id } } }", "addToCart.cart")
        store.data("mutation { addToWishlist(productId: \"product-03\") { products { id } } }", "addToWishlist")

        store.signsIn("jane@example.com", "correct horse battery staple")

        val customer = store.data("{ me { id email name wishlist { id } } }", "me")
        assertThat(customer.get("email").asString()).isEqualTo("jane@example.com")
        val saved: List<String> = customer.get("wishlist").values().map { product -> product.get("id").asString() }
        assertThat(saved).containsExactly("product-03")
        assertThat(store.data("{ cart { lines { quantity } } }", "cart").get("lines")).hasSize(1)
    }

    @Test
    fun `an order keeps the totals of the moment, empties the cart and reserves the stock`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        store.data("mutation { addToCart(productId: \"product-03\", quantity: 2) { cart { id } } }", "addToCart.cart")
        store.data("mutation { applyPromotionCode(code: \"WELCOME10\") { cart { id } } }", "applyPromotionCode.cart")

        val order = store.data(
            "mutation { placeOrder(idempotencyKey: \"a-checkout-attempt\") { order { id number status " +
                "subtotal { amount } discount { amount } shipping { amount } total { amount } promotionCode " +
                "lines { productName quantity unitPrice { amount } lineTotal { amount } } placedAt } " +
                "errors { code } } }",
            "placeOrder.order",
        )
        assertThat(order.get("status").asString()).isEqualTo("PAID")
        assertThat(order.get("subtotal").get("amount").asInt()).isEqualTo(11198)
        assertThat(order.get("discount").get("amount").asInt()).isEqualTo(1120)
        assertThat(order.get("shipping").get("amount").asInt()).isZero()
        assertThat(order.get("total").get("amount").asInt()).isEqualTo(10078)
        assertThat(order.get("promotionCode").asString()).isEqualTo("WELCOME10")
        assertThat(order.get("placedAt").asString()).endsWith("Z")
        assertThat(order.get("lines").first().get("productName").asString()).isEqualTo("Mens Cotton Jacket")

        assertThat(store.data("{ cart { lines { id } } }", "cart").get("lines")).isEmpty()
        assertThat(store.data("{ product(slug: \"mens-cotton-jacket\") { stock } }", "product").get("stock").asInt())
            .isEqualTo(6)

        val orderId = order.get("id").asString()
        val readBack = store.data("{ order(id: \"$orderId\") { number total { amount } } }", "order")
        assertThat(readBack.get("total").get("amount").asInt()).isEqualTo(10078)

        val history = store.data("{ orders(first: 5) { totalCount edges { node { id } } } }", "orders")
        assertThat(history.get("totalCount").asInt()).isEqualTo(1)
    }

    @Test
    fun `a second checkout of the emptied cart is refused`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        store.data("mutation { addToCart(productId: \"product-03\") { cart { id } } }", "addToCart.cart")
        store.data("mutation { placeOrder { order { id } } }", "placeOrder")

        val refused = store.data("mutation { placeOrder { order { id } errors { code } } }", "placeOrder")
        assertThat(refused.get("order").isNull).isTrue()
        assertThat(refused.get("errors").first().get("code").asString()).isEqualTo("CART_EMPTY")
    }

    @Test
    fun `checking out without a customer is refused`() {
        store.data("mutation { addToCart(productId: \"product-03\") { cart { id } } }", "addToCart.cart")
        val refused = store.data("mutation { placeOrder { errors { code } } }", "placeOrder")
        assertThat(refused.get("errors").first().get("code").asString()).isEqualTo("NOT_AUTHENTICATED")
    }

    @Test
    fun `an order of another customer is not readable`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        store.data("mutation { addToCart(productId: \"product-03\") { cart { id } } }", "addToCart.cart")
        val orderId = store.data("mutation { placeOrder { order { id } } }", "placeOrder.order").get("id").asString()

        val somebodyElse = StoreClient(port)
        somebodyElse.data(
            """mutation { register(input: {email: "someone@example.com", name: "Someone", """ +
                """password: "a long enough password"}) { customer { id } } }""",
            "register",
        )
        somebodyElse.signsIn("someone@example.com", "a long enough password")
        assertThat(somebodyElse.ask("{ order(id: \"$orderId\") { id } }").get("data").get("order").isNull).isTrue()
    }

    @Test
    fun `registering refuses a taken address and a password that is too short`() {
        val taken = store.data(
            """mutation { register(input: {email: "jane@example.com", name: "Jane", """ +
                """password: "a long enough password"}) { errors { code field } } }""",
            "register",
        )
        assertThat(taken.get("errors").first().get("code").asString()).isEqualTo("EMAIL_TAKEN")

        val tooShort = store.data(
            """mutation { register(input: {email: "another@example.com", name: "Another", """ +
                """password: "short"}) { errors { code field } } }""",
            "register",
        )
        assertThat(tooShort.get("errors").first().get("code").asString()).isEqualTo("PASSWORD_TOO_SHORT")
        assertThat(tooShort.get("errors").first().get("field").asString()).isEqualTo("input.password")
    }

    @Test
    fun `a wrong password answers one code`() {
        val refused = store.data(
            """mutation { login(input: {email: "jane@example.com", password: "not the password"}) """ +
                """{ customer { id } errors { code } } }""",
            "login",
        )
        assertThat(refused.get("customer").isNull).isTrue()
        assertThat(refused.get("errors").first().get("code").asString()).isEqualTo("CREDENTIALS_INVALID")
    }

    @Test
    fun `a refresh token is used once and a replay ends the session`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        val firstToken = requireNotNull(store.refreshTokenCookie())

        val refreshed = store.data("mutation { refreshSession { accessToken errors { code } } }", "refreshSession")
        assertThat(refreshed.get("accessToken").asString()).isNotBlank()
        assertThat(store.refreshTokenCookie()).isNotEqualTo(firstToken)

        val replay = StoreClient(port)
        replay.ask("mutation { refreshSession { errors { code } } }")
        assertThat(
            store.data("mutation { refreshSession { errors { code } } }", "refreshSession").get("errors"),
        ).isEmpty()
    }

    @Test
    fun `logging out ends the session at once, even while the access token still looks valid`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        assertThat(store.data("{ me { id } }", "me").get("id").asString()).isEqualTo("customer-01")

        val loggedOut = store.data("mutation { logout { success errors { code } } }", "logout")
        assertThat(loggedOut.get("success").asBoolean()).isTrue()
        assertThat(store.ask("{ me { id } }").get("data").get("me").isNull).isTrue()

        assertThat(
            store.data("mutation { logout { success } }", "logout").get("success").asBoolean(),
        ).isTrue()
    }

    @Test
    fun `a customer sees the sessions of every device and can revoke one`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        val otherDevice = StoreClient(port)
        otherDevice.signsIn("jane@example.com", "correct horse battery staple")

        val sessions = store.data("{ me { sessions { id current device } } }", "me.sessions")
        assertThat(sessions).hasSize(2)
        assertThat(sessions.count { session -> session.get("current").asBoolean() }).isEqualTo(1)

        val other = sessions.first { session -> !session.get("current").asBoolean() }.get("id").asString()
        val left = store.data(
            "mutation { revokeSession(sessionId: \"$other\") { sessions { id } errors { code } } }",
            "revokeSession",
        )
        assertThat(left.get("sessions")).hasSize(1)
        assertThat(otherDevice.ask("{ me { id } }").get("data").get("me").isNull).isTrue()
    }

    @Test
    fun `revoking somebody else's session is refused`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        val refused = store.data(
            "mutation { revokeSession(sessionId: \"a-session-of-somebody-else\") { errors { code } } }",
            "revokeSession",
        )
        assertThat(refused.get("errors").first().get("code").asString()).isEqualTo("SESSION_NOT_FOUND")
    }

    @Test
    fun `a wishlist works for a visitor who never signs in`() {
        val saved = store.data(
            "mutation { addToWishlist(productId: \"product-03\") { products { id } errors { code } } }",
            "addToWishlist",
        )
        assertThat(saved.get("errors")).isEmpty()
        assertThat(store.data("{ wishlist { id } }", "wishlist")).hasSize(1)

        val removed = store.data(
            "mutation { removeFromWishlist(productId: \"product-03\") { products { id } errors { code } } }",
            "removeFromWishlist",
        )
        assertThat(removed.get("products")).isEmpty()

        val unknown = store.data(
            "mutation { addToWishlist(productId: \"product-99\") { errors { code field } } }",
            "addToWishlist",
        )
        assertThat(unknown.get("errors").first().get("code").asString()).isEqualTo("PRODUCT_NOT_FOUND")
    }

    @Test
    fun `resetting the seed puts every product and every code back`() {
        store.signsIn("jane@example.com", "correct horse battery staple")
        store.data("mutation { addToCart(productId: \"product-03\") { cart { id } } }", "addToCart.cart")
        store.data("mutation { placeOrder { order { id } } }", "placeOrder.order")

        val reset = store.data(
            "mutation { resetSeed { success loadedProducts errors { code } } }",
            "resetSeed",
        )
        assertThat(reset.get("success").asBoolean()).isTrue()
        assertThat(reset.get("loadedProducts").asInt()).isEqualTo(TWENTY_PRODUCTS)
        assertThat(store.data("{ product(slug: \"mens-cotton-jacket\") { stock } }", "product").get("stock").asInt())
            .isEqualTo(8)
    }

    private fun codeOfFirstError(promotionCode: String): String = store.data(
        "mutation { applyPromotionCode(code: \"$promotionCode\") { errors { code } } }",
        "applyPromotionCode",
    ).get("errors").first().get("code").asString()

    private companion object {
        const val TWENTY_PRODUCTS = 20
    }
}
```

### 5.7 The rest

`.gitignore`

```
.kotlin/
```

`compose.yaml`

```yaml
services:
  database:
    image: postgres:18
    environment:
      POSTGRES_DB: zappymart
      POSTGRES_USER: zappy
      POSTGRES_PASSWORD: zappy
    ports:
      - "5432:5432"
    volumes:
      - database:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zappy -d zappymart"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  database:
```

The workflow that builds this folder lives outside it, beside the other
projects' workflows, and section 14 explains what it does.

`../../.github/workflows/kotlin.yml`

```yaml
name: Kotlin backend

on:
  push:
    branches: [main]
    paths:
      - "backends/kotlin/**"
      - "contract/**"
      - ".github/workflows/kotlin.yml"
  pull_request:
    paths:
      - "backends/kotlin/**"
      - "contract/**"
      - ".github/workflows/kotlin.yml"

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backends/kotlin
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: 25
          cache: gradle
          cache-dependency-path: |
            backends/kotlin/*.gradle.kts
            backends/kotlin/**/*.gradle.kts
            backends/kotlin/gradle/wrapper/gradle-wrapper.properties
      - run: ./gradlew build --no-daemon
```

## 6. Running the store

```
./gradlew :zappy-host:bootRun
```

The development profile is the default, so the seed loads at start.

```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/

 :: Spring Boot ::                (v4.1.1)

INFO  n.zappymart.host.ZappyMartApplicationKt  : Starting ZappyMartApplicationKt using Java 25.0.4.1
INFO  o.s.b.web.embedded.tomcat.TomcatWebServer: Tomcat started on port 8082 (http)
INFO  n.zappymart.host.ZappyMartApplicationKt  : Started ZappyMartApplicationKt in 6.2 seconds
INFO  nl.zappymart.host.SeedAtStart            : Loaded 20 products from contract/seed
```

The store is at `http://localhost:8082/graphql`, GraphiQL at
`http://localhost:8082/graphiql`, and the health of the process at
`http://localhost:8082/actuator/health`.

```
curl http://localhost:8082/actuator/health
```

```json
{"groups":["liveness","readiness"],"status":"UP"}
```

The database is an H2 file under `zappy-host/build/database`. Deleting
that folder and starting again is a clean store.

## 7. One request per operation

Every request below is one `curl` you can paste. Two headers matter:
`Origin`, which every mutation needs, and `Authorization`, which every
operation that needs a customer needs. `-c cookies.txt -b cookies.txt`
keeps the cart cookie and the refresh cookie between calls, the way a
browser does.

The answers are the ones this backend gave, with ids and tokens as they
came out. Yours differ where the contract says they may: cart line ids,
order ids, order numbers, session ids and tokens.

### products

```
curl -s http://localhost:8082/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products(first: 2) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { id name slug price { amount currency } category { slug } stock imageUrl } } } }"}'
```

```json
{
  "data": {
    "products": {
      "totalCount": 20,
      "pageInfo": { "hasNextPage": true, "endCursor": "cHJvZHVjdC0wMg" },
      "edges": [
        {
          "cursor": "cHJvZHVjdC0wMQ",
          "node": {
            "id": "product-01",
            "name": "Fjallraven Foldsack No. 1 Backpack, Fits 15 Laptops",
            "slug": "fjallraven-foldsack-no-1-backpack",
            "price": { "amount": 10995, "currency": "EUR" },
            "category": { "slug": "mens-clothing" },
            "stock": 12,
            "imageUrl": "/images/products/fjallraven-foldsack-no-1-backpack.svg"
          }
        },
        {
          "cursor": "cHJvZHVjdC0wMg",
          "node": {
            "id": "product-02",
            "name": "Mens Casual Premium Slim Fit T-Shirts",
            "slug": "mens-casual-premium-slim-fit-t-shirts",
            "price": { "amount": 2230, "currency": "EUR" },
            "category": { "slug": "mens-clothing" },
            "stock": 25,
            "imageUrl": "/images/products/mens-casual-premium-slim-fit-t-shirts.svg"
          }
        }
      ]
    }
  }
}
```

Pass `endCursor` back as `after` for the next page, and use `filter` to
narrow. `products(filter: {inStockOnly: true}, first: 1)` answers
`totalCount: 19`, because `product-07` has no stock, and
`products(filter: {categorySlug: "jewellery"}, first: 1)` answers
`totalCount: 4`.

### product

```
curl -s http://localhost:8082/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ product(slug: \"mens-cotton-jacket\") { id name price { amount currency } stock category { name } } }"}'
```

```json
{
  "data": {
    "product": {
      "id": "product-03",
      "name": "Mens Cotton Jacket",
      "price": { "amount": 5599, "currency": "EUR" },
      "stock": 8,
      "category": { "name": "Men's clothing" }
    }
  }
}
```

### categories

```
curl -s http://localhost:8082/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ categories { id name slug } }"}'
```

```json
{
  "data": {
    "categories": [
      { "id": "category-mens-clothing", "name": "Men's clothing", "slug": "mens-clothing" },
      { "id": "category-jewellery", "name": "Jewellery", "slug": "jewellery" },
      { "id": "category-electronics", "name": "Electronics", "slug": "electronics" },
      { "id": "category-womens-clothing", "name": "Women's clothing", "slug": "womens-clothing" }
    ]
  }
}
```

### cart

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ cart { id lines { id } subtotal { amount } shipping { amount } total { amount } } }"}'
```

```json
{
  "data": {
    "cart": {
      "id": "a6b9e13f-e4b8-479c-9120-4cd6d4095343",
      "lines": [],
      "subtotal": { "amount": 0 },
      "shipping": { "amount": 0 },
      "total": { "amount": 0 }
    }
  }
}
```

An empty cart pays nothing at all: no lines, no shipping charge, no
total. The charge appears with the first line.

### addToCart

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { addToCart(productId: \"product-18\", quantity: 2) { cart { id lines { id quantity product { name } lineTotal { amount } } subtotal { amount } shipping { amount } total { amount } } availableStock errors { code message field } } }"}'
```

```json
{
  "data": {
    "addToCart": {
      "cart": {
        "id": "58f6ade5-9bfd-46f7-b464-327b9b1d6321",
        "lines": [
          {
            "id": "3a6bba20-e921-4d55-9e29-2da2e6f22df4",
            "quantity": 2,
            "product": { "name": "MBJ Women's Solid Short Sleeve Boat Neck V" },
            "lineTotal": { "amount": 1970 }
          }
        ],
        "subtotal": { "amount": 1970 },
        "shipping": { "amount": 495 },
        "total": { "amount": 2465 }
      },
      "availableStock": null,
      "errors": []
    }
  }
}
```

This is the first row of the worked totals in `contract/seed/seed.md`.
The answer also carries `Set-Cookie: zappy_cart=58f6ade5-...`, which is
how the cart follows the visitor.

### applyPromotionCode

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { applyPromotionCode(code: \"freeship\") { cart { subtotal { amount } shipping { amount } total { amount } promotion { code kind discount { amount } } } errors { code } } }"}'
```

```json
{
  "data": {
    "applyPromotionCode": {
      "cart": {
        "subtotal": { "amount": 1970 },
        "shipping": { "amount": 0 },
        "total": { "amount": 1970 },
        "promotion": { "code": "FREESHIP", "kind": "FREE_SHIPPING", "discount": { "amount": 0 } }
      },
      "errors": []
    }
  }
}
```

The visitor typed `freeship` and the store answers with `FREESHIP`: the
code is compared without regard to case and stored in upper case. This is
the second row of the worked totals, and it is why a free shipping code
has a discount of zero: its whole effect is the shipping that fell away.

The third row needs a bigger cart. With one `product-03` and `WELCOME10`
the answer is a subtotal of 5599, no shipping because the subtotal passed
5000 on its own, a discount of 560 because 559.9 rounds half up, and a
total of 5039.

### removePromotionCode

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { removePromotionCode { cart { promotion { code } total { amount } } errors { code } } }"}'
```

```json
{
  "data": {
    "removePromotionCode": {
      "cart": { "promotion": null, "total": { "amount": 2465 } },
      "errors": []
    }
  }
}
```

### changeCartLineQuantity

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { changeCartLineQuantity(lineId: \"3a6bba20-e921-4d55-9e29-2da2e6f22df4\", quantity: 3) { cart { subtotal { amount } total { amount } } errors { code } } }"}'
```

```json
{
  "data": {
    "changeCartLineQuantity": {
      "cart": { "subtotal": { "amount": 2955 }, "total": { "amount": 3450 } },
      "errors": []
    }
  }
}
```

### removeCartLine

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { removeCartLine(lineId: \"3a6bba20-e921-4d55-9e29-2da2e6f22df4\") { cart { lines { id } total { amount } } errors { code } } }"}'
```

```json
{
  "data": {
    "removeCartLine": {
      "cart": { "lines": [], "total": { "amount": 0 } },
      "errors": []
    }
  }
}
```

### addToWishlist, wishlist and removeFromWishlist

A wishlist works without an account: an anonymous visitor's list lives
against the same `zappy_cart` cookie as the cart, and it merges into the
customer's list on login by adding, never replacing.

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { addToWishlist(productId: \"product-05\") { products { id name } errors { code } } }"}'
```

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

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ wishlist { id name } }"}'
```

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

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { removeFromWishlist(productId: \"product-05\") { products { id } errors { code } } }"}'
```

```json
{ "data": { "removeFromWishlist": { "products": [], "errors": [] } } }
```

### register

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { register(input: {email: \"sam@example.com\", name: \"Sam Jansen\", password: \"a long enough password\"}) { customer { id email name createdAt } accessToken accessTokenExpiresAt errors { code message field } } }"}'
```

```json
{
  "data": {
    "register": {
      "customer": {
        "id": "c604d27c-1d96-4793-8bb9-416b1bb2150f",
        "email": "sam@example.com",
        "name": "Sam Jansen",
        "createdAt": "2026-09-09T00:38:54Z"
      },
      "accessToken": "eyJraWQiOiIzZDE0MTVkOS04MGEwLTQwYzYtODJiMi0wNDE0YWNjNDIzZTYiLCJhbGciOiJSUzI1NiJ9...",
      "accessTokenExpiresAt": "2026-09-09T00:53:54Z",
      "errors": []
    }
  }
}
```

Registering signs the customer in, so there is no second step. The
refresh token is not in the answer: it is in the `zappy_refresh` cookie,
httpOnly, Secure, SameSite Lax, with its path limited to the GraphQL
endpoint.

### login

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { login(input: {email: \"jane@example.com\", password: \"correct horse battery staple\", device: \"Chrome on Windows\"}) { customer { id email name } accessToken accessTokenExpiresAt errors { code } } }"}'
```

```json
{
  "data": {
    "login": {
      "customer": { "id": "customer-01", "email": "jane@example.com", "name": "Jane Doe" },
      "accessToken": "eyJraWQiOiIzZDE0MTVkOS04MGEwLTQwYzYtODJiMi0wNDE0YWNjNDIzZTYiLCJhbGciOiJSUzI1NiJ9...",
      "accessTokenExpiresAt": "2026-09-09T00:53:54Z",
      "errors": []
    }
  }
}
```

Keep the access token for the calls below.

```
TOKEN=eyJraWQiOiIzZDE0...
```

### me

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ me { id email name createdAt sessions { id device createdAt lastUsedAt current } wishlist { id } } }"}'
```

```json
{
  "data": {
    "me": {
      "id": "customer-01",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "createdAt": "2026-01-15T09:00:00Z",
      "sessions": [
        {
          "id": "77356b24-40f1-49da-80bb-8edeb27eb131",
          "device": "Chrome on Windows",
          "createdAt": "2026-09-09T00:38:54Z",
          "lastUsedAt": "2026-09-09T00:38:54Z",
          "current": true
        }
      ],
      "wishlist": []
    }
  }
}
```

### placeOrder

With two `product-03` in the cart and `WELCOME10` applied:

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"mutation { placeOrder(idempotencyKey: \"a-checkout-attempt\") { order { id number status lines { productName quantity unitPrice { amount } lineTotal { amount } } promotionCode subtotal { amount } discount { amount } shipping { amount } total { amount } placedAt } errors { code message } } }"}'
```

```json
{
  "data": {
    "placeOrder": {
      "order": {
        "id": "1e53f3ad-b601-4ba6-ae18-002bf7a654f5",
        "number": "ZM-20260909-X52GYB",
        "status": "PAID",
        "lines": [
          {
            "productName": "Mens Cotton Jacket",
            "quantity": 2,
            "unitPrice": { "amount": 5599 },
            "lineTotal": { "amount": 11198 }
          }
        ],
        "promotionCode": "WELCOME10",
        "subtotal": { "amount": 11198 },
        "discount": { "amount": 1120 },
        "shipping": { "amount": 0 },
        "total": { "amount": 10078 },
        "placedAt": "2026-09-09T00:38:55Z"
      },
      "errors": []
    }
  }
}
```

The cart is empty afterwards, the stock of `product-03` went from 8 to 6,
and `WELCOME10` counted one use. `idempotencyKey` is accepted and
ignored, as the schema says a monolith may: one transaction already makes
the checkout atomic, and a second call answers `CART_EMPTY`.

### orders and order

```
curl -s http://localhost:8082/graphql \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ orders(first: 5) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { id number total { amount } placedAt } } } }"}'
```

```json
{
  "data": {
    "orders": {
      "totalCount": 1,
      "pageInfo": {
        "hasNextPage": false,
        "endCursor": "MWU1M2YzYWQtYjYwMS00YmE2LWFlMTgtMDAyYmY3YTY1NGY1"
      },
      "edges": [
        {
          "cursor": "MWU1M2YzYWQtYjYwMS00YmE2LWFlMTgtMDAyYmY3YTY1NGY1",
          "node": {
            "id": "1e53f3ad-b601-4ba6-ae18-002bf7a654f5",
            "number": "ZM-20260909-X52GYB",
            "total": { "amount": 10078 },
            "placedAt": "2026-09-09T00:38:55Z"
          }
        }
      ]
    }
  }
}
```

`order(id: "...")` answers the same order, and answers `null` for an
order that belongs to somebody else, so the answer tells nobody which ids
exist.

### refreshSession

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { refreshSession { customer { id } accessToken accessTokenExpiresAt errors { code } } }"}'
```

```json
{
  "data": {
    "refreshSession": {
      "customer": { "id": "customer-01" },
      "accessToken": "eyJraWQiOiIzZDE0MTVkOS04MGEwLTQwYzYtODJiMi0wNDE0YWNjNDIzZTYiLCJhbGciOiJSUzI1NiJ9...",
      "accessTokenExpiresAt": "2026-09-09T00:53:55Z",
      "errors": []
    }
  }
}
```

There are no arguments: the refresh token travels in the cookie. The
answer carries a new one and marks the old one rotated.

### revokeSession

```
curl -s http://localhost:8082/graphql \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"mutation { revokeSession(sessionId: \"77356b24-40f1-49da-80bb-8edeb27eb131\") { sessions { id device } errors { code } } }"}'
```

```json
{ "data": { "revokeSession": { "sessions": [], "errors": [] } } }
```

The answer is the sessions that are still open. Revoking the current one
is allowed and empties the list.

### logout

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"mutation { logout { success errors { code } } }"}'
```

```json
{ "data": { "logout": { "success": true, "errors": [] } } }
```

Logging out ends the session at once. The access token still looks valid
for up to fifteen minutes, and it stops working immediately, because
every bearer request checks the session id inside the token against the
session store. Logging out twice answers `true` again.

### resetSeed, in the development profile only

```
curl -s http://localhost:8082/graphql \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { resetSeed { success loadedProducts errors { code } } }"}'
```

```json
{ "data": { "resetSeed": { "success": true, "loadedProducts": 20, "errors": [] } } }
```

## 8. The failures

A rule that says no is data, not an exception. Every refusal below comes
back with `data` filled in and a `UserError` in `errors`, and a client
switches on `code` and never on `message`.

### OUT_OF_STOCK

```
curl -s http://localhost:8082/graphql -c cookies.txt -b cookies.txt \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"query":"mutation { addToCart(productId: \"product-07\") { availableStock errors { code message field } } }"}'
```

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

`availableStock` says how many were left, so a client says "only 0 left"
without a second query. `product-12` has one, so adding one succeeds and
adding a second answers `availableStock: 1`.

### QUANTITY_INVALID

```json
{
  "data": {
    "changeCartLineQuantity": {
      "errors": [
        {
          "code": "QUANTITY_INVALID",
          "message": "A quantity is one or more, and removeCartLine is how a line goes away.",
          "field": "quantity"
        }
      ]
    }
  }
}
```

### CART_LINE_NOT_FOUND

Removing a line that is already gone answers this rather than succeeding,
so two tabs cannot remove one line twice.

```json
{
  "data": {
    "removeCartLine": {
      "errors": [
        { "code": "CART_LINE_NOT_FOUND", "message": "That line is not in this cart.", "field": "lineId" }
      ]
    }
  }
}
```

### CODE_EXPIRED, CODE_EXHAUSTED, CODE_UNKNOWN and CODE_MINIMUM_NOT_MET

The seed carries one code for each of these, so all four are one request
away. The cart keeps whatever code it had.

```json
{
  "data": {
    "applyPromotionCode": {
      "errors": [
        { "code": "CODE_EXPIRED", "message": "The code SUMMER2025 is outside its validity window.", "field": "code" }
      ]
    }
  }
}
```

```json
{
  "data": {
    "applyPromotionCode": {
      "errors": [
        { "code": "CODE_UNKNOWN", "message": "There is no promotion code NOSUCHCODE.", "field": "code" }
      ]
    }
  }
}
```

`ONCE` answers `CODE_EXHAUSTED`, because the seed records its one use,
and `FIVEOFF` on a cart of 1970 answers `CODE_MINIMUM_NOT_MET`, because
it asks for 2500.

### CREDENTIALS_INVALID

```json
{
  "data": {
    "login": {
      "errors": [
        {
          "code": "CREDENTIALS_INVALID",
          "message": "That email address and password do not match a customer."
        }
      ]
    }
  }
}
```

The same code and the same message whether or not the address is
registered, and the same time either way: when no customer is found the
password is still hashed, against a hash that matches nobody.

### EMAIL_TAKEN, PASSWORD_TOO_SHORT and PASSWORD_TOO_LONG

```json
{
  "data": {
    "register": {
      "errors": [
        { "code": "EMAIL_TAKEN", "message": "That email address is already registered.", "field": "input.email" }
      ]
    }
  }
}
```

A password under twelve characters answers `PASSWORD_TOO_SHORT` with
`field: "input.password"`, and one over one hundred and twenty eight
answers `PASSWORD_TOO_LONG`.

### NOT_AUTHENTICATED

```json
{
  "data": {
    "placeOrder": {
      "errors": [
        { "code": "NOT_AUTHENTICATED", "message": "Placing an order needs a signed in customer." }
      ]
    }
  }
}
```

### CART_EMPTY

A second checkout after the cart was emptied answers this, which is what
a monolith does with a replayed `placeOrder`.

```json
{
  "data": {
    "placeOrder": {
      "order": null,
      "errors": [{ "code": "CART_EMPTY", "message": "There is nothing in the cart to order." }]
    }
  }
}
```

### SESSION_INVALID

A refresh token is used once. Presenting a rotated one means it leaked,
so the whole session is revoked and every device has to log in again.

```json
{
  "data": {
    "refreshSession": {
      "customer": null,
      "errors": [
        { "code": "SESSION_INVALID", "message": "That session cannot be refreshed. Please log in again." }
      ]
    }
  }
}
```

### SESSION_NOT_FOUND

Revoking a session that belongs to somebody else answers this, and never
says whether that session exists.

### A mutation without an allowed origin

This one is not a `UserError`. No change to the input puts it right, so
it is a GraphQL error and no resolver runs.

```
curl -s http://localhost:8082/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { addToCart(productId: \"product-18\") { cart { id } } }"}'
```

```json
{
  "errors": [
    {
      "message": "A mutation needs an allowed Origin header. See docs/security.md.",
      "locations": [],
      "extensions": { "classification": "FORBIDDEN" }
    }
  ]
}
```

The allowed origins default to the three frontend development ports and
are configuration, so a deployment lists its own:

```
zappy:
  security:
    allowed-origins:
      - https://zappymart.example
```

A query without an `Origin` is answered as usual. Only mutations are
checked.

## 9. The tests

```
./gradlew test
```

A passing run prints one line per test and ends green.

```
> Task :zappy-domain:test
MoneyTest > rounds a percentage half up to whole cents() PASSED
CartTest > an empty cart pays nothing at all() PASSED
CartTest > a free shipping code takes the charge away and discounts nothing() PASSED
PromotionTest > a code at its usage limit is exhausted() PASSED
OrderTest > an order keeps the names, the prices and the totals of the moment() PASSED

> Task :zappy-application:test
CartUseCasesTest > a promotion code follows the cart when a line changes() PASSED
PlaceOrderTest > placing an order empties the cart, reserves the stock and announces itself() PASSED
AccountUseCasesTest > a refresh token is used once and a replay revokes the session() PASSED

> Task :zappy-adapters:test
SecurityAdaptersTest > a password is hashed with argon2id and never stored in clear() PASSED
CachedProductRepositoryTest > reserving stock makes the cache read the catalogue again() PASSED

> Task :zappy-host:test
StoreIntegrationTest > the worked totals of the seed hold over the wire() PASSED
StoreIntegrationTest > logging out ends the session at once, even while the access token still looks valid() PASSED

BUILD SUCCESSFUL
```

The counts, on the run this file was written from:

| Module | Tests |
|---|---|
| `zappy-domain` | 45 |
| `zappy-application` | 34 |
| `zappy-adapters` | 23 |
| `zappy-host` | 27 |
| Total | 129 |

`./gradlew build` compiles every module, runs all four suites and builds
the runnable jar. That is the gate this backend is finished by.

## 10. The conformance run

The shared runner takes a backend url, resets the seed, runs the
scenarios of `contract/operations/` and compares each answer with
`contract/expected/`.

```
cd ../../tools/conformance
npm install
node run.mjs --url http://localhost:8082/graphql
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

## 11. What the language changes

For a reader who knows the Java backend of item Z6. The two projects hold
the same modules, the same file names and the same rules. These are the
places where Kotlin says it differently.

**Data classes carry the whole entity.** `Product`, `Order`, `Cart` and
`Session` are `data class` declarations, so equality, `hashCode`,
`toString` and `copy` come with them. `copy` is what makes the domain
immutable without ceremony: `Cart.withLineRemoved` returns
`copy(lines = ..., updatedAt = moment)` and no cart is ever mutated. The
Java backend writes a constructor, getters and a builder for the same
shape.

**Value classes make a wrong value impossible without an object.**
`EmailAddress`, `PromotionCode` and `PasswordHash` are
`@JvmInline value class` declarations, so at run time they are the
`String` inside and at compile time they are their own type. A method
that takes an `EmailAddress` cannot be handed a name by mistake, and
there is no allocation for the safety. Two prices for it, both visible in
this code: the getter is name mangled on the JVM, so the GraphQL layer
unwraps those three fields by hand, and `PasswordHash` overrides
`toString` to print `PasswordHash(hidden)` so a hash cannot slip into a
log line.

**Sealed interfaces make the outcomes finite.** `Result` is
`sealed interface Result<out Value>` with `Success` and `Refused`, and
`PromotionRule` is sealed with `Percentage`, `FixedAmount` and
`FreeShipping`. The compiler then checks a `when` for exhaustiveness, so
adding a fourth promotion kind breaks every place that has to learn about
it, at compile time. That is the same Strategy pattern as in Java, with
the compiler doing the review.

**Null safety at the boundary.** `Product.imageUrl` is `String?` and
`Cart.customerId` is `String?`, and everything else is not null. The
GraphQL layer is where nullability actually varies, and the `?` on the
type is the whole documentation of it. `-Xjsr305=strict` makes Spring's
own annotations bind the same way, so a Java method that says
`@Nullable` arrives as a `String?` here.

**Extension functions where they read well.** The domain has
`Result.map`, `Result.andThen` and `Result.errors`, so a use case reads
`promotion.applyTo(subtotal, moment).map { applied -> cart.withPromotion(applied, moment) }`.
The persistence adapter has `ProductEntity.asProduct()` and its
neighbours in one file, `EntityMapping.kt`, so the mapping is a set of
functions on the entities rather than a mapper class with eleven methods.

**Named lambda parameters, never `it`.** `docs/principles.md` calls this
one out, and it is followed everywhere:
`lines.firstOrNull { line -> line.id == lineId }`, not
`lines.firstOrNull { it.id == lineId }`. In a file with three nested
lambdas the name is the difference between reading and guessing.

**Objects instead of static holders.** `Shipping`, `PasswordPolicy`,
`Cursors` and `DateTimeScalar` are `object` declarations: one instance,
no constructor, no `private` constructor to stop anybody making one.

**Trailing lambdas make the ports read like blocks.**
`unitOfWork.execute { ... }` is a method taking `() -> Value`, and it
reads like a keyword. The Java backend passes a `Supplier` to the same
port.

**Coroutines, in one place, on purpose.** `ListProducts` is the only
`suspend` use case. It runs two independent reads at once, the page and
the count, on `Dispatchers.IO`:

```
val oneMoreThanTheSize = async(Dispatchers.IO) { products.page(specification, size + 1, afterProductId) }
val matching = async(Dispatchers.IO) { products.count(specification) }
```

Spring for GraphQL invokes a suspending controller method directly, so
`CatalogueController.products` is `suspend` too and nothing else changes.
Everywhere else this backend stays blocking, and that is the honest
answer: JPA is a blocking API, one database serves every request, and a
transaction is bound to its thread, so moving a use case onto coroutines
would buy nothing and cost the transaction. The two reads here are read
only, need no transaction of their own and are genuinely independent,
which is the whole test for whether a resolver benefits.

**What does not change.** The hexagon, the module names, the file names,
the ports, the patterns and the rules are the same as in Java. A reader
who knows one backend finds the other by looking in the same place.

## 12. Where each pattern lives

`docs/patterns.md` names the pattern, the file and the problem. These are
the files in this backend.

| Pattern | File | The problem it solves here |
|---|---|---|
| Ports and adapters | the four modules | `zappy-domain` declares only the Kotlin standard library, so it cannot import a framework |
| Repository as a port | `zappy-application/.../ports/*Repository.kt` | a use case reads and stores aggregates without knowing a table |
| Unit of work | `ports/UnitOfWork.kt`, `adapters/transaction/TransactionalUnitOfWork.kt` | the order, the stock and the emptied cart succeed or fail together |
| Result type | `domain/shared/Result.kt` | out of stock and an expired code are values a client renders, not exceptions |
| Specification | `domain/catalogue/ProductSpecification.kt`, translated in `JpaProductRepository` | a filter composed from parts, testable without a database |
| Strategy | `domain/promotions/PromotionRule.kt` | three kinds of code behind one interface, with one place to add a fourth |
| Factory | `Order.place(cart, customerId, id, number, moment)` | an order can only come into being in one valid shape |
| Domain events | `domain/ordering/OrderPlaced.kt`, `adapters/events/OrderPlacedListener.kt` | counting a code and sending the mail react after the commit, and ordering knows neither |
| Decorator | `adapters/persistence/CachedProductRepository.kt` | the catalogue query is cached by wrapping the port, which stays untouched |
| Value objects | `domain/shared/Money.kt`, `EmailAddress.kt`, `PromotionCode.kt` | a wrong value cannot exist, so the rules do not re-check it |
| Builder in tests | `zappy-domain/src/testFixtures/.../builders/` | a test names only what matters and reads like the rule |

## 13. PostgreSQL instead of H2

H2 in PostgreSQL compatibility mode is the default so the store runs
without Docker. The `postgres` profile points at a real PostgreSQL 18,
and `compose.yaml` in this folder starts one.

```
docker compose up -d
./gradlew :zappy-host:bootRun --args='--spring.profiles.active=development,postgres'
```

This path has not been run here: the machine this backend was built on
has no Docker yet, which is decision 4 in `BACKLOG.md`. The profile, the
driver and the compose file are in place and the schema still comes from
Hibernate, so the first run on a machine with Docker is the check.

## 14. Continuous integration

`.github/workflows/kotlin.yml` builds and tests this folder on every push
and pull request that touches `backends/kotlin/**`, `contract/**` or the
workflow itself. It checks out with `actions/checkout@v7`, takes Temurin
25 from `actions/setup-java@v6` with the Gradle cache, and runs
`./gradlew build`. Nothing is deployed.

## 15. What is not here

- Real payment. An order is `PAID` the moment it is placed, and
  `PlaceOrder` is where a payment provider would go.
- Addresses, carriers and delivery dates. Shipping is one charge.
- An administrative interface, product photography, and search beyond a
  name filter. `docs/domain.md` says why.
- A production key for the access tokens. The RSA key pair is generated
  at start, which suits development and the conformance run and nothing
  else.
- Testcontainers against PostgreSQL, for the same reason as section 13.

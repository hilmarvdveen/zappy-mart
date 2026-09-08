# Versions

The one place. Every project runs the version listed here, and the blog
cites this version. A row is added before the first line of code that
uses it, with the date it was verified and the source.

The policy is the blog's: the current version to explain with, verified
on a date, never a number from memory.

## Verified, copied from the blog's version table on 8 September 2026

| Item | Version | Verified | Source |
|---|---|---|---|
| .NET | 10, patch 10.0.11, LTS to 14 November 2028 | 6 September 2026 | dotnet.microsoft.com support policy |
| C# | 14, ships with the .NET 10 SDK | 6 September 2026 | learn.microsoft.com |
| Java | JDK 25, LTS, GA 16 September 2025 | 6 September 2026 | openjdk.org |
| Spring Boot | 4.1.1 on Spring Framework 7.0.9, Java 17 minimum, Java 26 maximum | 6 September 2026 | spring-projects/spring-boot releases |
| Spring for GraphQL | 2.0.4 | 7 September 2026 | spring.io/projects/spring-graphql |
| Spring specifics | `RestTemplate` deprecated in Spring Framework 7, `ProblemDetail` follows RFC 9457, Hibernate Validator 9.1.3, jakarta.validation 3.1.1, Testcontainers 2.0.5 with `@ServiceConnection` | 6 September 2026 | docs.spring.io |
| Kotlin | 2.4.10, K2 is the only compiler | 6 September 2026 | kotlinlang.org |
| Kotlin with Spring | Spring Boot 4.1.1 manages Kotlin 2.3.21, minimum 2.2, `kotlin("plugin.spring")` opens annotated classes, `jackson-module-kotlin` auto registers | 6 September 2026 | docs.spring.io |
| kotlinx.coroutines | 1.11.0 | 6 September 2026 | Kotlin/kotlinx.coroutines releases |
| graphql-kotlin (Expedia) | 9.0.0-alpha.8, a pre-release from May 2025, not used | 7 September 2026 | Maven Central |
| Angular | 22.1.5, with the CLI and `@angular/build` at 22.1.7. TypeScript `>=6.0.0 <6.1.0`, Node `^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0`, zoneless by default, `OnPush` the default for new components. The version `frontends/angular` runs | 8 September 2026 | npm, angular.dev |
| TypeScript for Angular | 6.0.3, the 6.0.x that Angular 22 requires | 8 September 2026 | npm |
| Angular unit test runner | Jest 30.5.1 with `jest-preset-angular` 17.0.0. That release declares `@angular/core >=20.0.0 <23.0.0`, so it supports Angular 22, and it ships `setup-env/zoneless` for a zoneless `TestBed`. The Vitest runner in `@angular/build` is therefore not needed in `frontends/angular` and the existing Jest specs stay | 8 September 2026 | npm |
| ESLint | 10.10.0, with `@eslint/js` 10.0.1 | 8 September 2026 | npm |
| angular-eslint | 22.5.0, the line that pairs with Angular 22. Peers eslint `^9.0.0 \|\| ^10.0.0` and typescript-eslint `^8.0.0`. Its recommended set makes `prefer-inject` an error | 8 September 2026 | npm |
| typescript-eslint | 8.70.0, peer typescript `>=4.8.4 <6.1.0` | 8 September 2026 | npm |
| Prettier | 3.9.6, with `eslint-config-prettier` 10.1.8 and `eslint-plugin-prettier` 5.5.6 | 8 September 2026 | npm |
| React Router | 8.3.1, peer React `>=19.2.7` | 7 September 2026 | npm |
| React | 19.2.8, the version the site runs | 5 September 2026 | npm |
| Next.js | 16.3.4, the version the site runs | 5 September 2026 | npm |
| Apollo Client | 4.2.12, peers react `^17 \|\| ^18 \|\| >=19.0.0-rc`, graphql `^16 \|\| ^17` | 7 September 2026 | npm |
| Apollo Server | 5.5.1, Node `>=20`, peer graphql `^16.11` | 7 September 2026 | npm |
| Express | 5.2.1 | 7 September 2026 | npm |
| graphql (reference implementation) | 17.0.2, Node 22, 24, 25 or 26 | 7 September 2026 | npm |
| Node.js | 24 is the active LTS (maintenance from 20 October 2026), 22 in maintenance, 26 becomes LTS on 28 October 2026 | 7 September 2026 | nodejs.org |
| Docker Engine | 29.8.0 with BuildKit 0.33.0 | 3 September 2026 | docs.docker.com |
| Dockerfile frontend | `# syntax=docker/dockerfile:1`, release 1.27.0 | 2 September 2026 | moby/buildkit |
| Docker Compose | 5.5.1, `compose.yaml`, no `version:` key | 3 September 2026 | docker/compose |
| .NET images | `mcr.microsoft.com/dotnet/aspnet:10.0`, chiseled `-noble-chiseled`, `-extra` adds ICU, `APP_UID` 1654, port 8080 | 6 September 2026 | github.com/dotnet/dotnet-docker |
| Java images | `eclipse-temurin` 25 JDK and JRE | 6 September 2026 | Docker Hub |
| Testcontainers | 2.0.5 | 6 September 2026 | testcontainers.org |

## To verify before the first line that uses them (item Z1)

| Item | Why it is needed | Candidate |
|---|---|---|
| Hot Chocolate | the GraphQL server for .NET | the current major on NuGet, its .NET 10 support |
| EF Core | persistence in the C# backend | the 10.x patch that pairs with .NET 10.0.11 |
| Npgsql | PostgreSQL provider for EF Core | the current major |
| PostgreSQL | the database in every `compose.yaml` and every Testcontainers run | the current major, one tag for all backends |
| urql and gql.tada | the GraphQL client and the typed documents in the React Router frontend, the record names both at bol.com | the current versions on npm |
| Apollo Angular | the GraphQL client in the Angular frontend | the current version and its Angular 22 peer |
| Tailwind CSS | styling in the three frontends, the site runs 4.3 | the current 4.x |
| Vite | the React Router build | the version React Router 8.3 pairs with |
| Vitest, Testing Library, Playwright | the test tools | current versions |
| Argon2id libraries | password hashing per language: `Konscious.Security.Cryptography` or the built in PBKDF2 alternative on .NET, `spring-security-crypto` Argon2 on the JVM | current versions and the OWASP parameters |
| JWT libraries | `Microsoft.IdentityModel.JsonWebTokens` on .NET, `spring-security-oauth2-jose` (Nimbus) on the JVM | current versions |
| Spring Data JPA and Hibernate | persistence on the JVM | the versions Spring Boot 4.1.1 manages |

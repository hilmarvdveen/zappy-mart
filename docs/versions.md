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

## Verified on 8 September 2026 for item Z1

Read from the npm registry, the NuGet flat container, endoflife.date and
the Spring Boot 4.1.1 dependency bill of materials on 8 September 2026.

| Item | Version | Notes | Source |
|---|---|---|---|
| Hot Chocolate | `HotChocolate.AspNetCore` 16.6.4 | 16.7 is in preview, not used | NuGet |
| EF Core | `Microsoft.EntityFrameworkCore` 10.0.12 | 11 is a release candidate, not used. The .NET runtime patch is re-checked at Z3 against this | NuGet |
| Npgsql for EF Core | `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3 | | NuGet |
| JWT on .NET | `Microsoft.IdentityModel.JsonWebTokens` 8.22.0, `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.12 | | NuGet |
| Argon2id on .NET | `Konscious.Security.Cryptography.Argon2` 1.3.1 | parameters from the OWASP password storage cheat sheet, re-read at Z3 | NuGet |
| Testcontainers for .NET | `Testcontainers.PostgreSql` 4.15.0 | | NuGet |
| PostgreSQL | 18, latest 18.6, supported to 14 November 2030 | image tag `postgres:18` in every `compose.yaml` and every Testcontainers run | endoflife.date |
| Spring Boot 4.1.1 manages | Spring for GraphQL 2.0.5, Spring Security 7.1.1, Spring Data 2026.0.1, Hibernate 7.4.5.Final, Jackson 3.1.5, graphql-java 25.0, PostgreSQL JDBC 42.7.13, Testcontainers 2.0.5, Kotlin 2.3.21 | the JVM backends take these from the bill of materials, Kotlin is raised to 2.4.10 explicitly | spring-boot-dependencies 4.1.1 pom |
| urql | `urql` 5.0.4 with `@urql/core` 6.0.3, `@urql/next` 2.0.1 | React Router frontend, and the Next.js alternative to Apollo if wanted | npm |
| gql.tada | 1.11.3, TypeScript 5 to 8 | React Router frontend | npm |
| Apollo Angular | `apollo-angular` 14.2.0, peers Angular 20 to 22 and `@apollo/client` 4.2.3 or later | Angular frontend | npm |
| Tailwind CSS | 4.3.3 | the three frontends, the same version the site runs | npm |
| Vite | 8.2.2 | React Router build | npm |
| Vitest | 5.0.0, pairs with Vite 6.4 to 8 | unit tests in the React Router and Next.js frontends | npm |
| Testing Library for React | 16.3.3 | | npm |
| Playwright | `@playwright/test` 1.63.0 | the end to end suite | npm |
| TypeScript | 7.0.2 is the latest release. Angular 22 and typescript-eslint 8.70 require `<6.1.0`, so the family pins the 6.0 line, the exact patch at install | | npm |
| Angular tooling | `@angular/cli` 22.1.7, `angular-eslint` 22.5.0, `typescript-eslint` 8.70.0, `prettier` 3.9.6 | | npm |
| jest-preset-angular | 17.0.0, Angular 20 to 22 with Jest 30 | kept in `frontends/angular`, see the Angular unit test runner row above | npm |
| graphql for Apollo | 16.14.2, the `latest-16` tag. Apollo Server 5.5.1, `@apollo/subgraph` 2.15.0, `@apollo/gateway` 2.14.4 and `@apollo/composition` 2.14.4 all declare `graphql` 16 as their peer, so the mock server and the Node backend run 16 and only the conformance runner runs 17 | verified 9 September 2026 | npm |
| jose | 6.2.12, the JSON Web Token library of the mock server (HS256 with a random secret per start) and of the Node subgraphs (RS256 against the JWKS endpoint) | verified 9 September 2026 | npm |
| Apollo Server 5 and Express | 5.5.1 ships no Express integration package of its own. The mock server calls `executeHTTPGraphQLRequest` from an Express 5.2.1 route, because `startStandaloneServer` fixes CORS to every origin without credentials, which browser cookies from the frontend ports cannot cross | verified 9 September 2026 | npm, the Apollo Server documentation |
| GraphQL code generation | `@graphql-codegen/cli` 7.4.0 with `@graphql-codegen/client-preset` 6.1.3, both accepting `graphql` 17, fragment masking off | verified 9 September 2026 | npm |
| Next.js store front | TypeScript 6.0.3, `eslint-config-next` 16.3.4 on ESLint 10.10.0 (the React version is named in the config so the bundled plugin never calls the API ESLint 10 removed), `@vitejs/plugin-react` 6.1.1, jsdom 30.0.1, Testing Library dom 10.4.1, jest-dom 7.0.1, user-event 14.6.7, `@apollo/client` 4.2.12 on `graphql` 17.0.2 (the client accepts 16 or 17) | verified 9 September 2026 | npm |
| React Router store front | TypeScript 6.0.3, `@react-router/{dev,node,serve}` 8.3.1, `@tailwindcss/vite` 4.3.3, `@urql/core` 6.0.3 with gql.tada 1.11.3 and its companion `@0no-co/graphqlsp` 1.17.5 (the React bindings `urql` are not used), `@vitejs/plugin-react` 6.1.1, jsdom 30.0.1, the Testing Library packages as in the Next.js row, ESLint 10.10.0 with `@eslint/js` 10.0.1, typescript-eslint 8.70.0, `eslint-plugin-react-hooks` 7.1.1, `@types/node` 24.13.3 (the 24 line, to match the runtime), isbot 5.2.2 | verified 9 September 2026 | npm |
| End to end suite | `@playwright/test` 1.63.0 in `tools/end-to-end`, parameterised by `FRONTEND_URL`, `RESET_SEED=true` reloads the seed before the run | verified 9 September 2026 | npm |
| Apollo Federation, JavaScript | `@apollo/subgraph` 2.15.0, `@apollo/gateway` 2.14.4, `@apollo/composition` 2.14.4 | the gateway serves the composed supergraph in this repository because Norton on the development laptop blocks the Rust `router.exe` that `@apollo/router` downloads (and `rover.exe` from `@apollo/rover` 0.41.0). The same supergraph file runs under Apollo Router unchanged | npm |

## Still to verify at the item that first needs it

| Item | Needed by | Note |
|---|---|---|
| Argon2 parameters | Z3 | memory, iterations and parallelism from the OWASP password storage cheat sheet, read on the day |
| Spring Security Argon2 encoder | Z6 | `Argon2PasswordEncoder` in spring-security-crypto 7.1.1, its recommended factory method checked on the day |
| .NET runtime patch | Z3 | the table says 10.0.11, EF Core is at 10.0.12, the SDK in use is recorded when the solution is created |
| TypeScript 6.0 patch | Z5, Z8 | the React Router and Next.js frontends record their 6.0.x at install, the Angular frontend runs 6.0.3 |

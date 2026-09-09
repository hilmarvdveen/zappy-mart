# Security: sessions and JWT

Every backend implements the same model. Every frontend uses it in the
way its runtime allows. This document is the design. `patterns.md` and the
project READMEs point at the files once they exist.

## Two tokens

A login answers with two tokens that do different jobs.

**The access token** is a JWT, signed with an asymmetric key (the backend
holds the private key, anyone can verify with the public one), valid for
fifteen minutes, carrying the customer id, the session id and the expiry.
Nothing personal is in it, and it is never stored on the server. Every
GraphQL request that needs a customer sends it in the `Authorization`
header as a bearer token. A backend verifies the signature without a
database read and checks the session id the token carries against the
session table, or a cache of it, so a logout or a revocation takes effect
at once.

**The refresh token** is random and opaque, valid for thirty days, stored
hashed in the `sessions` table together with the customer id, the device
description and the timestamps. It travels in the cookie `zappy_refresh`,
httpOnly, Secure, SameSite Lax, whose path is limited to the refresh
mutation, so no other request carries it and no script can read it. The
anonymous cart and wishlist are identified by the cookie `zappy_cart`.

## Rotation

A refresh token is used once. The refresh mutation answers with a new
access token and a new refresh token and marks the old one as rotated. If
a rotated token is presented again, the whole session family is revoked,
because a replay means the token leaked.

## Why not one of the two alone

- A JWT alone cannot be revoked before it expires. A customer who logs
  out on a stolen laptop needs the session gone now, not in fifteen
  minutes. The session table gives that.
- A server session alone costs a database read on every request and ties
  every client to one cookie domain. The access token gives fifteen
  minutes of stateless requests and works for a mobile app or a partner
  API.
- When a pure server session is still the better choice: one server, one
  domain, one kind of client. The React Router frontend shows that shape
  for its own session with the browser, and this document says so where
  it happens.

## Where the tokens live, per frontend

| Frontend | Shape | Where the access token is | Where the refresh token is |
|---|---|---|---|
| React Router | backend for frontend: the React Router server calls the API | in the frontend's server side session, never in the browser | in the frontend's server side session |
| Next.js | backend for frontend: server components and route handlers call the API | in the frontend's server side session, never in the browser | in the frontend's server side session |
| Angular | single page application calling the API directly | in memory only, lost on reload, refreshed through the cookie | in the httpOnly cookie set by the API |

The browser of a React Router or Next.js user holds one cookie: the
frontend's own session, httpOnly, encrypted, holding the two API tokens.
That is the simplest safe shape for a server rendered frontend, and the
reason the two frameworks have a server.

## Cross site request forgery

Cookie authenticated requests (the refresh mutation, and every request
in the Angular shape) are protected twice: the cookie is SameSite Lax, and
the backend checks the `Origin` header against its allowed origins on
every mutation. A missing or foreign origin is refused before the
resolver runs.

## Passwords

Argon2id with parameters from the current OWASP recommendation, verified
in `versions.md` before the first line of code. Registration refuses a
password below twelve characters and never limits the maximum below one
hundred and twenty eight. A password never appears in a log, an error
message or a GraphQL response.

## Rate limits and enumeration

Login and register are rate limited per address and per email. A failed
login answers with one message whether the email exists or not, and
takes the same time either way.

## What is logged

The session id, the customer id, the outcome and the reason code. Never a
token, never a password, never an email address in clear beside a
failure.

## The order in which a reader meets this

1. The `sessions` table and the `Session` entity in the accounts module.
2. The token issuer port and its JWT adapter.
3. The login, refresh and logout use cases.
4. The GraphQL adapter reading the bearer header and the cookie.
5. The frontend shape, one section per frontend README.

## Where each rule lives in the C# backend

Checked against `backends/dotnet` on 9 September 2026. The Java, Kotlin
and Node backends keep the same shape under their own names, and each
README says where.

| Rule | File (under `backends/dotnet`) |
|---|---|
| The access token, signed with RS256, with the session id inside | `src/Zappy.Adapters.Security/JwtTokenIssuer.cs`, keys from `src/Zappy.Adapters.Security/SigningKeys.cs` |
| The session checked on every bearer request, so a logout or a revocation takes effect at once | `src/Zappy.Host/BearerTokenSetup.cs` |
| The refresh token, its rotation and the family revocation on a replay | `src/Zappy.Domain/Accounts/RefreshToken.cs`, stored through `src/Zappy.Application/Accounts/ISessionRepository.cs` |
| The two cookies, `zappy_refresh` and `zappy_cart`, Secure over HTTPS | `src/Zappy.Adapters.GraphQL/Requests/Cookies.cs` |
| The Origin check on every mutation, before any resolver runs | `src/Zappy.Adapters.GraphQL/Origin/OriginCheck.cs` |
| Argon2id with the OWASP parameters | `src/Zappy.Adapters.Security/Argon2idPasswordHasher.cs` behind `src/Zappy.Application/Accounts/IPasswordHasher.cs` |
| The rate limit on login | `src/Zappy.Adapters.Security/InMemoryRateLimiter.cs` behind `src/Zappy.Application/Accounts/IRateLimiter.cs` |

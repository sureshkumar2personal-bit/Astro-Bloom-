# Phase 3 — Authentication and Session ✅ COMPLETE

## Objective

Connect the form to the user-authentication API and manage a successful session safely.

## Build

- Submit `POST /api/auth/user/login` with `{ identifier, password }`.
- On success, store the access token using the project’s agreed client-session strategy.
- Use the server response’s `redirectTo` value, falling back to `/user/dashboard` only when appropriate.
- Keep the refresh token handling consistent with the application’s authentication design; do not silently discard a token the API expects to refresh.
- Add the access token to protected API requests as `Authorization: Bearer <token>`.
- For a 401 response on a protected request, attempt one token refresh; if that fails, clear the session and return to `/user/login`.
- Do not write passwords, tokens, or full API responses to browser logs.

## Error handling

- `401`: show “Invalid email/mobile number or password.”
- `403`: show “This account is not active.”
- Network failure: retain the entered identifier, clear no fields automatically, and allow retry.

## Done when

- An active user can sign in with a registered email address or mobile number.
- The user reaches the dashboard with a usable authenticated session.
- Failed login does not create a session.

## Checklist

- [x] Send only the normalized `identifier` and password to the login endpoint.
- [x] Handle success, `401`, `403`, malformed JSON, and network errors.
- [x] Save the token(s) required by the selected session design.
- [x] Centralize authenticated requests instead of duplicating token-header code in pages.
- [x] Implement one refresh-and-retry path for expired access tokens.
- [x] Clear local session state after refresh failure or logout.
- [x] Verify user role before accepting a login response or protected API response.
- [x] Ensure passwords and tokens never appear in browser logs, URLs, or errors.

## Current-project gaps to close

The login UI saves only `accessToken`; it ignores the returned `refreshToken`, so the existing refresh-token API cannot be used.
The frontend API client has no refresh-and-retry interceptor and many pages manually read the token from `localStorage`.
The backend keeps refresh-token sessions in an in-memory array. Sessions disappear on a server restart and are not shared across server instances; persist and revoke them in the database before production.
`/auth/user/me` also depends on the in-memory user cache after a restart. It must query the user record from the database.
Development fallback JWT secrets must be rejected in production through required environment configuration.

**Status:** Frontend gaps closed. Backend in-memory session and JWT secret concerns are production hardening items outside this sprint's scope.

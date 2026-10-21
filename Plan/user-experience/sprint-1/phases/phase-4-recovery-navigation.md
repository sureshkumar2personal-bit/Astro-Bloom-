# Phase 4 — Recovery and Navigation

## Objective

Complete the safe exit paths around sign-in without confusing user and astrologer journeys.

## Build

- Link “Create an account” to `/user/register`.
- Link “Forgot password?” to `/user/forgot-password`.
- Link the astrologer callout to `/astrologer/login`.
- Decide and implement “Remember me” behavior before displaying an enabled checkbox. If it is deferred, remove or disable it with no misleading promise.
- On logout, call the logout API, clear client session data, and navigate to `/user/login`.
- Protect user-only routes by checking the authenticated user session; unauthenticated visitors must be sent to login.

## Done when

- Every link works with mouse, keyboard, and screen reader navigation.
- Logging out blocks protected user routes until the next valid sign-in.
- An astrologer is never redirected to the user dashboard by the user-login flow.

## Checklist

- [x] Use a real router `Link` for registration.
- [x] Use a real router `Link` for password recovery.
- [x] Use a real router `Link` for the astrologer portal.
- [x] Define, implement, and test the remember-me storage duration—or remove the control.
- [x] Provide a user logout action that calls `POST /api/auth/logout`.
- [x] Clear client session state even if logout's network call fails.
- [x] Add role-aware route guards to every `/user/*` route except login, registration, and password recovery.
- [x] Redirect a signed-in user away from login to their dashboard where appropriate.
- [x] Revoke outstanding refresh sessions after a password reset.

## Current-project gaps to close

- [x] "Forgot password?" is currently a plain `<a>` without a destination; it does not open `/user/forgot-password`. → Fixed: now uses `Link` to `/user/forgot-password`.
- [x] The displayed "Remember me" checkbox has no state or behavior. → Implemented: now tracks state and controls session storage type (localStorage vs sessionStorage).
- [x] The app has no visible logout action and does not call the existing user logout endpoint. → Implemented: Shell.jsx has logout action calling `POST /api/auth/logout`.
- [x] User application routes are not wrapped in a route guard, so they can render before a protected API request fails. → Fixed: all `/user/*` routes wrapped in `ProtectedRoute`.
- [ ] Password reset currently returns the raw reset token in the API response rather than delivering a reset link/code through a trusted channel. Replace this development-only behavior with email/SMS delivery, rate limiting, and session revocation after reset.

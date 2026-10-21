# Sprint 1 — User Login

## Goal

Enable a registered user to securely sign in with an email address or mobile number and reach the user dashboard.

## User journey

1. The user opens `/user/login` (the application root redirects here).
2. They enter their registered email address or mobile number and password.
3. The form validates that both fields are present and submits the credentials.
4. On successful authentication, the application stores the access token and takes the user to `/user/dashboard`.
5. If sign-in fails, the user remains on the page and receives a clear, non-sensitive error message.
6. A new user can move to `/user/register`; a user who cannot access their account can move to `/user/forgot-password`.

## Screen requirements

- Heading and supporting copy welcoming the user back.
- **Email or mobile number** field (`identifier`), required.
- **Password** field, required and masked by default.
- A sign-in button with a loading/disabled state while the request is in progress.
- Inline, accessible validation and server-error feedback.
- Links for account registration and password recovery.
- A clearly separated link to the astrologer portal (`/astrologer/login`), so the two roles cannot be confused.
- “Remember me” must either persist the session only after explicit user consent or be hidden until that behavior is implemented.

## API contract

### Login request

`POST /api/auth/user/login`

```json
{
  "identifier": "you@example.com",
  "password": "user-password"
}
```

`identifier` accepts either the registered email address or mobile number.

### Successful response

The server returns an access token, refresh token, minimal user details, and the dashboard redirect path.

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": {
      "id": "<user-id>",
      "fullName": "User name",
      "mobile": "9876543210"
    },
    "redirectTo": "/user/dashboard"
  }
}
```

### Error states

| Situation | Status | User-facing result |
| --- | --- | --- |
| Missing or invalid credentials | 401 | “Invalid email/mobile number or password.” |
| Inactive account | 403 | “This account is not active.” |
| Network or unexpected error | — | A retry-friendly generic error; do not expose technical details. |

## Session and security rules

- Use HTTPS in deployed environments.
- Passwords are never stored or logged by the client; the API verifies bcrypt password hashes.
- Store the short-lived access token securely and send it as a Bearer token for protected requests.
- Use the refresh-token endpoint to renew an expired session; revoke active sessions through logout.
- Clear local session data after logout or an unrecoverable authentication failure.
- Never reveal whether an email address or mobile number exists when credentials are invalid.

## Existing implementation alignment

- UI page: `frontend/src/pages/user/AuthPages.jsx` (`UserLogin`).
- Route: `/user/login` in `frontend/src/routes/AppRoutes.jsx`.
- Authentication endpoint: `backend/src/routes/auth.routes.js` (`POST /user/login`).
- Existing behavior already validates credentials, checks the account is active, issues JWT tokens, records `last_login_at`, and redirects to `/user/dashboard`.
- Sprint work should connect the password-recovery text to `/user/forgot-password`, implement the remember-me decision, and add loading and validation states if they are not already present.

## Acceptance criteria

- A valid active user can sign in using either their email or mobile number and is taken to the dashboard.
- Invalid credentials, inactive accounts, empty fields, and network errors show understandable feedback without breaking the page.
- The user cannot see or access protected user routes without a valid session.
- Registration, password recovery, and astrologer-portal links take the user to the correct route.
- Logout removes the client session and prevents further protected API requests until a new login occurs.

## Delivery phases

1. [Phase 1 — Login shell and form](phases/phase-1-login-shell.md)
2. [Phase 2 — Validation and accessibility](phases/phase-2-validation-accessibility.md)
3. [Phase 3 — Authentication and session](phases/phase-3-authentication-session.md)
4. [Phase 4 — Recovery and navigation](phases/phase-4-recovery-navigation.md)
5. [Phase 5 — Test and release checks](phases/phase-5-test-release.md)

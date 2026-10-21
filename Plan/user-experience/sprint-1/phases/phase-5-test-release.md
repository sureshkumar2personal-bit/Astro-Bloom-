# Phase 5 — Test and Release Checks

## Objective

Verify the complete login feature before it is marked ready.

## Manual acceptance matrix

| Scenario | Expected result |
| --- | --- |
| Active user + valid email + password | Session starts and dashboard opens. |
| Active user + valid mobile + password | Session starts and dashboard opens. |
| Invalid password or identifier | Clear generic error; no session is stored. |
| Inactive user | Account-inactive message; no dashboard access. |
| Empty fields | Client-side validation prevents request. |
| API/network failure | Retry-friendly message; page remains usable. |
| Logout | Session is cleared and protected routes redirect to login. |
| Expired access token | Refresh occurs once or the user returns to login safely. |

## Quality checks

- Run the frontend lint, build, and relevant automated tests.
- Test desktop and mobile layouts, including browser zoom.
- Test keyboard navigation, visible focus, labels, error announcements, and contrast.
- Confirm no password or token appears in logs, URLs, analytics events, or error reports.
- Verify API responses and redirects with a real active account and an inactive account.

## Checklist

- [ ] Add automated tests for successful email and mobile login.
- [ ] Add automated tests for invalid credentials, inactive account, and network failure.
- [ ] Add tests for duplicate-submit prevention and accessible error announcements.
- [ ] Add route-guard tests for signed-out, signed-in user, and wrong-role user states.
- [ ] Add refresh-success and refresh-failure tests.
- [ ] Add logout and password-reset session-revocation tests.
- [ ] Run frontend lint and production build successfully.
- [ ] Run backend tests for login, refresh, logout, and password reset successfully.
- [ ] Test the complete flow in a production-like environment using HTTPS and real persistent storage.

## Defects that must be resolved before release

- [ ] Refresh sessions and user lookup must survive backend restarts.
- [ ] Password-reset tokens must not be returned to a normal browser response in production.
- [ ] All protected user routes must enforce authentication and user role.
- [ ] Refresh-token rotation/revocation and logout must be verified with persistent data.
- [ ] Production JWT secrets must be configured securely.

## Release gate

All acceptance scenarios pass, no critical accessibility issues remain, and frontend build/test checks are successful.

# Phase 3 — Registration API

- [x] Require a normalized email address on `POST /api/auth/user/register`.
- [x] Accept mobile and referral code as optional values.
- [x] Hash passwords before storage.
- [x] Create the user and profile in a single database transaction.
- [x] Return a safe duplicate-account error for email or supplied mobile conflicts.
- [x] Update the schema so `users.mobile` permits null values.

## Completion check

- [x] A failed profile insert rolls back user creation.
- [x] Email is normalized to lowercase before uniqueness is checked.
- [x] Existing mobile-based users remain supported.

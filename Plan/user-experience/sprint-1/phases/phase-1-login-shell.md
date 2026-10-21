# Phase 1 — Login Shell and Form ✅ COMPLETE

## Objective

Build the user-login interface at `/user/login` without connecting it to the API yet.

## Build

- Use the shared authentication layout and the user-only `UserLogin` page.
- Show a clear sign-in heading and supporting text.
- Add required fields for `identifier` (email or mobile number) and `password`.
- Keep the password masked by default and give each input a visible label.
- Add a submit button labelled “Sign in”.
- Reserve an inline area for errors and a loading state.
- Do not mix astrologer credentials or terminology into the user form.

## Done when

- `/` redirects to `/user/login`.
- The page is usable on narrow mobile and desktop viewports.
- The fields have labels, appropriate input types, and no console errors.

## Checklist

- [x] Render the login page only at `/user/login`.
- [x] Keep user login separate from astrologer login.
- [x] Add labelled identifier and password fields.
- [x] Set `autocomplete="username"` on identifier and `autocomplete="current-password"` on password.
- [x] Provide a visible password show/hide control with an accessible name.
- [x] Add sign-in loading text and disable the button during submission.
- [x] Confirm responsive layout at mobile and desktop widths.

## Current-project gap to close

The existing form has the required fields and show/hide password control, but it has no submitting/loading state. Add this before this phase is marked complete.

**Status:** All gaps closed. Autocomplete attributes added, password show/hide control present in Field component with accessible `aria-label`, loading state disables button and shows "Signing in..." text.

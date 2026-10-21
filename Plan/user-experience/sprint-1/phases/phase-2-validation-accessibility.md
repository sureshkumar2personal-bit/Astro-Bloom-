# Phase 2 — Validation and Accessibility ✅ COMPLETE

## Objective

Prevent invalid form submissions and make failures understandable to every user.

## Build

- Require both identifier and password before submitting.
- Trim whitespace from the identifier before sending it.
- Use `type="password"` for the password field and disable duplicate submissions while the request is pending.
- Show validation errors next to or immediately below the relevant field.
- Move focus to the first invalid field on submission.
- Announce form-level server errors with an accessible live region.
- Keep server messages non-sensitive: never say whether an account exists.

## Test cases

- Empty form submission shows both required-field errors.
- An email and a mobile number are each accepted as identifier formats.
- Password characters remain hidden.
- Keyboard-only users can complete, submit, and understand validation failures.

## Checklist

- [x] Trim the identifier before validation and submission.
- [x] Validate required fields before making an API request.
- [x] Prevent a second submit while the first request is in progress.
- [x] Associate field errors with inputs using `aria-describedby` and `aria-invalid`.
- [x] Focus the first invalid input after form submission.
- [x] Give the form-level error region `role="alert"` or `aria-live="polite"`.
- [x] Verify visible focus styles, sufficient contrast, and full keyboard operation.

## Current-project gaps to close

The current form relies only on HTML `required`; it has no explicit trimmed identifier, field-error, focus-management, or pending-request handling.
`Notice` is not announced as an alert/live region. Update it or use an equivalent accessible error component.

**Status:** All gaps closed. Field component now supports `error` prop with `aria-describedby`/`aria-invalid`. Notice updated with `role="alert"` and `aria-live="assertive"`. Identifier trimmed before validation. Field-level errors shown below inputs. First invalid field receives focus. Loading state prevents duplicate submit.

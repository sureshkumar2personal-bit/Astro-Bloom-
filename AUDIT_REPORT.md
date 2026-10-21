# CosmicConnect (AstroEvalution) — Backend + Admin Panel Audit Report

Research-only audit. No code was changed. All paths are relative to the repo root.
References use `file:line`. Backend routes live in `backend/src/routes/`, DB schema in
`backend/src/db/schema.sql`, frontend API layer in `frontend/src/api/`, admin pages in
`frontend/src/pages/admin/`.

---

## 1. Scope & Methodology

| Area | Contents | Coverage |
|---|---|---|
| A — Admin panel | `frontend/src/pages/admin/` (21 page files) | Fully read |
| B — Backend | 31 route files, 2 services, `app.js`, middleware, `utils` | Fully inventoried (endpoint grep on every file + targeted body reads) |
| B — Data layer | `db/schema.sql`, `db/seed.js`, `db/migrations/` (002, 003) | Fully read |
| B — Frontend API layer | `frontend/src/api/` (29 files) | Fully read |

Deliverable facts: (1) full backend API surface incl. PostgreSQL vs in-memory storage,
(2) frontend↔backend cross-check with 404 cases, (3) security review, (4) broken/stubbed/
inconsistent items. All queries in the backend use parameterized SQL (`$1`…); no string-
concatenated SQL was found (no SQLi).

---

## 2. Architecture Overview

- **Backend**: Express.js (ESM), JWT auth, bcrypt, multer (memory), helmet, cors (all origins open), express-rate-limit (only on `/api/auth`).
- **DB**: PostgreSQL via `pg.Pool`. Connection string defaults to a **hardcoded dev credential** when `DATABASE_URL` is absent — `db/pool.js:4`.
- **Seed**: `seedDatabase()` runs on every boot (`app.js:93`); idempotent existence checks. Seeds 7 astrologers (password `password123`), reviews, campaigns, subscription plans (silver/gold/platinum), live sessions, platform settings, and the admin `admin2007@admin.com` / `admin123`.
- **Frontend**: React + Vite. `frontend/src/api/client.js` wraps `fetch` with `API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'`, an in-flight refresh-token queue, and `authedFetch` that redirects to `/user/login` on refresh failure.

### Route mount map (`backend/src/app.js:48-82`)

| Mount | Modules | Prefix inside router |
|---|---|---|
| `/api/auth` | auth.routes, session.routes | `user|astrologer|admin/...` (both mounted here) |
| `/api/user` | user.routes, liveUser.routes | `/astrologers`, `/live-sessions` |
| `/api/astrologer` | astrologer.routes, live.routes | `/profile/...`, `/live-sessions` |
| `/api/admin` | admin.routes | `/dashboard/stats`, `/users`, … |
| `/api/astrologer/question-campaigns` | campaign.routes | `/` |
| `/api/user/wallet`, `/api/astrologer/wallet` | wallet.routes (same router twice) | `/balance`, `/astrologer/balance`, `/topup`, `/transactions` |
| `/api/user/question-purchases` | purchase.routes | `/` |
| `/api/user/questions`, `/api/astrologer/questions` | question.routes (same router twice) | `/`, `/astrologer/...` |
| `/api/user/question-disputes`, `/api/astrologer/question-disputes`, `/api/admin/question-disputes` | dispute.routes (same router 3×) | `/`, `/astrologer/...`, `/admin/...` |
| `/api/user/ai` | ai.routes | `/usage`, `/conversations`, `/messages`, `/packs` |
| `/api/free-calculations` | freeCalculation.routes | `/numerology`, `/dasha`, … |
| `/api` (17 modules) | subscription, follow, perks, audience, onboarding, appointment, notification, payment, message, analytics, content, atonement, staff, emergencySlots, emergency, profile, features | long path prefixes |
| `/api/health` | `app.js:84` | — |

Ordering note: `notification` mounts before `features` (`app.js:70` vs `82`), so the duplicate
`GET /user/notifications` (defined in both `notification.routes.js:15` and `features.routes.js:242`) is always served by `notification.routes.js`.

---

## 3. Backend API Surface (all 349 routes)

Count per file from the endpoint grep. `AUTH` = middleware on every route in the group
(`requireAuth('<actor>')`), `PUBLIC` = no auth middleware, `BROKEN` = guard is `requireAuth`
with no actor type → **always 403** (see §6.1).

### 3.1 Auth (`auth.routes.js`, 253 lines)
`PUBLIC`: `POST /user/register`, `/user/login`, `/astrologer/register` (multer fields `identityProof`, `astrologyCertificate`), `/astrologer/login`, `/admin/login`, `/admin/register`, `/refresh-token`. `requireAuth(...)`: `GET /user/me`, `/astrologer/me`, `/admin/me`; `POST /logout`, `/astrologer/logout`, `/admin/logout`.

**Storage = PG writes + in-memory caches.** `users`/`astrologers`/`admins` arrays (`auth.routes.js:11`, `195`) are used as a cache: register writes to PG then pushes to the array; login searches the array first and only falls back to PG if absent; `/user/me` and `/astrologer/me` read **only from the arrays** (`auth.routes.js:160-170`). All `sessions` are purely in-memory (`auth.routes.js:11,46,177-179`), so refresh/logout state is lost on restart and is not shared across processes.

### 3.2 Admin (`admin.routes.js`, 745 lines, 51 routes)
Nearly all use the `ADMIN` guard (`requireAuth('admin')`). Endpoints: `GET /dashboard/stats` (22), `GET/PATCH /users`, `/users/:userId`, `/users/:userId/block` (63-103), `GET/PATCH /astrologers`, `/astrologers/:id/approval`, `/astrologers/:astrologerId/suspend`, `/request-documents`, `/certificates/:certId/verify` (116-209), `GET/PATCH /campaigns...` (220-252), `GET /appointments`, `/appointments/:id`, `GET /emergency`, `GET/PATCH/DELETE /live...` (262-326), `GET /subscriptions`, `/perks` (336-353), `GET/POST /finance/wallets|escrow|transactions`, `POST /finance/escrow/:id/release|refund` (367-442), `GET/PATCH/POST /disputes...` (462-510), `GET /atonements...` (524-542), `GET/PATCH /contents...` (555-580), `GET/POST /notifications`, `/notifications/send` (590-595), `GET /reports/revenue|users|astrologers|questions|refunds` (630-677), `GET /settings`, `PUT /settings/:key` (691-701), `GET /audit-logs` (717).

**Exceptions without any auth guard:** `PATCH /astrologers/:id/approval` at **line 183** (writes both the in-memory array and PG) and the duplicate at **line 734** ("Keep old dev approval route", operates on the in-memory array only). See §6.2.

### 3.3 AI chat (`ai.routes.js`) — `requireAuth('user')`, `PUBLIC /packs`
`GET /usage` (16), `GET/POST /conversations` (43,54), `GET /conversations/:id/messages` (64), `POST /messages` (77), `POST /packs/buy` (192), `GET /packs` (248, public). The "AI" is **not an LLM** — `services/aiKnowledgeBase.js` is a rule-based Vedic-astrology template engine that computes live planetary positions with `astronomy-engine`, classifies intent by keyword matching (`detectAiIntent`, line 100), and renders canned answers. `ai_usage.free_limit` default 5; `decideUsageType` → `free|paid|blocked`.

### 3.4 Analytics (`analytics.routes.js`)
`POST /analytics/event` (8, public, no validation); `GET /astrologer/analytics`, `/astrologer/analytics/earnings`, `/astrologer/analytics/audience` (18-101, astrologer); `GET /admin/analytics` (128, **public — no guard**).

### 3.5 Appointments (`appointment.routes.js`)
Astrologer: `GET/POST /astrologer/slots`, `PUT/DELETE /astrologer/slots/:slotId` (9-36); `GET /astrologer/appointments` (88), `POST /astrologer/appointments/:id/cancel|start-call|end-call` (169-196). User: `GET /user/available-slots/:astrologerId` (41, public), `GET/POST /user/appointments` (72,103), `POST /user/appointments/:id/pay|cancel` (121,149). All parameterized; pay uses `ensureWallet`-style hold + `escrow_records`.

### 3.6 Astrologer (`astrologer.routes.js`) — all `requireAuth('astrologer')`
`GET/PUT /profile/me` (10,37 — `/profile/me` completeness calc: 7 core fields→60 + languages 20 + specializations 20 = 100), `POST /profile/photo` (56, multer), `POST /profile/certificates` (66, multer), `POST /profile/submit-review` (77), `GET /dashboard` (85).

### 3.7 Atonement / remedies (`atonement.routes.js`) — **BROKEN guard**
Every route uses bare `requireAuth` (`32,63,92,108,136,166,187,215,241,256,272,295,368,402,419,429,448,463`) and handlers read `req.user.role` / `req.user.id` (`34-35,65-66,…`). `req.user` is never set by any middleware (the guard sets `req.auth`), and bare `requireAuth` 403s every authenticated request (see §6.1). Feature set: astrologer atonement CRUD + status + notify-user + revenue + discount-codes; user atonement list/detail/mark-started/proofs/pay + discount-code validate. Dead code.

### 3.8 Audience / perks content (`audience.routes.js`) — all `requireAuth('astrologer')`
`GET /astrologer/audience/dashboard|users|users/:userId` (9,45,95); `POST /astrologer/perks/content`, `PATCH .../publish`, `GET /astrologer/perks/content` (127,141,152).

### 3.9 Campaigns (`campaign.routes.js`)
`POST/GET /`, `GET /:campaignId`, `PATCH /:campaignId/activate|pause|stop`, `PUT /:campaignId` — all `requireAuth('astrologer')` (12-126); `GET /astrologer/:astrologerId/active` (159, public). Validation requires `general_question_limit + individual_question_limit === total_slots` (line ~13). `genCode(prefix)` = `PREFIX-<base36 ts>-<4 random chars>` (`campaign.routes.js:9`).

### 3.10 Content (`content.routes.js`) — **BROKEN guard**
All 13 routes use bare `requireAuth` (`21,53,73,96,106,116,136,154,172,189,206,220,233`) and read `req.user.role`/`req.user.id`. Same dead-code class as atonement (§6.1). Covers astrologer content CRUD/publish/unpublish/analytics and user dashboard/free-info/perks/view/notifications.

### 3.11 Disputes (`dispute.routes.js`) — mounted at 3 prefixes
User: `POST /`, `GET /`, `GET /:disputeId`, `POST /:disputeId/messages|escalate` (60-179). Astrologer: `GET /astrologer`, `GET /astrologer/:disputeId`, `PATCH /astrologer/:disputeId/respond|reviewing`, `POST .../messages` (208-298). Admin: `GET /admin/all`, `GET /admin/:disputeId`, `PATCH /admin/:disputeId/resolve|notes`, `POST .../messages` (325-448). Consts: `VALID_REASONS`, `VALID_RESOLUTIONS`, `VALID_ADMIN_RESOLUTIONS`, `VALID_STATUSES`; helpers `getDisputeDetail`, `getDisputeMessages`. Shared router mounted under `/api/user/question-disputes`, `/api/astrologer/question-disputes`, `/api/admin/question-disputes`.

### 3.12 Emergency — **two parallel systems**
- **Old flow** `emergency.routes.js` (operates on `emergency_requests`): user `POST /user/emergency` (25), `POST /user/emergency/:id/pay` (92), `GET /user/emergency` (132), `PATCH /user/emergency/:id/cancel` (160); astrologer `PATCH /astrologer/emergency/toggle` (197), `GET /astrologer/emergency` (211), `PATCH /astrologer/emergency/:id/accept|reject|start|end` (257-342), `PUT/GET /astrologer/rates` (382,405); admin `GET /admin/emergency` (418). `calcPriority` → subscriber 100 else 0.
- **New flow** `emergencySlots.routes.js` (operates on `emergency_slots` + `emergency_request_queue`): astrologer slot CRUD `/astrologer/emergency/slots...` (148-270), dashboard (726); user `GET /user/emergency/astrologers` (291), `GET .../:astrologerId/slots` (320), `POST /user/emergency/request` (363), `POST .../:requestId/pay` (416), `GET /user/emergency/requests` (459), `PATCH .../cancel` (480), `POST .../rating` (520); astrologer queue `GET /astrologer/emergency/requests` (564), `PATCH /astrologer/emergency/:id/accept|reject|start|end` (594-683); `GET /user/emergency/options` (757, static constants).
- **Route shadowing:** `emergencySlots.routes.js` is mounted at `app.js:79` **before** `emergency.routes.js` at `app.js:80`, and both define `PATCH /astrologer/emergency/:requestId/accept|reject|start|end`. The old accept/reject/start/end handlers are therefore unreachable. Consequence: `POST /user/emergency` (old flow) still inserts into `emergency_requests`, but the matched accept/reject handlers query `emergency_request_queue` → the request can never be actioned. Two half-integrated emergency subsystems.

### 3.13 Features (`features.routes.js`) — **mostly BROKEN guard**
Public: `GET /horoscope/daily` (13), `GET /horoscope/daily/all` (22), `POST /horoscope/daily` (28), `GET /astrologers/:id/reviews` (44). **Everything after line 55 uses bare `requireAuth`** → 403 for all (reviews post, schedule, earnings-overview, withdrawals, templates, client-notes, consultation-history, notifications, profile-completion, astrologer reviews/reply). Dead code.

### 3.14 Follow (`follow.routes.js`) — `requireAuth('user')`
`POST /user/follows/:astrologerId` (9), `DELETE /user/follows/:astrologerId` (36), `GET /user/follows/check/:astrologerId` (47). **Bug at line 27**: `INSERT INTO user_follows (user_id,astrologer_id,status) VALUES ($1,$2,$2)` — `status` is bound to `astrologerId`, not `'active'`; the code then immediately "repairs" it with an `UPDATE ... SET status='active'` at line 30. Works only because the follow rows are never used before the UPDATE, but it is a genuine defect.

### 3.15 Free calculations (`freeCalculation.routes.js`) — all **PUBLIC**
`POST /numerology|dasha|birth-chart|nakshatra|panchangam|marriage-matching|baby-names` (15-63). Delegates to `services/freeCalculation.service.js` (astronomy-engine sidereal math; full 27-nakshatra table, dasha/bhukti timeline, porutham scoring, baby-name lookup). No auth, no rate limit.

### 3.16 Live streaming
- Astrologer `live.routes.js`: `POST/GET /live-sessions`, `PUT /live-sessions/:id`, `POST /live-sessions/:id/cancel|start|end`, `GET /live-sessions/:id/questions`, `POST /live-questions/:id/answering|answered|skip` (11-243). Room id = `room_${id.slice(0,8)}`.
- User `liveUser.routes.js`: `GET /live-sessions`, `GET /live-sessions/:id`, `GET /live-sessions/:id/access-check`, `POST .../pay-entry|join`, `POST .../questions/purchase`, `POST .../questions`, `GET .../my-question`, `GET/POST .../chat` (12-349). User module imports `ensureWallet` from `wallet.routes.js:6`.

### 3.17 Messaging (`message.routes.js`)
`GET /user/conversations`, `GET /astrologer/conversations`, `GET .../:id/messages`, `POST .../:id/messages`, `POST /user/start-conversation`, `POST .../read`, `DELETE .../messages/:messageId` (24-141). `findOrCreateConversation` helper (`8-22`, direct conversations only).

### 3.18 Notifications (`notification.routes.js`)
`GET /user/notifications`, `GET /astrologer/notifications`, `PATCH /user|astrologer/notifications/read`, `GET/PUT /user|astrologer/notification-preferences` (15-88). `createNotification` helper writes `notifications(actor_type,actor_id,type,title,body,data)`.

### 3.19 Onboarding (`onboarding.routes.js`)
`GET/PUT /user/profile`, `PUT /user/preferences`, `POST /user/verify-otp`, `POST /user/send-otp` (10-74, note: `send-otp` requires `requireAuth('user')`), `GET/PUT /astrologer/onboarding` (87-107). OTP stored in `otp_verifications`.

### 3.20 Payment / escrow (`payment.routes.js`)
`GET /user/payments`, `/astrologer/payments`, `/user/escrow`, `/astrologer/escrow`, `/user/payment-summary`, `/astrologer/earnings-summary`, `/user/receipt/:paymentId` (8-125, guarded). **`POST /admin/escrow/:escrowId/release` (43) and `POST /admin/escrow/:escrowId/refund` (71) have NO auth middleware** — see §6.3. Duplicate of the ADMIN-guarded `/admin/finance/escrow/:id/release|refund` in admin.routes.

### 3.21 Perks (`perks.routes.js`)
`GET /user/perks` (9), `POST /user/perks/:perkId/use` (29). Joins `user_perks` + `astrologers` + `subscription_plans`.

### 3.22 Profile (user + astrologer; `profile.routes.js`)
User: `GET /user/profile/full`, `PATCH /user/profile`, `POST /user/profile/photo`, full `user_astrology_profiles` CRUD + default + history (12-239). Astrologer: `GET/PATCH /astrologer/profile`, `PUT /astrologer/profile/specializations|languages`, `POST /astrologer/profile/documents`, `GET /astrologer/profile/history` (258-360). Public-ish: `GET /user/astrologers/:astrologerId/profile` (375, **requires user auth** — inconsistent with the public explore endpoints in user.routes.js). Profile edits are versioned in `user_profile_edit_history` / `astrologer_profile_edit_history`.

### 3.23 Purchases (`purchase.routes.js`)
`POST /` (13, creates `question_purchases` + `genCode`), `GET /:purchaseId` (75), `GET /` (95). Imports `ensureWallet` from `./wallet.routes.js:6`.

### 3.24 Questions (`question.routes.js`)
`POST /` (20), `GET /:questionId/tracking` (72, `TIMELINE_STAGES` + `buildTimeline`: question_pending→submitted→received_by_astrologer→under_review→answered→completed), `GET /` (101). Astrologer: `GET /astrologer/queue` (119), `PATCH /astrologer/:questionId/start-review` (141), `POST /astrologer/:questionId/answer` (151). Requires `purchase_status='question_pending'` before submission.

### 3.25 Session management (`session.routes.js`) — mounted at `/api/auth`
`POST /user/forgot-password`, `POST /astrologer/forgot-password`, `POST /user/reset-password`, `POST /astrologer/reset-password` (11-61). Password reset tokens are bcrypt-hashed, expire in 1 h, and the reset token is **returned in the response body**. `GET/DELETE /user|astrologer/sessions...` (81-120) — these live under `/api/auth`, **not** `/api/user` (see §5 mismatch).

### 3.26 Staff (`staff.routes.js`)
Public: `POST /astrologer/staff/accept-invite` (44), `/astrologer/staff/login` (82), `/astrologer/staff/refresh-token` (127). Owner (`requireAuth('astrologer')`): `GET/POST /astrologer/staff`, `GET /astrologer/staff/activity-logs`, `GET /astrologer/staff/:staffId`, `PUT /astrologer/staff/:staffId/permissions`, `PATCH .../disable|enable`, `DELETE .../:staffId`, `POST /astrologer/staff/kill-switch`, `/kill-switch/restore`, `GET /astrologer/staff/security-events` (173-481). Consts: `MODULES` (15), `ACTIONS` (9), `OWNER_ONLY_MODULES=['staff_management','wallet']`, `OWNER_ONLY_ACTIONS=['withdraw','manage_permissions']`; helpers `logActivity`→`astrologer_staff_activity_logs`, `logSecurityEvent`→`astrologer_security_events`. Staff JWT carries `{sub, actorType:'staff', role, astrologerId, permissions}` (`staff.routes.js:104`).

### 3.27 Subscriptions (`subscription.routes.js`)
Astrologer: `POST/GET /astrologer/subscription-plans` (12,40). Public: `GET /astrologers/:astrologerId/subscription-plans` (58). User: `POST /user/subscriptions` (77, subscribe + wallet hold), `GET /user/subscriptions` (162), `POST /user/subscriptions/:subId/cancel|renew|upgrade|downgrade` (191-328). Duplicate `plan_code` → PG error `23505`.

### 3.28 User explore (`user.routes.js`)
`GET /astrologers` (9, public — Screen 8 explorer with filters search/specialization/language/minRating/onlineStatus/appointmentAvailable/emergencyAvailable/liveNow/questionAvailable/minExperience/maxPrice/page/limit/sortBy), `GET /astrologers/:astrologerId` (60, public), `GET /astrologers/:astrologerId/reviews` (95, public), `GET /dashboard` (108, user).

### 3.29 Wallet (`wallet.routes.js`)
`GET /balance` (23), `GET /astrologer/balance` (35), `POST /topup` (47), `GET /transactions` (62), `GET /astrologer/transactions` (75). Exports `ensureWallet` (`10`) — SELECT `wallet_accounts`, else INSERT + RETURNING — imported by purchase/liveUser/subscription routes. Balance fields: `available_balance`, `hold_balance`, `pending_balance`, `currency`.

---

## 4. Data Layer

- `db/schema.sql` (1353 lines) is the authoritative schema: **no migration 001 exists** — only `002_new_features.sql` and `003_emergency_slots.sql` in `db/migrations/`; schema.sql is applied wholesale. It covers users/user_profiles, astrologers (+languages, specializations, documents, certificates, reviews, service_status), auth_sessions, question_campaigns(+categories/languages), wallet_accounts/transactions, question_purchases, escrow_records, questions/attachments/answers, live_question_queue, question_disputes/messages, subscription_plans(+benefits), user_follows, user_subscriptions, user_perks, astrologer_content_perks, live_sessions/access/questions/chat_messages/events/co_hosts/tips, payments, user_preferences, otp_verifications, password_resets, active_sessions_log, appointment_slots, appointments, astrologer_rates, emergency_requests, call_sessions, notifications(+preferences), conversations/members/messages, analytics_events, earnings_records, ai_packs/usage/conversations/messages/pack_purchases, contents(+selected_users/views/attachments/notifications), atonements(+status_history/proofs/payments/revenues), discount_codes(+usages), astrologer_staff_accounts(+permissions/sessions/activity_logs), astrologer_security_events, user_astrology_profiles(+edit_history), astrologer_profile_edit_history, admin_accounts, platform_settings, admin_audit_logs, admin_notifications, emergency_slots, emergency_request_queue, emergency_voice_notes.
- `db/seed.js` writes all the above and seeds demo wallet `₹5000` for mobile `8888888888`, platform settings (20% commission, 18% GST, 72 h escrow auto-release, 60 s emergency accept timeout, AI free limit 5), and live sessions.
- **Unused tables** (no route reads/writes found during audit): `active_sessions_log`, `earnings_records`, `live_co_hosts`, `live_tips`, `live_session_events`, `call_sessions` (except insertion side of old emergency flow), `astrologer_reviews` (used by seed + `features.routes` GET, which is dead), `admin_audit_logs` (only via `admin.routes` `auditLog` helper), `content_attachments`, `question_attachments` (insert-only).

---

## 5. Frontend API Layer & Cross-Check (matching / 404)

`client.js` exposes `apiGet/Post/Put` (public) and `apiAuthGet/Post/Put/Patch/Delete` (Bearer + auto-refresh). Paths are relative to `/api`.

### Matches (representative)
All of adminApi (45 calls) ↔ admin.routes (except the two unguarded approval PATCHes still match the URL); walletApi (`/user/wallet/balance`, `/astrologer/wallet/astrologer/balance`); purchaseApi, questionApi (`/astrologer/questions/astrologer/:id/start-review|answer`), disputeApi (3 prefixes), aiChatApi, appointmentApi, astrologerApi, astrologerLiveApi, liveApi, messageApi, notificationApi, onboardingApi, perksApi, profileApi, subscriptionApi (public plans via raw fetch), campaignApi (`/astrologer/question-campaigns/astrologer/:id/active` via raw fetch), freeCalculationApi, followApi, audienceApi, contentApi, atonementApi, emergencyApi (slot-based flow), analyticsApi, paymentApi, sessionApi forgot/reset-password (`/auth/user/forgot-password` ✓).

### MISMATCHES → 404
| Frontend caller | Frontend path | Backend actual | Result |
|---|---|---|---|
| `sessionApi.js:7-12` | `/user/sessions`, `/astrologer/sessions`, `DELETE /user/sessions/:id` (all via `apiAuthX`) | Backend is mounted at `/api/auth` → `/api/auth/user/sessions...` (`app.js:68`, `session.routes.js:81-120`) | **404 — every session list/revoke call** |
| `staffApi.js:3` | `BASE = '/api/astrologer/staff'` used with `apiAuthGet/apiPost/...` which prepend `/api` again | `/api/astrologer/staff/...` | **404 — `http://…/api/api/astrologer/staff/...`; entire staff feature dead from the frontend** (all 14 functions) |

Everything else resolves. The two broken-guard modules (content/atonement/features) match URLs but return 403 at the middleware, so those feature pages are dead server-side regardless of the URL match.

---

## 6. Security Review

### 6.1 Broken auth guard — `requireAuth` called without an actor type
`middleware/auth.js:9-19`: `requireAuth(actorType)` rejects when `payload.actorType !== actorType`. Called bare (no argument), `actorType === undefined` → every request with a valid JWT gets 403, and no JWT gets 401. **All routes in `content.routes.js`, `atonement.routes.js`, and the post-line-55 half of `features.routes.js` are therefore dead — every call returns 403.** Additionally, their handlers read `req.user.role` / `req.user.id`, but the middleware sets `req.auth` (payload has `sub`, not `id`/`role`), so even a guard fix would crash them. This is both a functionality and a security-class bug (misuse of the shared guard).

### 6.2 Unauthenticated admin actions (CRITICAL)
- `auth.routes.js:218` — **`POST /admin/register` is public**. Anyone with an `@admin.com` email whose 4-digit year is 2005–2010 (e.g. `hacker2007@admin.com`) can create an admin, get tokens, and return `success`. Full privilege escalation. Seed admin is `admin2007@admin.com / admin123` (publicly visible in `seed.js:129-138`).
- `admin.routes.js:183` and `admin.routes.js:734` — **`PATCH /astrologers/:id/approval` has no middleware**; anyone can approve/reject/suspend astrologers. Line 734 is a leftover duplicate operating only on the in-memory array.
- `payment.routes.js:43,71` — **`POST /admin/escrow/:id/release|refund` unauthenticated**; anyone can move escrow money.

### 6.3 Unauthenticated non-admin reads
- `analytics.routes.js:128` — `GET /admin/analytics` public (dashboard aggregates).
- `features.routes.js:28` — `POST /horoscope/daily` public (write path, no role check).
- `campaign.routes.js:159` and `subscription.routes.js:58` — public reads by design.

### 6.4 Hardcoded secrets / credentials
- `middleware/auth.js:4-5` — `process.env.JWT_ACCESS_SECRET || 'dev-access-secret'`, `JWT_REFRESH_SECRET || 'dev-refresh-secret'`. If env vars are unset in production, tokens are forgeable.
- `db/pool.js:4` — fallback connection `postgresql://suresh_kumar:12345@127.0.0.1:5432/AstroAuth`.

### 6.5 In-memory session/identity cache vs DB
Sessions (`auth.routes.js:11,46`) are memory-only: restarts drop every refresh token (users forced to re-login), and multi-process deployments cannot share sessions. `/user/me`, `/astrologer/me`, `/admin/me` read only from process-local arrays (`auth.routes.js:160-170,241-245`): after an admin blocks a user in the DB, the in-memory copy still logs the user in until restart; on a second instance the user is a 404.

### 6.6 Miscellaneous
- Rate limiting applies only to `/api/auth` (`app.js:46`); all other routes (including free AI, emergency booking, follow spam) are unthrottled.
- `cors()` wide open (`app.js:44`).
- Password reset token is returned in the HTTP response body (`session.routes.js`), enabling account takeover if any API/log leaks responses; also makes the "email" reset flow purely cosmetic (no mailer exists).
- Email-domain control gates (admin `@admin.com` 2005–2010, astrologer `@asmail.com` 2017–3000) are quirky and redundant with the public `/admin/register`.
- Uploads (identity/certificates/photos) are multer in-memory; only file **metadata** is persisted (`auth.routes.js:129-132`, `astrologer_documents`). No file is stored or served — uploads are effectively no-ops.
- `genCode` uses `Math.random()` (seed.js:6 and route helpers) — weak uniqueness for purchase/campaign codes.
- `follow.routes.js:27` — `VALUES ($1,$2,$2)` status bug (see §3.14).
- Auth JWT has a 1 h access token; frontend auto-refresh queue in `client.js` is sound (single-flight refresh, queue replay).

### 6.7 What is done right
All SQL is parameterized; bcrypt cost 12 on registration (10 for seeds); `helmet()` active; refresh tokens are stored hashed; escrow holds use wallet `hold_balance`; ownership filters (`WHERE ... AND user_id/astrologer_id/creator_id = <auth subject>`) are consistently applied in the guarded modules; multer size/mime limits enforced (5 MB, image/pdf).

---

## 7. Admin Panel (AREA A) Findings

All 21 pages under `frontend/src/pages/admin/` were reviewed. Mapping of page → API functions used (all via `adminApi.js` unless noted):

| Page | Data source | Status |
|---|---|---|
| AdminDashboardPage | `getAdminDashboardStats()` (`adminApi.js:7`) | Real (endpoint `admin.routes.js:22`) |
| AdminAnalyticsPage | `getAdminAnalytics()` (`analyticsApi.js:6` → `/admin/analytics`) | Endpoint exists but **public** (§6.3) |
| AdminUserManagementPage | `getAdminUsers`, `getAdminUserDetail`, `blockUser` | Real |
| AdminAstrologerManagementPage | `getAdminAstrologers`, `getAdminAstrologerDetail`, `suspendAstrologer` | Real |
| AdminAstrologerVerificationPage | `getAstrologerApprovalDetail`, `approveAstrologer`, `requestMoreDocuments`, `verifyCertificate` | Real; `approveAstrologer` hits the **unauthenticated** PATCH (§6.2) |
| AdminAppointmentEmergencyPage | `getAdminAppointments`, `getAdminAppointmentDetail`, `getAdminEmergency` | Real |
| AdminLiveStreamingPage | `getAdminLive`, `stopLiveSession`, `approveLiveSession`, `removeLiveSession` | Real |
| AdminSubscriptionPerksPage | `getAdminSubscriptions`, `getAdminPerks` | Real |
| AdminWalletFinancePage | `getAdminWallets`, `getAdminEscrow`, `releaseEscrow`, `refundEscrow`, `getAdminTransactions` | Real; `releaseEscrow`/`refundEscrow` call the **ADMIN-guarded** `/admin/finance/...` (good), but `paymentApi.js:7-8` exposes the unguarded duplicate (§6.2) |
| AdminQuestionCampaignPage | `getAdminCampaigns`, `getAdminCampaignDetail`, `pauseCampaign`, `stopCampaign` | Real |
| AdminDisputePage | `getAdminDisputes`, `getAdminDisputeDetail`, `resolveAdminDispute`, `updateAdminDisputeNotes`, `sendAdminDisputeMsg` | Real |
| AdminDisputeManagementPage | — | **Stub**: pure redirect to `/admin/disputes` (no list) |
| AdminAtonementPage | `getAdminAtonements`, `getAdminAtonementDetail` | Endpoints exist; atonement module guard is broken (§6.1) |
| AdminContentManagementPage | `getAdminContents`, `approveContent`, `rejectContent`, `removeContent` | Endpoints exist; content module guard is broken (§6.1) |
| AdminNotificationManagementPage | `getAdminNotificationsList`, `sendAdminNotification` | Real |
| AdminReportsAnalyticsPage | `getAdminRevenueReport`, `getAdminUserReport`, `getAdminAstrologerReport`, `getAdminQuestionReport`, `getAdminRefundReport` | Real |
| AdminPlatformSettingsPage | `getAdminSettings`, `updateAdminSetting` | Real |
| AdminAuditLogsPage | `getAdminAuditLogs` | Real |
| AdminStaffRolesPage | — | **Stub**: fully static `ROLES` const, no API call |
| AdminLoginPage / AdminRegisterPage | `adminLogin`, `adminLogout`, `adminMe` (+ public `admin/register` reachable) | Real; register = privilege escalation vector (§6.2) |

---

## 8. Summary — Highest-Impact Findings

1. **CRITICAL** Public `POST /admin/register` — anyone becomes admin (`auth.routes.js:218`).
2. **CRITICAL** Unauthenticated `PATCH /astrologers/:id/approval` (×2) — anyone approves/rejects astrologers (`admin.routes.js:183`, `734`).
3. **CRITICAL** Unauthenticated escrow release/refund (`payment.routes.js:43,71`).
4. **HIGH** `requireAuth()` called bare 403s everyone → content, atonement, and half of features are dead code (`content.routes.js:21+`, `atonement.routes.js:32+`, `features.routes.js:55+`).
5. **HIGH** Staff feature dead from the frontend: `staffApi.js:3` double `/api` prefix → all calls 404.
6. **HIGH** Session-management APIs 404: backend under `/api/auth`, frontend calls `/api/user|astrologer/sessions` (`app.js:68`, `sessionApi.js:7-12`).
7. **HIGH** Hardcoded JWT secret + DB credential fallbacks (`middleware/auth.js:4-5`, `db/pool.js:4`).
8. **MEDIUM** Two divergent emergency systems; old `emergency_requests` rows orphaned by route shadowing (`app.js:79-80`, `emergency.routes.js:257-342` vs `emergencySlots.routes.js:594-683`).
9. **MEDIUM** In-memory session/identity caches make refresh/logout/blocking non-persistent and instance-local (`auth.routes.js:11,160-179`).
10. **LOW/MEDIUM** `follow.routes.js:27` wrong-column INSERT; reset token returned in body; uploads persist metadata only; `admin/analytics` public; rate limit only on `/api/auth`; wide-open CORS.
11. **Consistency** Admin analytics served by `analytics.routes.js` (public) rather than `admin.routes.js`; astrologer public-profile endpoint requires user auth (`profile.routes.js:375`); `features.routes.js` and `notification.routes.js` duplicate `GET /user/notifications`.

---

## 9. Suggested Next Steps (if any)

- Gate `/admin/register`, `PATCH /astrologers/:id/approval`, and `/admin/escrow/:id/release|refund` behind `requireAuth('admin')`.
- Replace bare `requireAuth` with `requireAuth('astrologer'|'user')` and change `req.user.*` to `req.auth.*` in content/atonement/features.
- Fix `staffApi.js` base to `/astrologer/staff`; move session routes (or their mount) to `/api/user|astrologer/sessions`; drop the duplicate approval route and the legacy emergency flow (or fully wire it).
- Move JWT secrets and DB credentials to env-only (fail fast when missing).

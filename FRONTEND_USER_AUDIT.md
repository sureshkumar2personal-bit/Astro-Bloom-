# CosmicConnect (AstroEvalution) — Frontend User-Side Audit Report

Research-only audit. No code was changed. All paths are relative to the repo root.
References use `file:line`. Frontend pages live in `frontend/src/pages/user/`, shared UI in
`frontend/src/components/common/` and `frontend/src/components/astrologers/`, API wrappers in
`frontend/src/api/`, backend routes in `backend/src/routes/`.

Companion document: `AUDIT_REPORT.md` (backend + admin audit). This report covers **every**
file under `pages/user/` (51 files), `components/common/` (8 files),
`components/astrologers/` (7 files), the two shared hooks, and the route table in
`frontend/src/routes/AppRoutes.jsx`. Every endpoint referenced by these pages was cross-checked
against the backend route table.

**Verdict in one line:** the user flows that work are the paid question flow, wallet, payments,
appointments, subscriptions, AI chat, live sessions, emergency slots, free calculations,
horoscope, messaging, and profile — but several visible "features" are dead server-side
(notifications, consultation history, remedies/atonements, free-info content, sessions),
two screens are outright placeholders (video call, muhurtham), and the app's landing page is
unreachable to guests.

---

## 1. Feature Inventory

### 1.1 Pages (`pages/user/`, 51 files) — status key

| # | Page file | Route | Backend feed | Status |
|---|---|---|---|---|
| 1 | AuthPages.jsx (`UserRegister`/`UserLogin`) | `/user/register`, `/user/login` | `POST /auth/user/register`, `/auth/user/login` | ✅ wired |
| 2 | ForgotPasswordPage.jsx | `/user/forgot-password`, `/astrologer/forgot-password` | `POST /auth/user\|astrologer/forgot-password`, `.../reset-password` (session.routes.js) | ✅ wired (token returned in body) |
| 3 | OnboardingPage.jsx | `/user/onboarding` | `GET/PUT /user/profile`, `PUT /user/preferences` | ✅ wired |
| 4 | ExploreAstrologersPage.jsx | `/user/astrologers` | `GET /user/astrologers` (public) via `useAstrologers` | ✅ wired |
| 5 | AstrologerProfilePage.jsx | `/user/astrologers/:id` | `GET /user/astrologers/:id`, `/astrologers/:id/subscription-plans`, `GET /user/follows/check/:id` | ✅ wired |
| 6 | AppointmentBookingPage.jsx | `/user/astrologers/:id/book` | `GET /user/available-slots/:id`, `POST /user/appointments`, `POST /user/appointments/:id/pay` | ✅ wired |
| 7 | VideoCallPage.jsx | `/user/appointments/:id/call` | — (none) | 🚧 **placeholder** |
| 8 | UserAppointmentsPage.jsx | `/user/appointments` | `GET /user/appointments`, `POST .../:id/cancel` | ✅ wired |
| 9 | QuestionPurchasePage.jsx | `/user/question-purchase/:campaignId` | raw fetch → wallet + `/user/astrologers`, `POST /user/question-purchases` | ✅ wired (raw fetch) |
| 10 | PurchaseSuccessPage.jsx | `/user/question-purchase/success/:purchaseId` | raw fetch → `GET /user/question-purchases/:purchaseId` | ✅ wired (raw fetch) |
| 11 | SubmitQuestionPage.jsx | `/user/submit-question/:purchaseId` | raw fetch → `GET /user/question-purchases/:id`, `POST /user/questions` | ✅ wired (raw fetch) |
| 12 | QuestionTrackingPage.jsx | `/user/questions/:questionId` | raw fetch → `GET /user/questions/:id/tracking` | ✅ wired (raw fetch) |
| 13 | MyQuestionsPage.jsx | `/user/questions` | raw fetch → `GET /user/questions` | ✅ wired (raw fetch) |
| 14 | WalletPage.jsx | `/user/wallet` | raw fetch → `/user/wallet/balance\|topup\|transactions` | ✅ wired (raw fetch) |
| 15 | DisputePage.jsx | `/user/dispute/:questionId` | raw fetch → `POST /user/question-disputes` | ✅ wired (raw fetch) |
| 16 | UserDisputeListPage.jsx | `/user/disputes` | `GET /user/question-disputes` | ✅ wired |
| 17 | UserDisputeDetailPage.jsx | `/user/disputes/:disputeId` | `GET .../:id`, `POST .../messages`, `POST .../escalate` | ✅ wired |
| 18 | UserSubscriptionsPage.jsx | `/user/subscriptions` | `GET /user/subscriptions` + renew/upgrade/downgrade/cancel | ✅ wired |
| 19 | SubscriptionCheckoutPage.jsx | `/user/subscriptions/:id/subscribe` | `GET /astrologers/:id/subscription-plans` (public), `POST /user/subscriptions` | ✅ wired |
| 20 | UserNotificationBellPage.jsx | `/user/notifications-bell` (nav target) | `/user/notifications`, `unread-count`, `:id/read`, `read-all` | ❌ **broken** (see §2.2) |
| 21 | NotificationCenterPage.jsx | `/user/notifications` (unlinked) | `GET /user/notifications`, `PATCH /user/notifications/read` | ⚠️ works, but orphaned |
| 22 | NotificationPreferencesPage.jsx | `/user/notification-preferences` | `GET/PUT /user/notification-preferences` | ✅ wired |
| 23 | PaymentHistoryPage.jsx | `/user/payments` | `GET /user/payments`, `/user/payment-summary`, `/user/receipt/:id` | ✅ wired |
| 24 | ChatPage.jsx | `/user/messages` | `GET /user/conversations`, messages, start, read | ✅ wired |
| 25 | AiChatPage.jsx | `/user/ai-chat` | `/user/ai/usage\|conversations\|messages\|packs` | ✅ wired |
| 26 | LiveLobbyPage.jsx | `/user/live` | `GET /user/live-sessions` | ✅ wired |
| 27 | LiveRoomPage.jsx | `/user/live/:id` | `GET .../access-check`, `join`, `chat`, `my-question` | ✅ wired |
| 28 | LiveQuestionPurchasePage.jsx | `/user/live/:id/buy-question` | `POST /user/live-sessions/:id/questions/purchase` | ✅ wired |
| 29 | SubmitLiveQuestionPage.jsx | `/user/live/:id/submit-question` | `GET .../:id`, `GET .../my-question`, `POST .../questions` | ✅ wired |
| 30 | DailyHoroscopePage.jsx | `/user/horoscope` | `GET /horoscope/daily/all`, `/horoscope/daily?sign=` (public) | ✅ wired |
| 31 | MuhurthamPage.jsx | `/user/muhurtham` | — (none) | 🚧 **fake/static** |
| 32 | AstrologerReviewsPage.jsx | `/user/astrologers/:id/reviews` | `GET /astrologers/:id/reviews` (public) | ✅ wired |
| 33 | ConsultationHistoryPage.jsx | `/user/consultation-history` | `GET /user/consultation-history` | ❌ **403** (bare requireAuth) |
| 34 | FreeCalculationsPage.jsx | `/user/free-calculations` | — (hub) | ✅ wired |
| 35 | NumerologyPage.jsx | `/user/free-calculations/numerology` | `POST /free-calculations/numerology` | ✅ wired |
| 36 | BirthChartPage.jsx | `/user/free-calculations/birth-chart` | `POST /free-calculations/birth-chart` | ✅ wired |
| 37 | NakshatraPage.jsx | `/user/free-calculations/nakshatra` | `POST /free-calculations/nakshatra` | ✅ wired |
| 38 | DasaBhuktiPage.jsx | `/user/free-calculations/dasha` | `POST /free-calculations/dasha` | ✅ wired |
| 39 | MarriageMatchingPage.jsx | `/user/free-calculations/marriage-matching` | `POST /free-calculations/marriage-matching` | ✅ wired |
| 40 | PanchangPage.jsx | `/user/free-calculations/panchang` | `POST /free-calculations/panchangam` | ✅ wired |
| 41 | BabyNamePage.jsx | `/user/free-calculations/baby-names` | `POST /free-calculations/baby-names` | ✅ wired |
| 42 | UserFreeInformationPage.jsx | `/user/contents/free-information` | `GET /user/contents/free-information` | ❌ **broken** (bare requireAuth + auth-only api) |
| 43 | UserContentDetailPage.jsx | `/user/contents/:contentId` | `GET /user/contents/:id`, `POST .../view` | ❌ **403** (bare requireAuth) |
| 44 | UserPerksPage.jsx | `/user/contents/perks` | `GET /user/contents/perks` | ❌ **403** (bare requireAuth) |
| 45 | UserAtonementHistoryPage.jsx | `/user/atonements` | `GET /user/atonements` | ❌ **403** (bare requireAuth) |
| 46 | UserAtonementDetailPage.jsx | `/user/atonements/:id` | `GET .../:id`, `mark-started`, `proofs`, `pay` | ❌ **403** (bare requireAuth) |
| 47 | UserEmergencyCallsPage.jsx | `/user/emergency-calls` | slot flow: `/user/emergency/astrologers`, `slots`, `request`, `requests`, `rating`, `options` | ✅ wired |
| 48 | ActiveSessionsPage.jsx | `/user/sessions`, `/astrologer/sessions` | `GET/DELETE /user/sessions...` | ❌ **404** (mount mismatch) |
| 49 | UserProfilePage.jsx | `/user/profile` | `GET /user/profile/full`, astrology-profiles default/delete | ✅ wired |
| 50 | UserProfileEditPage.jsx | `/user/profile/edit` | `GET /user/profile/full`, `PATCH /user/profile` | ✅ wired |
| 51 | UserFamilyProfileFormPage.jsx | `/user/profile/family/...` | astrology-profile get/create/update | ✅ wired |

### 1.2 Shared components (`components/common/`, 8 files)

| File | Role | Notes |
|---|---|---|
| AuthLayout.jsx | Auth-screen chrome (eyebrow/title/aside) | Branded copy, used by register/login/application-status |
| Brand.jsx | Logo | Pure presentational |
| Field.jsx | Form field wrapper | Used by auth + forgot-password |
| Notice.jsx | Inline message banner | Used widely |
| ProtectedRoute.jsx | Route guard | **LocalStorage token presence check only — no server verification** |
| QuickAskButton.jsx | Floating "Quick Ask" FAB | **Dead endpoint** (`/user/question-campaigns/active`) → always falls back |
| Shell.jsx | Nav shell (guest / user / astrologer / admin) | Nav links: `/user/notifications-bell`, `/user/contents/free-information` are the two broken destinations |
| StarRating.jsx | Rating display | Used in AstrologerCard / ReviewList |

### 1.3 Astrologer components (`components/astrologers/`, 7 files)

| File | Role | Status |
|---|---|---|
| AstrologerCard.jsx | Explore list card + campaign offer badge | ✅ wired to `questionOffers`/`questionOffer` |
| AstrologerFilters.jsx | Explore filter bar | ✅ wired to `useAstrologers` query params |
| AstrologerProfileHeader.jsx | Profile hero (name/rating/stats/actions) | ✅ wired |
| CertificateUploader.jsx | Astrologer cert upload (multipart) | ✅ (astrologer side) |
| ProfileCompletenessCard.jsx | Profile completion meter | ✅ (astrologer side) |
| ReviewList.jsx | Profile review strip | ✅ wired |
| ServiceActionPanel.jsx | Book/Ask/Emergency/Live CTA panel | ✅ wired; Emergency CTA routes to `/user/emergency-calls` |

### 1.4 Hooks

| Hook | Feed | Status |
|---|---|---|
| `hooks/useAstrologers.js` | `GET /user/astrologers` → `{items, pagination}` | ✅ wired |
| `hooks/useAstrologerProfile.js` | `GET /user/astrologers/:id`, `GET /user/astrologers/:id/reviews` | ✅ wired |

---

## 2. API Wiring — Verified Findings

Backend base: `VITE_API_BASE_URL || 'http://localhost:5000/api'` (`api/client.js:1`).
`apiGet/Post/Put` = public; `apiAuth*` = Bearer + single-flight 401 refresh queue; on refresh
failure `clearSession()` + `window.location.href='/user/login'` (`client.js:57-82`).

### 2.1 Blockers caused by the backend (all covered in `AUDIT_REPORT.md`, user impact listed here)

**a) Bare `requireAuth` = hard 403.** `middleware/auth.js:9` is `(actorType) => (req,res,next)=>…`.
Passed without an argument (e.g. `router.get(..., requireAuth, ...)`), Express calls it with
`actorType = req`, so `payload.actorType !== actorType` is always true → 403 for any valid token
(401 without a token). Every route in `content.routes.js`, `atonement.routes.js`, and the
post-line-55 half of `features.routes.js` is dead. User pages that die from this:

- `UserFreeInformationPage` — `GET /user/contents/free-information` (content.routes.js:154)
- `UserPerksPage` — `GET /user/contents/perks` (content.routes.js:172)
- `UserContentDetailPage` — `GET /user/contents/:id`, `POST .../view` (content.routes.js:189,206)
- `UserAtonementHistoryPage` / `UserAtonementDetailPage` — atonement.routes.js:215,241,256,272,295
- `ConsultationHistoryPage` — features.routes.js:226
- `UserNotificationBellPage` — unread-count/mark-read/read-all (features.routes.js:253,258,263)
- Review submission (if it existed) — `POST /astrologers/:id/reviews` (features.routes.js:55)

**b) Session endpoints 404.** Backend session list/revoke routes live under `/api/auth`
(`app.js:68` mounting `session.routes.js:81-120`), but `api/sessionApi.js:7-12` calls
`/user/sessions`, `/astrologer/sessions`, `/user/sessions/:id` → `/api/user/sessions...` **404**.
`ActiveSessionsPage` and both nav links (`/user/sessions` AppRoutes.jsx:138, `/astrologer/sessions` :183) are dead.

### 2.2 Duplicate `GET /user/notifications` — route shadowing

Two backend handlers define the same route: `notification.routes.js:15`
(→ `{ data: { notifications, unreadCount } }`, camelCase, max 50) and `features.routes.js:242`
(→ `{ data: { items, total, unreadCount } }`, snake_case, paginated). `notification` is mounted
before `features` (`app.js:70` vs `:82`), so **the first handler always wins** for the list call.

- `UserNotificationBellPage` (the nav-linked page, Shell.jsx:138) calls
  `/user/notifications?page=1&limit=20` (UserNotificationBellPage.jsx:16) and reads
  `notifs.data.items` / `notifs.data.total` (:20-21) — both `undefined` under the winning handler
  → **list is always empty**. Its other three calls (unread-count :17, mark-read :31, read-all :37)
  hit `features.routes.js` which is bare-`requireAuth` → **403**. Net: the page shows the empty
  "All caught up" state and its badge/buttons silently do nothing.
- `NotificationCenterPage` (AppRoutes.jsx:156, NOT linked in Shell) reads
  `r.data.notifications` / `r.data.unreadCount` (NotificationCenterPage.jsx:12) and
  `PATCH /user/notifications/read` (notification.routes.js:43, properly guarded) — **this one
  actually works**, but users cannot navigate to it.

### 2.3 Landing page is unreachable to guests (and broken for logged-in users)

`/` redirects to `/user/contents/free-information` (AppRoutes.jsx:120); the route is **not**
wrapped in `ProtectedRoute` and is listed as a public "Free Info" nav item (Shell.jsx:143).
Yet `contentApi.getFreeInformationContents` uses `apiAuthGet` (contentApi.js:16):

- **Guest:** no token → 401 → refresh fails → `clearSession()` + forced redirect to
  `/user/login` (client.js:74-77). Guests can never see the landing page.
- **Logged in:** request hits bare-`requireAuth` handler → **403** → caught silently
  (UserFreeInformationPage.jsx:17) → page renders an empty grid.

### 2.4 Placeholder / fake screens (no backend anywhere)

- **VideoCallPage.jsx** (route `/user/appointments/:id/call`, AppRoutes.jsx:146) is a purely
  cosmetic mock: a `setInterval` seconds counter (:10-13), a static "Connecting..." avatar screen
  (:21-25), unlabeled emoji buttons that do nothing (:31-34), and a "Call Ended" flip (:34).
  No media, no WebSocket, no API. A user who pays for a video appointment lands on a static page.
- **MuhurthamPage.jsx** is 100% client-side and misleading:
  - Tithi and nakshatra are picked with `Math.random()` (:53-54) — non-reproducible, non-astrological.
  - The "Birth Date" field is collected (:32, :93) but **never read** by `calculate()`.
  - Data is a hardcoded `RASHI_DATA` table (:15-28); nothing is fetched or persisted.

### 2.5 Raw `fetch` bypassing the API layer (works, but fragile)

These pages hand-roll `fetch(\`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/...\`)`
instead of using the `api/` wrappers — duplicating the base-URL default and **dropping the
401-refresh queue** (a single refresh failure logs the user out mid-flow):

| Page | Raw fetch calls |
|---|---|
| WalletPage.jsx | :15 (balance), :18 (transactions), :33 (topup), :43 (transactions) |
| QuestionPurchasePage.jsx | :18 (balance), :21 (transactions), :32 (astrologers), :56 (purchase) |
| SubmitQuestionPage.jsx | :17 (purchase detail), :33 (create question) |
| MyQuestionsPage.jsx | :11 (list) |
| QuestionTrackingPage.jsx | :12 (tracking) |
| DisputePage.jsx | :19 (create dispute) |
| PurchaseSuccessPage.jsx | :12 (purchase detail) |

All hit real endpoints and currently return the expected shapes; the issue is consistency and
error/refresh handling, not a 404.

### 2.6 Dead endpoint in the shared QuickAsk FAB

`QuickAskButton.jsx:16` calls `GET /user/question-campaigns/active`, which **does not exist**
(campaigns are astrologer-scoped: `campaign.routes.js`, mounted at `/api/astrologer/question-campaigns`;
the only public active-campaign route is `/api/astrologer/question-campaigns/astrologer/:id/active`).
The `.catch` (:22) silently falls back to the generic `/user/questions` flow, so the campaign-aware
routing the button advertises ("we'll connect you with an astrologer") never happens.

### 2.7 Verified-working integrations (cross-checked, no issues)

- Auth register/login/me; forgot/reset password (token returned in body — see security note in AUDIT_REPORT.md §6.6)
- Explore list + filters + astrologer profile + public subscription plans + follow check
- Appointment slots/book/pay/cancel; wallet; payments/summary/receipt
- Question purchase → submit → tracking → list; dispute create/list/detail/escalate/messages
- Subscriptions list/upgrade/downgrade/cancel/renew + checkout
- AI chat (rule-based engine); live lobby/room/access-check/join/chat/my-question/buy-question
- Emergency slot flow (`emergencySlots.routes.js`) — astrologers, slots, request, requests, rating, options
- All 7 free calculations (public endpoints); daily horoscope (raw snake_case rows match page reads)
- Public reviews list on profile + dedicated reviews page
- Messaging; notification preferences; profile + family astrology-profiles CRUD

---

## 3. UX Assessment

**Strengths**
- Consistent `Shell` chrome, `.page` sections, eyebrow labels, and an empty-state on nearly every
  list screen (Notifications, Questions, Appointments, Disputes, Payments, Messages).
- Login/register/branded flows are polished (AuthLayout quote, "begin your journey").
- Buy-onboarding is coherent: campaign offer → purchase → submit → tracking timeline.

**Problems**
1. **Fake video call after real payment** — VideoCallPage simulates a call; the "End" button
   just re-renders. No join room, no media device UI, no call state.
2. **Misleading muhurtham output** — random tithi/nakshatra presented as an "Auspicious ✓"
   result; the collected birth date is ignored.
3. **Dead nav items** — "Notifications" (`/user/notifications-bell`) and "Free Info"
   (`/user/contents/free-information`) are primary nav links that lead to an empty page / forced
   login respectively. "Sessions" is 404. (Shell.jsx:138,143; AppRoutes.jsx:138,183,120)
4. **QuickAsk FAB** — fixed bottom-right, emoji glyph "✦", no `aria-label`, no keyboard focus
   management, and its decision endpoint is dead; on failure it silently drops the typed question.
5. **401-refresh gap** — pages in §2.5 bypass the refresh queue; a single expired token during a
   wallet top-up or question purchase logs the user out mid-transaction.
6. **Landing page gating** — the app's entry point demands auth (and then 403s); there is no
   guest-visible homepage with the marketed content.
7. **Loading copy is plain "Loading..."** everywhere — acceptable, but inconsistent with the
   branded tone elsewhere.
8. **ProtectedRoute checks only token presence** (no `/user/me` validation) — a stale/invalid
   token renders protected screens until the first API call redirects.

---

## 4. Copy Quality

**Good**
- Auth: "BEGIN YOUR JOURNEY — A little closer to *your universe.*", "WELCOME BACK — The stars
  have been *waiting for you.*", Oscar Wilde quote, privacy/safety bullet list.
- CTAs are consistent and confident: "Ask Now →", "Send reset instructions →", "Find Auspicious
  Days", "Book Appointment", "Start Chat", "Emergency Call".
- Empty states are friendly and on-brand ("All caught up" + 🔔 in notifications; horoscope
  "Select your zodiac sign above to view today's horoscope").

**Weak**
- VideoCallPage copy promises function that does not exist ("Connecting...", "Your call will
  start" — actually the timer simply counts).
- Muhurtham disclaimer (:128-129, "based on general Vedic astrology principles") directly
  contradicts the `Math.random()` implementation; a user may plan a wedding around it.
- Generic "Something went wrong" / "Failed to load" fallbacks dominate error paths with no
  retry affordance.
- ForgotPasswordPage hides its own brokenness behind "If an account exists..." copy — good
  practice, but the reset step relies on a token pasted from the same response (see security note).
- Several pages show raw backend error messages verbatim (`err.message`, e.g.
  UserDisputeDetailPage) instead of user-friendly text.

---

## 5. Bug References (frontend)

| # | Severity | Location | Issue |
|---|---|---|---|
| 1 | CRITICAL | content.routes.js:154 + contentApi.js:16 + UserFreeInformationPage.jsx:17 + AppRoutes.jsx:120 | Landing page `/user/contents/free-information` uses an auth-only API against a bare-`requireAuth` route → guests redirected to login, logged-in users get 403 → empty page |
| 2 | HIGH | UserNotificationBellPage.jsx:16-22,31,37 vs notification.routes.js:15 + features.routes.js:253,258,263 + app.js:70,82 | Nav-linked notifications page: list shape mismatch (`items`/`total` never set) + unread-count/read calls 403 → page is inert |
| 3 | HIGH | sessionApi.js:7-12 vs session.routes.js:81-120 mounted at `/api/auth` (app.js:68) | ActiveSessionsPage 404 on every call (both `/user/sessions` and `/astrologer/sessions`) |
| 4 | HIGH | ConsultationHistoryPage.jsx:25 + features.routes.js:226 | Consultation history 403 (bare requireAuth) → always empty |
| 5 | HIGH | UserAtonementHistoryPage.jsx / UserAtonementDetailPage.jsx + atonement.routes.js:215-295 | Remedies module 403 → pages render empty/failed states |
| 6 | HIGH | UserPerksPage.jsx + content.routes.js:172 | Perks 403 → empty |
| 7 | HIGH | UserContentDetailPage.jsx + content.routes.js:189,206 | Content detail + view tracking 403 |
| 8 | HIGH | QuickAskButton.jsx:16-23 | `/user/question-campaigns/active` 404 — campaign routing never fires |
| 9 | MEDIUM | VideoCallPage.jsx:10-13,21-39 | Entire video-call screen is a cosmetic mock; no API/WS |
| 10 | MEDIUM | MuhurthamPage.jsx:32,53-54 | Random tithi/nakshatra output; `birthDate` collected but unused |
| 11 | MEDIUM | WalletPage.jsx:15,33,43; QuestionPurchasePage.jsx:18,56; SubmitQuestionPage.jsx:17,33; MyQuestionsPage.jsx:11; QuestionTrackingPage.jsx:12; DisputePage.jsx:19; PurchaseSuccessPage.jsx:12 | Raw `fetch` bypasses the `apiAuth*` refresh queue — mid-flow token expiry logs the user out |
| 12 | LOW | AppRoutes.jsx:156 + Shell.jsx:138 | Working NotificationCenterPage (`/user/notifications`) unreachable; broken UserNotificationBellPage is the only linked destination |
| 13 | LOW | ProtectedRoute.jsx | Token-presence-only guard; no server validation |

### Backend findings reproduced for reference (`AUDIT_REPORT.md` §6)
- Bare `requireAuth` 403s everything on content/atonement/features (auth.js:9).
- `follow.routes.js:27` wrong-column INSERT (`VALUES ($1,$2,$2)`).
- Public `POST /admin/register`; unguarded astrologer-approval PATCH and escrow release/refund;
  hardcoded JWT/DB secrets; memory-only sessions; reset token returned in the HTTP body.

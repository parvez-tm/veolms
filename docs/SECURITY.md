# Security

This is a checklist-style map of every protection in VeoLMS to the code that implements it, followed by an honest list of residual risks. The theme throughout is defense in depth: a stateless JWT bearer token, an ORM that parameterizes by default, server-derived money, and content that is gated at every hop.

---

## Authentication

| Protection | Where it lives |
| --- | --- |
| Password hashing | `bcryptjs` (cost 10) in the `User` `beforeSave` hook (`routes/control/user/user-model.ts`); hashes only when the password actually changed |
| Password never serialized | `User` `defaultScope` excludes `password` and all token-hash columns; login uses `User.unscoped()` |
| JWT bearer token | `signToken` signs the JWT with `JWT_SECRET` and `expiresIn = JWT_EXPIRES_IN` (default `7d`). `login`/`register`/`become-instructor` return it in the response body; the SPA stores it in `localStorage` and sends it as `Authorization: Bearer <token>`. Stateless: there is no server-side session, so logout is client-side (drop the token) |
| Token verification | `auth_middleware` requires an `Authorization: Bearer` header and `jwt.verify`s it (missing/malformed or invalid/expired is 401) |
| Forgot/reset password | 1-hour token, stored as a sha256 hash with an expiry on `User` (`passwordResetTokenHash` / `passwordResetExpires`). Token-in-body flow, independent of the auth transport |
| Email verification | Token-based, **non-blocking**: an unverified user can still log in and use the app (`isVerified` flag) |
| Token freshness | `auth_middleware` rejects tokens issued before the role's last permission change (403, "Permissions updated. Please login again"), checked against the Redis-cached role permission version (falls back to Postgres) |

The reset/verify tokens are hash-at-rest, so a DB leak cannot replay them against the API.

---

## Authorization / RBAC

| Protection | Where it lives |
| --- | --- |
| Role gate | `requireRole('Admin', 'Instructor', ...)` (`middleware/role-middleware.ts`) checks `req.user.roleName` |
| Course ownership | `loadOwnedCourse(courseId, user)` and the `isAdminOrOwner(user, ownerId)` predicate (`routes/lms/course-access.ts`); instructors can only modify their own courses, sections, and lessons |
| Draft visibility gating | Read endpoints for non-owners require `status === 'published'` (`getCourseById`, `getSectionsByCourse`, `getLessonById`); non-preview lessons additionally require enrollment |
| Self-or-admin user edits | `PUT /user/updateUser/:id` rejects editing another user unless Admin, and **strips `roleId` for non-admins** (no self-escalation) |
| Admin-only operations | `POST /user/addUser`, `DELETE /user/deleteUser/:id`, the full control panel (role/permission/menu/user listing), category delete, media/payment cleanup |

### Closed privilege-escalation hole

The RBAC control-panel routes (role, permission, menu, and the full user listing with emails) are now **Admin-only**. A prior version exposed these more broadly, which let a non-admin read or alter role/permission data, an escalation path. The fix scoped them behind `requireRole('Admin')`, and `getAllUsers` (which returns emails) is Admin-only while `getUserById`/`getAvatar` stay self-or-admin so a user can still read their own profile. Do not regress this.

---

## Payment verification

| Protection | Where it lives |
| --- | --- |
| Server-derived amount | `createPaymentOrder` reads `course.price`; the client never sends an amount |
| Signature verification | HMAC-SHA256 with Node `crypto`, compared via `crypto.timingSafeEqual` (length-guarded) in `services/payment-service.ts`. Callback: `HMAC(order_id\|payment_id, key_secret)`. Webhook: `HMAC(raw_body, webhook_secret)` |
| Raw-body integrity | `express.raw({ limit:'16kb' })` mounted on `/api/payment/webhook` **before** `express.json()` so the HMAC runs over the exact bytes, never re-serialized JSON (`app.ts`) |
| Field type-validation | `verify` type- and length-checks the `razorpay_*` fields before they reach the DB or the HMAC (untyped JSON would otherwise 500 or build a bad `where`) |
| Ownership check | `verify` confirms the payment row belongs to `req.user` |
| Idempotent fulfillment | `fulfillPayment` locks the payment row (`LOCK.UPDATE`) and upserts the enrollment in a SAVEPOINT; verify + webhook for one order grant exactly one enrollment |
| State-machine integrity | A bad-signature `verify` uses a conditional `UPDATE WHERE status='created'`, so it can never regress a webhook-confirmed `paid` row to `failed` |
| Payment-bypass guard | `POST /enrollment/enroll` refuses paid courses (402) and fails closed via `isFreeCourse(price)` (free === price exactly 0); paid access is granted **only** through a verified payment |
| Pricing floor | Paid courses must be `≥ MIN_PAID_PRICE` (100 paise / ₹1), enforced in `addCourse`/`updateCourse` |
| Gateway timeout | `createOrder` uses a 10s `AbortSignal.timeout` so a stalled gateway cannot pin a request + DB slot open |

---

## CSRF and the bearer-token transport

| Protection | Where it lives |
| --- | --- |
| Bearer transport | The JWT travels in the `Authorization: Bearer` header (`frontend/src/lib/api.ts` request interceptor reads it from `localStorage`), never in a cookie |
| CSRF not applicable | The browser never auto-attaches an `Authorization` header (only cookies are auto-sent), so a cross-site forged request carries no credentials and there is nothing to double-submit against. No cookies are set anywhere in the API, and `cookie-parser` is not a dependency |
| No server session | The JWT is stateless: there is no session row, refresh token, or rotation to manage. Logout is client-side (the SPA drops the stored token) |

Because the token is read by JavaScript and cannot be revoked before it expires, the residual exposure (XSS readability, no instant revocation) is documented under Residual risks below.

---

## Rate limiting

| Protection | Where it lives |
| --- | --- |
| Auth brute-force slowdown | `authLimiter` on `/user/login`, `/register`, password/verify routes, and the contact form |
| Payment abuse | `paymentLimiter` on `/payment/create-order` and `/payment/verify` |
| Webhook backstop | `webhookLimiter` on `/payment/webhook`, ahead of the HMAC check |
| Correct client IP | `app.set('trust proxy', 1)` so `req.ip` is the real client behind exactly one proxy (minimal value, so clients cannot spoof `X-Forwarded-For` to evade the limiter) |

Implemented with `express-rate-limit` v7. Store is in-memory (see residual risks).

---

## Input validation

| Protection | Where it lives |
| --- | --- |
| Route id params | `id_checker_middleware` validates `:id` against `^\d+$` before it reaches Sequelize |
| Body ids/ints | `bodyId` / `nonNegInt` (`helpers/parse-id.ts`) validate body fields (the id middleware only guards route params); a non-numeric value on a BIGINT column would otherwise 500 |
| Search/sort whitelisting | `parseRequestParams(req, Model)` whitelists search and sort fields against the model's columns (text-only for search, `password` blocked); unknown fields are ignored, never error |
| Field type/length checks | e.g. the contact form and payment verify validate type and cap length before use |
| Upload limits | multer enforces a 5 MB image limit, an image-only `fileFilter`, and sanitized filenames; multer errors map to 413/400, not 500 |

---

## XSS sanitization

| Protection | Where it lives |
| --- | --- |
| Server-side HTML sanitization | DOMPurify + jsdom (`services/sanitize-service.ts`) runs over the request `data` envelope, so lesson HTML bodies and other rich text are cleaned before storage |
| Output escaping | React escapes interpolated text by default; combined with DOMPurify on stored rich text, this is the primary XSS defense (the JWT is the only client-side secret, so keeping XSS out is what protects it) |
| Secure headers | helmet sets CSP/HSTS/X-Content-Type-Options and friends |

---

## SQL-injection prevention

All database access goes through Sequelize with parameterized queries; there is no raw SQL string concatenation in the codebase. User-supplied search and sort fields are whitelisted against model columns before they can reach a `where`/`order` clause, so an attacker cannot inject a column name or operator either.

---

## Secure headers, CORS, and secrets

| Protection | Where it lives |
| --- | --- |
| Secure headers | `helmet()` first in the middleware chain (`app.ts`) |
| CORS allowlist | `cors({ origin })` driven by `CORS_ORIGIN`; in production set it to an explicit comma-separated allowlist (it defaults to `*` for dev). The Bearer token is sent in a header, not a cookie, so no credentialed-CORS handling is needed |
| Secrets in env only | All config is read through `config/env.ts`; nothing is hardcoded, and required vars (`JWT_SECRET`) throw at startup if missing. The Jenkins pipeline bind-mounts a host `.env` into the container, never baking secrets into the image |
| Non-root container | The Docker runtime stage runs as the built-in `node` user |

---

## Content protection (gated HLS)

| Protection | Where it lives |
| --- | --- |
| Private bucket | R2 bucket is private; the DB stores only the object key, and `MediaAsset.toJSON` strips `storageKey` and all HLS secrets |
| Encrypted segments | ffmpeg produces AES-128 encrypted HLS; the raw MP4 is deleted after transcode, so no single downloadable file remains |
| Ticket-gated playback | `getPlayback` asserts access (owner/admin, or published + preview/enrolled) and issues a short-lived signed ticket; the playlist and key endpoints both require it |
| Key never exposed | The 16-byte AES key (`hlsKeyB64`) is returned only via the ticket-gated key endpoint and is never serialized in any normal response |
| Path-traversal guard | The playlist `p` parameter is whitelisted `^[\w.-]+\.m3u8$` |
| Presigned segments | Segment URLs are short-lived presigned R2 GETs, rewritten at playlist-serve time |

---

## Residual risks (stated honestly)

- **The JWT lives in `localStorage`.** It is readable by JavaScript, so a successful XSS could exfiltrate it, and because the token is stateless it cannot be revoked before it expires (logout only drops the client copy; a leaked token stays valid for the rest of its lifetime). This is the deliberate trade-off of a bearer token over an httpOnly cookie, taken for simplicity and cross-origin friendliness. The mitigations are a bounded token lifetime (`JWT_EXPIRES_IN`, default `7d`, tunable shorter), helmet's secure headers, output escaping plus DOMPurify on stored HTML to keep XSS out in the first place, and the fact that the token is the only client-side secret (no refresh token, no long-lived cookie alongside it). See [CHALLENGES.md](CHALLENGES.md) for the reasoning.
- **Encrypted HLS is not DRM.** Within a ticket's validity window, a determined enrolled user could script ffmpeg to reassemble the decrypted stream, and screen capture defeats any web player. The protection stops casual "save the video" downloading, not a motivated attacker. True device DRM (Widevine/FairPlay) is the only complete defense, and is out of scope.
- **In-memory rate-limit store.** `express-rate-limit` uses an in-memory store, so limits are per-instance. On a single node this is correct; across multiple instances the effective limit multiplies. This was a deliberate trade-off to keep Redis a pure cache (a Redis outage cannot break limited routes). The fix when scaling out is `rate-limit-redis` backed by the existing ioredis client.
- **No migrations yet.** Schema is managed by `sequelize.sync` (alter in dev, create-only in prod). Production schema changes should move to real migrations before scaling writes.
- **Unconfirmed presigned uploads.** A presigned video PUT that lands but is never confirmed leaves an R2 object the DB does not track. Backstop with an R2 lifecycle rule on the `videos/` prefix (and the `/media/cleanup` sweep handles stale pending rows and orphaned objects).
- **CASCADE on payments.** Deleting a user or course currently cascades their `Payment` rows. A production system should soft-delete to preserve the financial audit trail; this is a documented trade-off.
- **TLS verification for managed Postgres.** `DATABASE_SSL=true` enables TLS but with `rejectUnauthorized: false` to work with managed providers' certs. Supply a CA and flip it to strict verification for a hardened deployment.

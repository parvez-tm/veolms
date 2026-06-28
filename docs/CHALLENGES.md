# Engineering challenges

These are the problems in VeoLMS that were genuinely hard, where the obvious implementation is wrong or insufficient. Each section is the problem, the solution, and the trade-off taken.

---

## 1. Anti-download video without a DRM bill

**The problem.** A course platform's core asset is its video. If a logged-in student can open the Network tab and save the MP4, the product has no moat. The naive approach (a presigned URL to a single MP4) hands over exactly that file. Real DRM (Widevine/FairPlay) solves it completely but needs license servers, device integration, and ongoing cost, which is disproportionate for a challenge and for most small platforms.

**The solution.** Every uploaded video is transcoded with ffmpeg into **AES-128 encrypted, adaptive-bitrate HLS**: variant streams at 360/480/720/1080p (capped at the source height, probed with ffprobe), plus a `master.m3u8`, all encrypted with a per-asset 16-byte key. The renditions and segments go to a **private** R2 bucket under `hls/<assetId>/`, the key is stored on the asset (and never serialized), and the **raw MP4 is deleted** so there is no single downloadable file left.

Playback is **ticket-gated**. `getPlayback` asserts access, then issues a short-lived signed ticket. The player's playlist request is rewritten on the fly: the master playlist's variant URIs route back through the gated endpoint, each variant's key URI points to a gated key endpoint, and segment names become short-lived presigned R2 GETs. The `p` (playlist name) parameter is whitelisted to `^[\w.-]+\.m3u8$` to block path traversal. In the browser, segments are encrypted blobs and the key is only handed over against a valid ticket. hls.js does adaptive bitrate automatically, and the custom player adds a quality picker, resume, progress save, speed, PiP, and fullscreen.

**The trade-off.** This is honest 80/20, not DRM. Within the ticket window a determined enrolled user could script ffmpeg to reassemble the stream, and screen capture defeats any web player. What it buys: it raises the bar from "right-click, save" to "write a script against a short-lived, gated key," which stops the casual case that actually matters, at zero licensing cost. It also means video is **upload-only** by design (no external/YouTube URLs), because every byte has to flow through the private-bucket + encryption path to be protectable.

---

## 2. Payment integrity under concurrency

**The problem.** Money is unforgiving. Three things can go wrong with a client-driven checkout: the client could tamper with the amount, the same payment could be fulfilled twice (granting double access or, worse, regressing state), and the confirmation could simply never arrive because the user closed the tab.

**The solution.** Four guarantees, each backed by code:

- **Server-derived amounts.** `create-order` reads `course.price` (in paise) on the server; the client never sends a price. Paid courses also enforce a `MIN_PAID_PRICE` floor (₹1, the Razorpay minimum).
- **Idempotent fulfillment under concurrency.** `fulfillPayment` locks the payment row (`LOCK.UPDATE`) and upserts the enrollment (unique `userId+courseId`) inside a **SAVEPOINT**, so a concurrent cross-order insert surfaces as a unique-violation that we treat as success rather than a poisoned transaction. The verify callback and the webhook can both fire for one order and still grant exactly one enrollment.
- **Webhook as the source of truth.** Confirmation has two independent paths: the checkout callback (`/payment/verify`) and the server-to-server webhook (`/payment/webhook`). Even if the browser callback never runs, the webhook still fulfills. The webhook HMAC is computed over the **raw request bytes** (captured by `express.raw()` mounted before `express.json()`), because re-serialized JSON would change the bytes and break the signature.
- **Poisoned-order self-heal.** A bad-signature `verify` uses a conditional `UPDATE WHERE status='created'`, so it can never regress a webhook-confirmed `paid` row to `failed`. Entitlement is perpetual: if a `paid` payment already exists for `(user, course)`, `create-order` re-grants the enrollment for free, so unenroll then re-enroll never double-charges. It also reuses an open `created` order at the current price instead of spawning duplicates, and a `/payment/cleanup` job expires stale orders.

There is also a hard payment-bypass guard: `POST /enrollment/enroll` refuses paid courses (402) and fails closed via `isFreeCourse(price)` (free means price exactly 0), so paid access is granted only through a verified payment.

**The trade-off.** Signatures are verified with Node `crypto` and `timingSafeEqual` rather than the Razorpay SDK, and orders are created against the REST API with `fetch`. This keeps the dependency surface tiny and the exact bytes auditable and unit-testable offline, at the cost of maintaining a little request-shaping code ourselves. Order **creation** still needs the live gateway, so only that path is not unit-tested; signature verification and fulfillment are.

---

## 3. Migrating to cookie auth with refresh rotation and CSRF

**The problem.** Storing a JWT in `localStorage` is convenient and wrong: any XSS reads it. Moving tokens into httpOnly cookies fixes theft but immediately creates two new problems. Cookies are sent automatically, so the app is now exposed to CSRF, and a short-lived access token (needed to limit blast radius) would otherwise log users out every few minutes.

**The solution.** Three cookies working together. The **access token** is a 15-minute JWT in an httpOnly cookie. The **refresh token** is an opaque random value in an httpOnly cookie, with only its **sha256 hash** stored in `refresh_tokens`, so a DB leak cannot be replayed; every refresh **rotates** it (delete the presented row, issue a fresh one), making a stolen-and-replayed refresh token single-use. The **CSRF token** is a readable cookie that the SPA echoes in an `X-CSRF-Token` header on every mutation; `auth_middleware` enforces a double-submit match on cookie-authenticated unsafe-method requests (an attacker's site can send the cookies but cannot read the cookie to set the header). Bearer requests are exempt, since browsers never auto-attach a Bearer header.

The short token is made invisible by a **silent-refresh** axios interceptor: a 401 on a normal request triggers a single `/refresh` (collapsed to one call even under a burst of concurrent 401s via a single-flight promise) and retries the original request once. If refresh fails, the cached profile is cleared and the route guard redirects to login.

**The trade-off.** This is more moving parts than a bearer token in a header. The payoff is that an XSS can no longer steal the session, a leaked DB cannot replay refresh tokens, and the user never sees the 15-minute expiry. The residual is the standard one: `SameSite=Lax` plus double-submit is strong but not a substitute for keeping XSS out in the first place, which is why DOMPurify sanitizes stored HTML.

---

## 4. Search across associated tables

**The problem.** The catalog search has to match a query against the course's own fields (title, subtitle, description) **and** the related category name **and** the related instructor name, with category and level filters and sorting on top, all returning a correct page. With Sequelize, the moment you add a `WHERE` on an included (joined) association together with a `LIMIT`, the ORM's default behavior wraps the query in a subquery, which breaks filtering on the joined columns and can drop or duplicate rows.

**The solution.** The catalog query searches across the course columns plus the joined `category` and `instructor` tables, and uses `subQuery: false` so the `WHERE` and `LIMIT` apply to the single flattened join rather than a wrapping subquery. On top of that, the catalog and detail responses attach computed aggregates: enrollment **student count**, **lesson count**, and **total duration**, so the UI gets real numbers in one round trip. Search and sort fields are whitelisted against model columns before they reach the query (text-only for search, `password` blocked), so the cross-table search cannot be turned into an injection vector.

**The trade-off.** `subQuery: false` makes pagination math the developer's responsibility rather than the ORM's, and joining across associations for a text search is heavier than a single-table scan. For a small-to-medium catalog this is fine; at large scale the lever is a dedicated search index (and read replicas for catalog reads), which the stateless API is already shaped to allow.

---

## 5. Media lifecycle and orphan avoidance

**The problem.** There are two systems of record for any uploaded file: the R2 object and the `media_assets` row. They must be created and destroyed together, or you get orphans (objects no one references, quietly billed forever) or dangling rows (a row pointing at a deleted object). Foreign-key cascades make this worse: a cascade deletes the asset **row** but never the R2 **object**.

**The solution.** All deletions go through `media-service.ts` (`purgeAsset` / `purgeAssetsByIds`), which deletes the R2 object first, then the row. Delete paths that rely on FK cascade (delete user, delete lesson, delete course) explicitly **collect the asset ids before the cascade** and purge the objects. When an object delete cannot complete (R2 down, or a delete error), the row is **kept and marked `orphaned`** rather than silently dropped, so a row whose object still exists is never lost. `updateUser` purges the **old** avatar only after a successful save and rolls back the **new** asset on failure. `DELETE /media/:id` refuses (409) if the asset is still referenced. A `/media/cleanup` admin/cron job runs two sweeps: stale `pending` uploads and retry-deletion of `orphaned` objects.

**The trade-off.** This is more bookkeeping than letting cascades run, and there is one residual untracked case: a presigned PUT that lands but is never confirmed leaves an object the DB never tracked. That is backstopped outside the app with an **R2 lifecycle rule** on the `videos/` prefix, which is the right tool for "expire objects the app forgot about" anyway.

---

## 6. Keeping Redis, R2, and Razorpay all optional

**The problem.** A challenge reviewer should be able to `npm install` and `npm run dev` and see the app work, without provisioning a Redis instance, a Cloudflare account, and Razorpay test keys first. But those services are load-bearing in production. The temptation is to make them hard dependencies and the app un-bootable without them.

**The solution.** Each external service is gated behind a `configured` flag derived from env vars, and the app degrades instead of crashing:

- **Redis** is treated strictly as a cache. The permission-version lookup that runs on every authenticated request wraps its read so a Redis outage **falls back to Postgres**. Critically, the rate limiter is deliberately **not** Redis-backed, precisely so a Redis outage cannot 500 every limited route.
- **R2** is optional to boot. If `r2.configured` is false, media and video-playback endpoints return **503** and only text lessons work; there is no external-URL fallback by design.
- **Razorpay** is optional. If unconfigured, paid purchases return **503** while free courses still enroll directly.
- **Email** falls back to logging verification/reset links to the console when SMTP is unset, so the auth flows are fully testable in dev.

**The trade-off.** Every feature that touches an optional service needs an "is this configured?" branch and a sensible degraded response, which is more code than assuming the service is always there. The payoff is a system that boots from a clean checkout, is honest about what is and is not available, and treats its cache as a cache rather than a single point of failure.

---

## Testing the parts that matter

The 20 vitest unit tests target the pure, security-critical logic where a bug is expensive and a live service is not required: Razorpay payment and webhook **signature verification** (by computing a valid HMAC offline), **pricing rules** (free vs the paid floor), **id/integer validation**, **search/sort field whitelisting**, and **HLS ticket** signing and verification. The deliberate gap is anything needing a live database or the live gateway (order creation success, full request integration), which is documented as out of scope rather than faked.

# Architecture

VeoLMS is a two-tier system: a React SPA talking to a stateless Express API, backed by three external services (Postgres, Redis, Cloudflare R2) and one payment gateway (Razorpay). The API holds no durable local state, so it scales horizontally and redeploys by container swap.

---

## System diagram

```
                         ┌─────────────────────────────────────────────┐
                         │  Browser (React 19 SPA, Vite, Tailwind v4)  │
                         │                                              │
                         │  axios (JWT from localStorage)               │
                         │  React Query (server state)                  │
                         │  hls.js (encrypted HLS playback)             │
                         └───────────────┬──────────────────────────────┘
                                         │  HTTPS
                                         │  Authorization: Bearer <jwt> header
                                         ▼
                         ┌─────────────────────────────────────────────┐
                         │  Express 5 API  (stateless, Dockerized)      │
                         │                                              │
                         │  helmet → cors →                             │
                         │  raw-body(/payment/webhook) → json →         │
                         │  /api router                                 │
                         │                                              │
                         │  auth_middleware  (Bearer JWT + perm version)│
                         │  requireRole / loadOwnedCourse  (RBAC)       │
                         │  rate limiters (auth / payment / webhook)    │
                         └───┬───────────┬───────────┬──────────┬───────┘
                             │           │           │          │
                  ┌──────────▼──┐  ┌─────▼─────┐ ┌───▼─────┐ ┌──▼──────────┐
                  │ PostgreSQL  │  │  Redis    │ │   R2    │ │  Razorpay   │
                  │  (Neon)     │  │ (cache)   │ │ (S3 API)│ │  Orders API │
                  │             │  │           │ │         │ │             │
                  │ Sequelize   │  │ perm ver  │ │ private │ │ create-order│
                  │ models +    │  │ TTL cache │ │ bucket: │ │ + webhook   │
                  │ row locks   │  │ degrades  │ │ video,  │ │ (HMAC)      │
                  │             │  │ to PG     │ │ HLS,img │ │             │
                  └─────────────┘  └───────────┘ └─────────┘ └─────────────┘
                                                      ▲
                                          ffmpeg (transcode, in-container)
                                          uploads HLS segments to R2
```

Redis, R2, and Razorpay are each optional: if a service is unconfigured the related features degrade gracefully (permission lookups fall back to Postgres, video/upload endpoints return 503, paid purchases return 503) rather than crashing the boot.

---

## Request and auth flow

Auth is a stateless JWT **bearer token**. There are no cookies, no refresh tokens, and no CSRF: the SPA holds one token in `localStorage` and attaches it to every request. The signed JWT carries `id`, `roleId`, and `lastPermissionUpdate`, and lives for `JWT_EXPIRES_IN` (default `7d`).

### Login

```
POST /api/user/login   (same shape for /register and /become-instructor)
  → verify password (bcrypt.compare against User.unscoped())
  → signToken(payload)   (JWT, expiresIn = JWT_EXPIRES_IN, default 7d)
  → 200 { message, token, data, permissions }

The SPA stores `token` in localStorage and sends it on every subsequent
request as `Authorization: Bearer <token>` (axios request interceptor).
```

### Authenticated request

`auth_middleware` runs on protected routes and does three things in order:

1. If the body is a multipart `data` JSON envelope, parse and DOMPurify-sanitize it.
2. **Read and verify the token:** require an `Authorization: Bearer <token>` header (missing/malformed is 401), then `jwt.verify` it with `JWT_SECRET` (invalid or expired is 401).
3. **Permission freshness:** compare the token's `lastPermissionUpdate` against the role's current permission version (read from Redis, falling back to Postgres). If an admin changed the role's permissions after the token was issued, return 403 ("Permissions updated. Please login again").

CSRF is not applicable: a `Bearer` header is never auto-attached by the browser (unlike a cookie), so a cross-site request cannot ride an authenticated session.

### Logout

Logout is **client-side**: the SPA removes the token from `localStorage`. Because the JWT is stateless there is no server-side session to revoke, so a token stays valid until it expires. The frontend also clears the token and redirects to `/login` on a 401, or on the 403 "Permissions updated. Please login again". This trade-off (bounded lifetime instead of instant revocation) is discussed in [SECURITY.md](SECURITY.md) and [CHALLENGES.md](CHALLENGES.md).

---

## Data model

IDs are `BIGSERIAL` integers (not UUIDs), and `pg.defaults.parseInt8 = true` returns them as JS numbers. Associations are defined once in `db/associations.ts`. Money is stored in **paise** (integer minor units) end-to-end.

### Entities

```
Role ──< User
  │        │
  │        ├──< Course (instructorId, RESTRICT)
  │        ├──< Enrollment
  │        ├──< Payment
  │        ├──< LessonProgress
  │        └──< MediaAsset (uploadedById, SET NULL)
  │
  └──< Permission >── Menu (self-referencing tree)

Category ──< Course (SET NULL on category delete)

Course ──< Section ──< Lesson          (CASCADE)
Course ──< Lesson    (denormalized courseId, CASCADE)
Course ──< Enrollment / Payment / LessonProgress (CASCADE)
Course  >── MediaAsset  (thumbnailAssetId, bannerAssetId, SET NULL)

Lesson  >── MediaAsset  (videoAssetId, SET NULL)
User    >── MediaAsset  (avatarAssetId, SET NULL)

Lesson ──< LessonProgress (CASCADE)
```

### Key tables and rules

| Model | Notable fields | Constraints / rules |
| --- | --- | --- |
| `User` | `userName`, `email`, `password` (bcrypt), `roleId`, password-reset token hash + expiry | `defaultScope` excludes password + token hashes; unique email + userName; `beforeSave` hashes password only when changed |
| `Role` / `Menu` / `Permission` | `canCreate/Read/Update/Delete` flags | Permission flags avoid SQL reserved words; Role delete RESTRICTed while users exist |
| `Category` | `name` | Course `categoryId` SET NULL on delete |
| `Course` | `title`, `subtitle`, `description`, `level`, `language`, `tags[]`, `learningOutcomes[]`, `prerequisites[]`, `whoThisIsFor[]`, `price`, `discountPrice`, `status` | `price`/`discountPrice` in paise; `status` draft/published gates visibility; indexes on `status`, `instructorId` |
| `Section` | `title`, `position` | CASCADE from course; reorderable |
| `Lesson` | `type` (video/text), `content` (sanitized HTML or notes), `resources[]`, `videoAssetId`, `videoDurationSec`, `position`, `isPreview` | `courseId` denormalized for cheap access checks; preview lessons playable without enrollment |
| `MediaAsset` | `storageKey`, `kind`, `status`, `hlsStatus`, `hlsKeyB64`, `hlsPrefix`, probed `width/height/durationSec` | `toJSON` strips `storageKey` + all HLS secrets; unique `storageKey` |
| `Enrollment` | `status` (active/completed) | **unique `(userId, courseId)`**: one enrollment per user per course |
| `LessonProgress` | `completed`, `completedAt`, `lastPositionSec` | **unique `(userId, lessonId)`**: one progress row per user per lesson |
| `Payment` | `razorpayOrderId` (unique), `razorpayPaymentId`, `amount` (paise), `status` (created/paid/failed) | The order id is the idempotency key; status is an auditable state machine |

Completion percentage is never stored; it is computed live from lesson and progress counts so it can never drift.

---

## Video / HLS pipeline

The design goal is that a logged-in, enrolled user cannot trivially download the source video as a single file. The pipeline:

```
1. Instructor requests an upload URL
   POST /api/media/upload-url → presigned R2 PUT (short-lived) + a pending MediaAsset row

2. Browser uploads the MP4 directly to R2 (the API never proxies the bytes)

3. POST /api/media/confirm/:id
   → HEAD the object, mark the asset ready
   → fire background transcodeToHls(assetId)

4. transcodeToHls (services/hls-service.ts), needs ffmpeg on PATH:
   → ffprobe the source height
   → ffmpeg builds adaptive renditions (360/480/720/1080, capped at source)
        AES-128 encrypted (-hls_key_info_file), with variant playlists + master.m3u8
   → upload all .m3u8 + .ts segments to R2 under hls/<assetId>/
   → store the 16-byte AES key (hlsKeyB64) on the asset, set hlsStatus='ready'
   → DELETE the raw MP4 (no single downloadable file remains)
   → on any failure: hlsStatus='failed' (graceful fallback to presigned MP4)

5. Playback
   GET /api/lesson/getPlayback/:id  (optional-auth; access asserted in controller)
     → if hlsStatus ready: issue a short-lived HLS ticket (signed, ~2h) and return
       { source:'hls', playlistUrl with ?ticket }
     → else: { source:'r2', short-lived presigned MP4 } (fallback)

   hls.js then fetches, all gated by the ticket:
     GET /api/media/hls/:id/playlist?ticket&p=master.m3u8
        master → variant URIs rewritten back through this gated endpoint
        variant → key URI rewritten to the gated key endpoint;
                  segment names rewritten to short-lived presigned R2 GET URLs
        (p is whitelisted /^[\w.-]+\.m3u8$/ to block path traversal)
     GET /api/media/hls/:id/key?ticket   → the raw 16 bytes, only with a valid ticket
```

In the browser Network tab, segments are AES-encrypted blobs and the decryption key is only served against a valid ticket, so there is no single file to save. hls.js handles adaptive bitrate automatically; the custom player exposes a quality picker (Auto + each rendition), plus resume, progress save, speed, PiP, fullscreen, and keyboard shortcuts. Native HLS (Safari) is the fallback.

**This is not DRM.** Within the ticket window an enrolled, determined user could script ffmpeg to reassemble the stream, and screen capture defeats any web player. True device DRM (Widevine/FairPlay) is the only full stop; the trade-off is discussed in [CHALLENGES.md](CHALLENGES.md).

The R2 bucket CORS policy must allow cross-origin `PUT` (browser direct-to-R2 uploads) and `GET` (hls.js fetching the presigned segment URLs) from the SPA origin, plus the `content-type` request header. The HLS playlist and AES key come from the API, so only segment GETs and uploads hit R2 cross-origin.

The playlist returns a URL relative to the API base, and its internal variant/key links are written relative to the playlist's own URL. The SPA resolves the playback URL against its API origin (built from `VITE_API_URL`), and hls.js resolves the nested links against the playlist it fetched. So playback works behind a reverse-proxy path prefix (e.g. `/veolms-api`) with no extra backend config; only the segment URLs are absolute (presigned R2).

---

## Payment flow

Razorpay is integrated through its **Orders REST API** with `fetch` and HTTP Basic auth (no SDK dependency), and all signatures are verified with Node's `crypto`. The amount is always derived on the server from `course.price`; the client never sends a price.

```
Free course:
  POST /api/enrollment/enroll
    → isFreeCourse(price) must be true (price === 0), else 402
    → upsert enrollment   (paid courses are NEVER enrollable here)

Paid course:
  POST /api/payment/create-order
    → server reads course.price (paise), enforces MIN_PAID_PRICE (≥ ₹1)
    → reuse an existing open 'created' order, or POST api.razorpay.com/v1/orders
    → if a 'paid' payment already exists for (user,course): re-grant enrollment free
      (perpetual entitlement: unenroll → re-enroll never double-charges)
    → 10s AbortSignal.timeout so a stalled gateway can't pin a DB slot open

  Browser Razorpay Checkout → returns razorpay_{order_id,payment_id,signature}

  Two independent confirmation paths, both idempotent:

  (a) POST /api/payment/verify   (checkout callback)
        → type/length-validate the razorpay_* fields before they touch the DB/HMAC
        → HMAC_SHA256(order_id|payment_id, key_secret) == signature  (timingSafeEqual)
        → conditional UPDATE WHERE status='created' (can't regress a webhook-paid row)
        → fulfillPayment()

  (b) POST /api/payment/webhook  (source of truth, server-to-server)
        → raw bytes captured by express.raw() BEFORE express.json()
        → HMAC_SHA256(raw_body, webhook_secret) == X-Razorpay-Signature
        → fulfillPayment()

  fulfillPayment() (idempotent under concurrency):
        → lock the payment row (LOCK.UPDATE)
        → upsert enrollment in a SAVEPOINT; a concurrent unique-violation is
          treated as success, so verify + webhook for one order grant exactly
          one enrollment

  POST /api/payment/cleanup  (Admin/cron): expire stale 'created' orders
```

The webhook is the source of truth: even if the browser callback never fires (user closes the tab), the webhook still fulfills. Money stays in integer paise from end to end, with no floating point anywhere.

---

## Key design decisions and trade-offs

**`sequelize.sync` instead of migrations.** Schema is created with `sync({ alter })` in dev and create-only in prod, with idempotent seeders that run only on an empty database. This keeps the challenge fast to stand up. The trade-off is that production schema changes need real migrations before scaling writes; this is a known, documented gap, not an oversight.

**Redis is a cache, never a dependency.** Redis caches the role-permission version that `auth_middleware` checks on every request. Every read is wrapped so a Redis outage falls back to Postgres instead of 500-ing. Crucially, the rate limiter is deliberately **not** Redis-backed, so a Redis outage cannot break every rate-limited route. The cost is that the in-memory rate-limit store is per-instance (fine for a single node; swap in `rate-limit-redis` to scale horizontally).

**Razorpay with no SDK.** Calling the Orders REST API directly with `fetch` plus `crypto` HMAC keeps the dependency surface tiny and makes the exact request/response and the signature math fully auditable and unit-testable offline. The trade-off is that we maintain a small amount of request-shaping code the SDK would otherwise own.

**Cloudflare R2 over S3.** R2 is S3-API-compatible but has **$0 egress**, which matters enormously for streaming video. The bucket is private; the DB stores only the object key, which is never serialized to clients. See [COST.md](COST.md) for the numbers.

**Encrypted HLS instead of true DRM.** AES-128 encrypted ABR HLS with ticket-gated keys raises the bar from "right-click, save video" to "script ffmpeg within a short ticket window," without the licensing-server complexity and cost of Widevine/FairPlay. It is an honest 80/20: real protection against casual downloading, not an unbreakable wall.

**In-container ffmpeg transcode.** Transcoding runs in the API container after upload-confirm. It is simple and has no extra moving parts, but it competes with request handling for CPU on a small box. The documented scaling lever is an on-demand transcode worker that spins up per upload and shuts down.

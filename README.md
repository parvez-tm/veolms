# VeoLMS

A production-style, Udemy-like Learning Management System: a public course marketplace, a paid-enrollment flow, and a full instructor/admin authoring workspace, with anti-download encrypted video at its core.

VeoLMS is a monorepo. The backend is an Express 5 + TypeScript REST API on PostgreSQL (Sequelize), with Redis as a cache, Cloudflare R2 for object storage, and Razorpay for payments. The frontend is a React 19 SPA built with Vite, Tailwind v4, React Query, and React Router 7.

This repository was built as a hiring challenge. It tries to make production decisions, not demo decisions: stateless JWT bearer auth, server-derived payment amounts with idempotent fulfillment, AES-128 encrypted HLS video that cannot be saved as a single file, and a media lifecycle that does not leak orphaned objects.

---

## What it does

- **Public marketplace.** A homepage with hero, category browse, featured and most-popular sections, testimonials, and FAQ. A searchable, filterable catalog. Public course detail pages (no login) with curriculum, instructor, pricing, and free preview lessons that actually play for anonymous visitors.
- **Auth.** Register, log in, log out, forgot/reset password, and a self-serve Student to Instructor upgrade. Auth is a stateless JWT bearer token: login returns the token in the response body, the SPA stores it in `localStorage` and sends it as `Authorization: Bearer <token>`, and logout drops the stored token client-side.
- **Authoring (Instructor/Admin).** Full course CRUD, publish/unpublish, section and lesson management with reorder, image uploads (thumbnail + banner), pricing with optional discount, and direct-to-R2 video uploads that transcode to encrypted adaptive HLS.
- **Learning (Student).** Enroll (free directly, paid via Razorpay), My Courses with progress, Continue Learning that resumes the first incomplete lesson, recently-watched history, and a custom video player with resume, speed, PiP, quality selection, and keyboard shortcuts.
- **Admin dashboard.** Overview stats (courses, students, enrollments, revenue, paying/active/registered users) and a sales view.

### Feature highlights

| Area | What is implemented |
| --- | --- |
| Auth | Stateless JWT bearer token (returned in the login body, stored client-side, sent as `Authorization: Bearer`), bcrypt hashing, forgot/reset (1h token), Student to Instructor upgrade |
| Catalog & search | Free-text search across course title/subtitle/description, category name, and instructor name; category + level filters; sort by newest/popular/price; live student count, lesson count, and total duration |
| Course detail (public) | Banner + thumbnail, instructor, level/language/duration, learning outcomes / prerequisites / who-it-is-for, tags, discounted pricing, curriculum tree, playable free preview lessons |
| Video | Direct-to-R2 presigned upload, ffmpeg transcode to AES-128 encrypted ABR HLS (360/480/720/1080 capped at source), ticket-gated playback, raw MP4 deleted after transcode |
| Player | Play/pause/seek/volume/fullscreen, keyboard shortcuts, resume, progress saving, playback speed, Picture-in-Picture, quality selection |
| Payments | Razorpay Orders REST API (no SDK), server-derived amounts, HMAC-SHA256 verification (callback + webhook), idempotent fulfillment under concurrency, webhook as source of truth, money in paise |
| RBAC | Admin / Instructor / Student roles, `requireRole` + course ownership, Admin-only control panel |
| Hardening | helmet, CORS allowlist, rate limiting on auth/payment/webhook, input validation, DOMPurify sanitization, parameterized ORM queries, RBAC with course ownership |

**Not built, by design (stated honestly):** there is no ratings/reviews system (we show real enrollment student counts, not star ratings), no wishlist, no quizzes/assessments, no captions, and no YouTube/external video source (video is upload-only so it can be protected).

---

## Tech stack

| Layer | Choice | Version | Why |
| --- | --- | --- | --- |
| Runtime | Node.js | 24 LTS | Global `fetch`, modern crypto |
| Language | TypeScript | 6 | Strict types across the stack |
| API | Express | 5 | Async errors auto-forward to the error handler |
| ORM | Sequelize | 6 | v7 is still alpha; v6 is the stable line |
| Database | PostgreSQL | (Neon, managed) | Relational data, JSON columns, row locks for payments |
| Cache | Redis (ioredis) | 5 | Role-permission version cache; strictly a cache, degrades to Postgres |
| Storage | Cloudflare R2 | S3-compatible | Private bucket, presigned URLs, and $0 egress for video |
| Auth | jsonwebtoken + bcryptjs | 9 / 3 | Stateless JWT bearer token, bcrypt password hashing |
| Payments | Razorpay | (no SDK) | Orders REST API + `crypto` HMAC, tiny dependency surface |
| Video | ffmpeg + hls.js | system / 1.6 | Encrypted ABR HLS transcode + browser playback |
| Email | nodemailer | 9 | SMTP when configured, console fallback in dev |
| Frontend | React + Vite | 19 / Vite 8 | SPA with same-origin `/api` proxy in dev |
| Styling | Tailwind CSS | 4 | Utility-first, with a few shadcn-style UI primitives |
| Data fetching | TanStack React Query | 5 | Server-state caching and invalidation |
| Routing | React Router | 7 | Public + protected + admin route trees |

Full version notes and per-package gotchas live in [`backend/docs/STACK.md`](backend/docs/STACK.md).

---

## Monorepo layout

```
VeoLMS/
  README.md                  <- you are here (submission docs)
  Jenkinsfile                single-server CI/CD (build image, redeploy container)
  docs/
    ARCHITECTURE.md          system design, request/auth/video/payment flows
    SECURITY.md              protection-by-protection checklist + residual risks
    COST.md                  monthly cost model for a small deployment
    CHALLENGES.md            the hard engineering problems and how they were solved
  backend/
    Dockerfile               multi-stage build, installs ffmpeg
    .env.example             every env var, documented
    src/
      app.ts                 bootstrap, middleware order, raw-body webhook mount
      routes.ts              router mount table
      config/env.ts          centralized, validated config
      db/                    sequelize, connection, associations, seeders
      middleware/            auth, RBAC, rate limit, id validation, errors
      routes/control/        RBAC admin panel: user, role, menu, permission
      routes/lms/            category, course, section, lesson, enrollment,
                             progress, media, payment, stats, contact
      services/              storage (R2), hls, hls-ticket, payment, token, email
    test/                    vitest unit tests
  frontend/
    src/
      lib/api.ts             axios instance: attaches the stored JWT as Authorization: Bearer
      pages/                 public, student, and admin pages
      features/              per-domain API hooks (React Query)
      components/            layout, UI primitives, LessonPlayer
```

The backend and frontend keep their own `README` / `CLAUDE` / `STACK` docs; this top-level README and `/docs` are the submission package.

---

## Local setup

You need **Node 24+**, a **PostgreSQL** instance, and a **Redis** instance running locally (or reachable). Cloudflare R2 and Razorpay are **optional**: the app boots without them. Without R2, only text lessons work (video is upload-only). Without Razorpay, free courses still enroll but paid purchases return 503.

### Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit: at minimum set JWT_SECRET and your Postgres
npm run dev                 # tsx watch on http://localhost:5005
```

On an empty database the app seeds only the essential bootstrap: roles (Admin/Instructor/Student), the admin-panel menus + permissions, and an admin user (from `ADMIN_*`). No sample courses or users are seeded; the catalog starts empty and is filled by real instructors/admins through the app. Schema is created with `sequelize.sync` (alter in dev, create-only in prod); there are no migrations yet.

### Frontend

```bash
cd frontend
npm install
npm run dev                 # Vite on http://localhost:5173
```

In dev, the frontend proxies `/api` to the backend, so there is no CORS dance. To point the SPA at a deployed backend instead, set `VITE_API_URL` to the API origin.

### Environment variables

All backend config is centralized and validated in `backend/src/config/env.ts`; the full annotated list is in [`backend/.env.example`](backend/.env.example). The essentials:

| Var | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | yes | Signs access tokens. Use a long random value. |
| `DATABASE_URL` or `POSTGRES_*` | yes | Postgres connection (`DATABASE_SSL=true` for managed/TLS) |
| `REDIS_URL` | recommended | Permission cache (defaults to `redis://localhost:6379`) |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | optional | Video + image storage. Unset: video disabled. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | optional | Paid purchases. Unset: free courses only. |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | optional | Real email. Unset: links logged to console. |
| `CORS_ORIGIN` | prod | Comma-separated allowlist (use explicit origins in prod) |
| `APP_URL` | prod | Frontend URL used to build email links |

---

## Running tests

The backend ships **20 vitest unit tests** over the pure, security-critical logic:

```bash
cd backend
npm test                    # vitest run
```

They cover Razorpay payment + webhook signature verification, pricing rules (free vs paid floor), id/integer validation, search-and-sort field whitelisting, and HLS ticket signing/verification. Integration tests that need a live database are out of scope for the challenge and noted as such.

---

## Live URLs and admin login

- **Backend API base (production):** `https://ptmsoftware.me/veolms-api`
  The API itself is mounted under `/api`, so endpoints are reached at `https://ptmsoftware.me/veolms-api/api/...` (for example `GET https://ptmsoftware.me/veolms-api/api/course/catalog`).
- **Frontend (production):** `<your-frontend-url>`

### Seeded admin login

Only an admin user is seeded (on an empty database) so you can sign in and start creating content; everyone else self-registers (and can upgrade to instructor in-app). Its credentials come from `ADMIN_*` and **must be changed before any real deployment**.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@veolms.local` | `Admin@123` (from `ADMIN_PASSWORD`) |

---

## Documentation

| Doc | What is inside |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, request/auth flow, data model, video/HLS pipeline, payment flow, design trade-offs |
| [docs/SECURITY.md](docs/SECURITY.md) | Every protection mapped to where it lives, plus honest residual risks |
| [docs/COST.md](docs/COST.md) | A concrete monthly cost model for a small deployment and the scaling levers |
| [docs/CHALLENGES.md](docs/CHALLENGES.md) | The genuinely hard problems and how they were solved |

---

## Submission checklist

- [ ] Frontend live URL: `<your-frontend-url>`
- [ ] Backend live URL: `https://ptmsoftware.me/veolms-api` (API under `/api`)
- [ ] GitHub repository: `<your-repo-url>`
- [ ] Admin login verified on the live deployment (and admin password rotated)
- [ ] Candidate contact details: `<your-name>`, `<your-email>`, `<your-phone-or-links>`
- [ ] Why I want to join VeoLMS: `<your-statement>`

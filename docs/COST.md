# Cost model

This is a realistic monthly cost estimate for running VeoLMS as a small production deployment. Every number is an **estimate** and uses public list pricing as of mid-2026; treat them as planning figures, not quotes. The single most important architectural cost decision is using **Cloudflare R2 for video storage**, because R2 charges **$0 for egress**, and egress is where video platforms normally bleed money.

All prices are in USD per month unless noted.

---

## The components

| Component | Service (example) | What it does | Tier assumed |
| --- | --- | --- | --- |
| Compute / API | Small VPS or Render instance | Stateless Express API + in-container ffmpeg transcode | 1 vCPU / ~1 GB |
| Database | Neon Postgres | Relational data; managed, autoscaling | Free or Launch |
| Cache | Upstash Redis | Permission-version cache (pure cache) | Free |
| Object storage | Cloudflare R2 | Video, HLS segments, images; **$0 egress** | Pay-as-you-go |
| Domain | Any registrar | DNS + the public hostname | Annual, amortized |
| Payments | Razorpay | Checkout + payout | Per-transaction, pass-through |
| Email | SMTP provider (or console in dev) | Reset + contact | Free tier |

---

## Why R2 is the headline

A streaming app's natural cost is bandwidth, not storage. On AWS S3, egress is roughly **$0.09/GB**. Cloudflare R2 charges **$0/GB egress** and bills only for stored bytes (~$0.015/GB-month) plus cheap operations.

Worked example, streaming **500 GB/month** of video:

| | AWS S3 | Cloudflare R2 |
| --- | --- | --- |
| Egress (500 GB) | ~$45.00 | **$0.00** |
| Storage (100 GB) | ~$2.30 | ~$1.50 |
| **Subtotal** | **~$47.30** | **~$1.50** |

That gap widens linearly with viewership. It is the reason VeoLMS uses an S3-compatible client pointed at R2 rather than S3 itself, and the player fetches encrypted segments directly from R2 (presigned) so the API never proxies and re-bills the bytes.

---

## Low-traffic estimate

Assumptions for the baseline:

- **~200 students**, **~1,000 active sessions/month**
- **~50 GB of video stored** (the source MP4 is deleted after transcode; only the encrypted HLS renditions live in R2)
- **~500 GB streamed/month** (the bandwidth that would dominate an S3 bill)
- Postgres comfortably inside a free/launch tier; Redis traffic trivial (a cached permission version per request)

| Line item | Service / tier | Estimated monthly |
| --- | --- | --- |
| Compute | Small VPS / Render (1 vCPU, ~1 GB) | $7 – $12 |
| Postgres | Neon (free → Launch) | $0 – $5 |
| Redis | Upstash (free) | $0 |
| R2 storage | ~50 GB @ ~$0.015/GB | ~$0.75 |
| R2 egress | 500 GB @ $0/GB | **$0** |
| R2 operations | Class A/B ops, modest | ~$0.50 |
| Domain | amortized annual | ~$1 |
| Email | SMTP free tier | $0 |
| **Total (infra)** | | **~$10 – $20 / month** |

Razorpay is excluded from the infra total because it is a **pass-through** transaction fee, not a fixed cost: roughly **2% + GST** on each successful payment (for example, on a ₹500 course sale, ~₹10 + GST). It scales with revenue, not with infrastructure, so it belongs in unit economics, not the hosting budget.

The same workload on S3 with naive egress would push the storage/bandwidth line from ~$1.75 to ~$47, which is why this stack lands in the ~$10-20 range instead of ~$60.

---

## What grows first, and the levers

As traffic climbs, costs move in this order, and each has a deliberate mitigation already designed into the system:

1. **Compute, because of transcode.** ffmpeg runs in the API container today, which competes with request handling for CPU. **Lever:** move transcoding to an **on-demand worker** that spins up per upload and shuts down (mentioned as the planned optimization in the HLS service). This decouples bursty CPU from steady request serving and lets the API box stay small.

2. **R2 storage, as the catalog grows.** Video accumulates. **Lever:** **R2 lifecycle rules** to expire abandoned/unconfirmed uploads on the `videos/` prefix and to age out unused renditions. Storage is the cheap axis here (egress is already $0), so this is housekeeping more than firefighting.

3. **Rate-limit correctness across instances.** The in-memory limiter is per-instance, so horizontal scaling multiplies the effective limit. **Lever:** swap in **`rate-limit-redis`** backed by the existing ioredis client so counts are shared. This is a config change, not a rewrite, and it is why Redis is already in the stack.

4. **Database read load.** Catalog/search reads dominate. **Lever:** the API is stateless and uploads go to R2, so it scales horizontally; pair that with **Postgres read replicas** for catalog queries and keep writes (payments, enrollment) on the primary.

5. **Redis tier.** Only bumps when the permission cache or a future Redis-backed limiter needs more throughput; the free tier covers the baseline comfortably because each request reads at most one small cached value.

---

## Summary

For a real small deployment, expect **roughly $10-20/month of fixed infrastructure**, plus pass-through Razorpay fees (~2% + GST) that scale with sales. The architecture front-loads the decisions that keep that number flat as viewership grows: $0-egress object storage, a stateless horizontally-scalable API, a transcode path that can be peeled off into a worker, and a cache that is genuinely optional. Numbers above are estimates on list pricing and will vary with provider, region, and real usage.

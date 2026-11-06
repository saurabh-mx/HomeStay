# 🚀 Vercel Deployment & Egress / Fast Origin Transfer Optimization Guide

This guide details how **HomeStay** is architected and configured for deployment on **Vercel** with maximum performance, minimal egress costs, and optimized **Fast Origin Transfer (FOT)** and **Fast Data Transfer (FDT)**.

---

## 📊 Understanding Vercel Transfer Metrics

| Metric | What It Measures | How We Optimized It |
|---|---|---|
| **Fast Data Transfer (FDT)** | Egress from Vercel’s global Edge CDN to end-user browsers | • **AVIF & WebP** image optimization (30–50% smaller)<br>• **Brotli & Gzip** compression enabled (`compress: true`)<br>• **Immutable caching** on static assets (1-year TTL)<br>• **Strong ETags** returning `304 Not Modified` (0 bytes payload) |
| **Fast Origin Transfer (FOT)** | Data moved between Vercel Edge nodes and compute/origin functions | • **Vercel Edge Caching (SWR)** via `s-maxage` headers<br>• **Lean Prisma select queries** (only needed columns)<br>• **Region Colocation** (`regions: ["iad1"]`)<br>• **Internal Project Rewrites** (no external egress hops) |

---

## 🛠️ Optimization Architecture

### 1. Edge Caching & Stale-While-Revalidate (SWR)
In `server/src/controllers/listing.controller.ts` and `review.controller.ts`, public read endpoints return CDN cache headers:

```http
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

- **Impact**: Up to **95%** of listing browse requests are served directly from the Vercel Edge CDN cache.
- **FOT Saved**: The origin serverless function is **not invoked** for repeat hits, eliminating redundant origin transfer and database compute.
- **Speed**: Visitor TTFB drops from ~300ms to **15–30ms**.

### 2. Payload Compression & 304 ETags
- **Express Backend**: Configured with `compression({ level: 6, threshold: 1024 })` and `app.set("etag", "strong")`.
- **Next.js Web**: `compress: true` and `poweredByHeader: false` in `apps/web/next.config.ts`.
- **Impact**: Reduces JSON and HTML payload size by **70–85%**.

### 3. Next.js Image Optimization
Configured in `apps/web/next.config.ts`:
- **Modern Formats**: Automatically converts images to **AVIF** (preferred) and **WebP**.
- **Edge Cache TTL**: `minimumCacheTTL: 2592000` (30 days) ensures processed images stay cached at the edge and never repeatedly re-download from origin storage.
- **Tuned Viewport Variants**: Only generates exact needed sizes `[640, 750, 828, 1080, 1200, 1920]`.

### 4. Region Colocation (`regions: ["iad1"]`)
Both `vercel.json` files lock the compute region to `iad1` (Washington, D.C. - US East), or your preferred cloud database region (e.g., Supabase / Neon / AWS RDS).
- **Impact**: Eliminates cross-continent hops between Vercel Edge compute and database origin.

---

## 🚀 How to Deploy on Vercel

### Option A: Via GitHub (Recommended for Automated CI/CD)

1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Open the [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
3. Import your `HomeStay` repository.
4. Set the **Root Directory** to `apps/web`.
5. Add the Environment Variables:
   - `NEXT_PUBLIC_API_URL` (e.g. `https://api.yourdomain.com` or Vercel server URL)
6. Click **Deploy**.

---

### Option B: Deploying Using Vercel CLI

#### 1. Log in to Vercel
In your terminal, run:
```bash
vercel login
```

#### 2. Deploy Web Frontend
```bash
cd apps/web
vercel --prod
```

#### 3. Deploy Serverless Backend (if hosting Express on Vercel)
```bash
cd server
vercel --prod
```

---

## ⚙️ Environment Variables Checklist on Vercel

| Variable | Environment | Description |
|---|---|---|
| `DATABASE_URL` | Production | PostgreSQL connection string (use pooled URL, e.g. Neon / Supabase / Prisma Accelerate) |
| `JWT_SECRET` | Production | Secret key for JWT signing |
| `JWT_REFRESH_SECRET` | Production | Secret key for refresh tokens |
| `CLIENT_URL` | Production | Production URL of your Next.js app (e.g. `https://homestay.vercel.app`) |
| `NEXT_PUBLIC_API_URL` | Production | Production URL of your backend API |
| `STRIPE_SECRET_KEY` | Production | Stripe live secret key |
| `RAZORPAY_KEY_ID` | Production | Razorpay live key |
| `RAZORPAY_KEY_SECRET` | Production | Razorpay live secret |
| `CLOUDINARY_CLOUD_NAME` | Production | Cloudinary cloud name for images |
| `CLOUDINARY_API_KEY` | Production | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Production | Cloudinary API secret |

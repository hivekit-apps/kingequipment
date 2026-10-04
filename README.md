# kiril-skidsteer

Marketing site for a north-GTA skid-steer rental business (stealth project; standard small-business surface).

## Run

```bash
npm install
cp .env.example .env.local   # fill in RESEND_API_KEY, NEXT_PUBLIC_GA4_ID, etc.
npm run dev
```

Visit http://localhost:3000.

## Configurable content (LOAD-BEARING)

Everything user-facing — business name, partner attribution, phone, email, photos, pricing,
service areas, FAQ — lives in **one file**: `config/site.json`.

Deployment-specific values (phone, email, domain, GA4 ID, GBP URL) are overridable via env vars:

| Env var | Default (from config/site.json) | Purpose |
|---|---|---|
| `NEXT_PUBLIC_PHONE` | `business.phoneFallback` | Phone number shown everywhere |
| `NEXT_PUBLIC_EMAIL` | `business.emailFallback` | Email shown everywhere |
| `NEXT_PUBLIC_SITE_URL` | `business.siteUrlFallback` | Canonical site URL (sitemap, JSON-LD) |
| `NEXT_PUBLIC_GBP_URL` | (none) | Google Business Profile URL — when set, renders link/card |
| `NEXT_PUBLIC_GA4_ID` | (none) | Google Analytics 4 measurement ID — when set, GA4 loads |

Server-only env vars (NOT NEXT_PUBLIC_, never exposed to browser):

| Env var | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend SDK; must be **domain-scoped, send-only** (minimal blast radius) |
| `LEAD_INBOX_EMAIL` | Destination address for form submissions (defaults to `business.email`) |
| `LEAD_CC_EMAIL` | Optional CC for forwarding to Kiril |
| `LEAD_FROM_EMAIL` | `from:` address; must be authorized in Resend |

## Swap-in checklist (when Kiril delivers real values)

- [ ] **Phone** → set `NEXT_PUBLIC_PHONE` in Vercel env, redeploy. No code change.
- [ ] **Email** → set `NEXT_PUBLIC_EMAIL` + `LEAD_INBOX_EMAIL`. No code change.
- [ ] **Domain (.ca)** → add domain in Vercel, set `NEXT_PUBLIC_SITE_URL`. Verify Resend domain (so `LEAD_FROM_EMAIL` works).
- [ ] **Photos** → drop files in `public/images/`, update `config/site.json` `photos` array.
- [ ] **GBP** → set `NEXT_PUBLIC_GBP_URL` once listing is live.
- [ ] **Business name** (if it changes from "Construction Equipment Rent") → edit `config/site.json` → `business.name`.

## Pages

- `/` — Home (hero, comparison, trust, FAQ, lead form)
- `/equipment` — Specs + attachments
- `/service-area` — Cities + delivery
- `/contact` — Phone, email, hours, form

## API

`POST /api/lead` — only backend route. Sends transactional email via Resend. Honeypot anti-spam, 5/hour/IP rate limit.

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · Resend · GA4 · next-sitemap

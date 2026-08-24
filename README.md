# anonymous.cool Historical Reconstruction

A Next.js + React + TypeScript + Prisma + Tailwind application for exhaustive Wayback Machine URL discovery, capture chronology, canonicalization, evidence-preserving diffs and historical reconstruction of `anonymous.cool`.

## Why the workflow is split

The browser-facing dashboard is optimized for Vercel Hobby. Large archive ingestion should **not** run as a single long Vercel function. Use the included CLI ingestion script locally or in a scheduled/worker environment, then deploy the read/UI application to Vercel.

## 1. Install

```bash
npm install
cp .env.example .env
```

Create a free PostgreSQL database (for example Neon) and put its connection string in `DATABASE_URL`.

## 2. Initialize database

```bash
npm run db:generate
npm run db:push
```

## 3. Run the live dashboard

```bash
npm run dev
```

Open `http://localhost:3000` and select **Run Aggregate Discovery**.

## 4. Persist the complete CDX inventory

```bash
npm run ingest -- anonymous.cool
```

The script queries the Wayback CDX domain scope, preserves every returned timestamp and historical alias, canonicalizes only for grouping, and stores replay/raw-replay URLs.

## 5. Vercel Hobby deployment

1. Push this folder to GitHub.
2. Import the repository in Vercel.
3. Add `DATABASE_URL` in project environment variables.
4. Deploy.
5. Run heavy ingestion outside Vercel to avoid Hobby execution limits.

## Archive methodology

- Domain discovery uses CDX `matchType=domain`.
- Original URLs are never discarded.
- HTTP/HTTPS and `www` variants are normalized for canonical grouping but preserved as aliases.
- Identical archive digests may be grouped for deep processing, but **every capture timestamp remains stored**.
- Changes are represented as observation intervals, not invented exact modification times.
- Wayback replay UI/script artifacts should be stripped before content diffing.
- Forensic anomalies are observations, not actor attribution. Attribution remains undetermined unless independent evidence supports it.

## Important limits

Internet Archive availability, robots restrictions, excluded captures, replay failures and rate limits can create gaps. A missing capture does not prove the page or text was removed at that exact time.

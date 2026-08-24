# anonymous.cool Historical Reconstruction — v2 Deep Forensics Expansion

A Next.js + React + TypeScript + Prisma + Tailwind research application for reconstructing the public Internet Archive history of `anonymous.cool` while preserving provenance and uncertainty.

## What v2 adds

- Recursive CDX-domain capture inventory and historical alias retention.
- SHA-256 fingerprints for raw responses, normalized HTML, and visible text.
- Deep archived HTML retrieval with Wayback replay-chrome normalization.
- Parsed title, description, canonical, robots, language, metadata, scripts, iframes, links, and media.
- Historical internal link graph.
- Paragraph/content-block provenance with first/last observed timestamps.
- Word-level and metadata-level change events bounded by adjacent capture times.
- Link-addition/removal chronology and large link-change anomaly observations.
- Redirect history ingestion from CDX metadata.
- Orphan-page candidate detection based on the ingested historical link graph.
- Historical sitemap/robots/XML membership reconstruction.
- Neutral anomaly records that separate observation, interpretation, and attribution evidence.
- CSV, JSON, and XML export pipeline.
- New dashboard tabs for sitemap, master timeline, orphan candidates, and forensic observations.

## Evidence model

The system intentionally distinguishes:

1. **Archived evidence** — directly observed in a public archive record.
2. **Computed difference** — derived by comparing archived observations.
3. **Reasonable inference** — a bounded interpretation supported by observations.
4. **Unproven attribution** — actor attribution that lacks independent evidence.

A missing archive capture is not treated as proof of deletion. If old content is last observed at `tA` and changed content is first observed at `tB`, the application records the change as occurring sometime in the interval `(tA, tB]` rather than inventing an exact modification timestamp.

## Architecture

The browser-facing application is optimized for Vercel Hobby. Heavy archive crawling is deliberately kept in resumable CLI scripts and should run locally or in a worker environment instead of a long Vercel serverless function.

### 1. Install

```bash
npm install
cp .env.example .env
```

Create a PostgreSQL database (Neon/Supabase/Postgres are suitable) and set `DATABASE_URL`.

### 2. Initialize the database

```bash
npm run db:generate
npm run db:push
```

### 3. Metadata inventory

```bash
npm run ingest -- anonymous.cool
```

This stores the CDX capture inventory, original historical URLs, canonical groupings, timestamps, MIME/status/digest/length metadata, redirects, and raw/replay URLs.

### 4. Deep snapshot ingestion

Process archived HTML in respectful batches:

```bash
npm run ingest:deep -- anonymous.cool 500
```

Run again to continue with the next unprocessed batch. Each successfully retrieved snapshot stores hashes, normalized HTML, visible text, metadata, link graph edges, media references, and preliminary anomaly observations.

### 5. Paragraph/content-block provenance

```bash
npm run provenance -- anonymous.cool
```

This hashes substantive text blocks and records their first/last observed capture times and occurrence positions.

### 6. Historical sitemap reconstruction

```bash
npm run sitemaps -- anonymous.cool
```

This inspects ingested sitemap, XML, and robots candidates and stores URL memberships per archived observation.

### 7. Change, redirect, orphan, and anomaly analysis

```bash
npm run analyze -- anonymous.cool
```

This compares adjacent deep snapshots, creates bounded text/metadata/link change events, writes redirect history, flags large link-graph changes for review, and identifies current orphan candidates in the ingested evidence corpus.

### 8. Export research datasets

```bash
npm run export -- anonymous.cool exports
```

Outputs:

- `url-inventory.csv`
- `capture-inventory.csv`
- `change-events.csv`
- `anomalies.csv`
- `archive-manifest.json`
- `aggregate-sitemap.xml`

### 9. Run the UI

```bash
npm run dev
```

Open `http://localhost:3000` and click **Run Discovery + Load Analysis**.

### Full convenience pipeline

```bash
npm run pipeline
```

For very large corpora, prefer running each stage separately and repeating `ingest:deep` in controlled batches.

## API routes

- `/api/discover?domain=anonymous.cool` — live public CDX aggregate discovery.
- `/api/history?url=...` — all known captures for an exact historical URL.
- `/api/compare?a=...&b=...` — normalized visible-text diff between two replay URLs.
- `/api/stats?domain=anonymous.cool` — persisted corpus statistics.
- `/api/timeline?domain=anonymous.cool` — persisted chronological change events.
- `/api/orphans?domain=anonymous.cool` — evidence-bounded orphan candidates.
- `/api/anomalies?domain=anonymous.cool` — neutral forensic observations.
- `/api/url-details?url=...` — detailed URL provenance, snapshots, blocks, and changes.

## Vercel Hobby deployment

1. Push the project to GitHub.
2. Import it into Vercel.
3. Configure `DATABASE_URL`.
4. Deploy the Next.js application.
5. Run the heavy ingestion scripts outside Vercel.
6. Refresh the UI after new batches are persisted.

## Archive reliability safeguards

- Cache or persist completed work instead of redownloading it.
- Use modest batch sizes and delays.
- Treat robots exclusions, replay failures, outages, and archive gaps as missing evidence.
- Strip known Wayback replay UI/scripts before content comparison.
- Preserve all capture timestamps even when multiple captures have identical content digests.
- Never treat an external script, iframe, redirect, or abrupt content change as proof of a particular attacker or organization.

## Known limitations

The system can only analyze public material actually available from the archive at execution time. Internet Archive exclusions, missing captures, malformed historical pages, and blocked replay resources may prevent a complete reconstruction. The database and reports preserve these limitations rather than silently filling gaps.

## Vercel Analytics

Vercel Web Analytics is integrated globally through the root App Router layout.

```tsx
import { Analytics } from "@vercel/analytics/next";
```

The root layout renders `<Analytics />` after the application content, so page-view and visitor telemetry is collected across all routes when deployed on Vercel. The package is included in `dependencies`; run `npm install` after extracting the project to install it locally.


## Vercel build fix (v2.1.1)

Prisma schema syntax was normalized for Prisma 6 / Vercel builds:

- `generator` and `datasource` blocks now use standard multiline Prisma syntax.
- enum values are declared one value per line.
- relation attributes were reformatted to canonical Prisma syntax.

This fixes the `P1012` validation failure reported by Vercel where the one-line generator/datasource declarations and multi-value enum lines were parsed as invalid generator/enum definitions.

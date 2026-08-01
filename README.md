# Rotaract Bangalore East

[![Netlify Status](https://api.netlify.com/api/v1/badges/d4f68392-a404-44af-bcae-4ebd807ff1d1/deploy-status)](https://app.netlify.com/projects/rotaractblreast/deploys)

Official website of [Rotaract Bangalore East](https://rotaractblreast.org) — an open-source, static site built with **Astro**, content managed in **Sanity**, and hosted on **Netlify**.

**UNITE · RISE · EMPOWER** · Brand orange `#ff9000`

## Features

- News, events, causes, and team managed in Sanity Studio at `/admin`
- Static HTML at deploy time (fast CDN delivery; no server runtime for pages)
- Pagefind site search, RSS (`/rss.xml`), and sitemap
- Join form and newsletter → Google Apps Script + Sheets (`PUBLIC_FORMS_API_URL`), both confirming inline with no redirect; contact is details-only (no on-site contact form)
- Brand kit and club info from lightweight YAML + static assets

## Quick start

```bash
cp .env.example .env
# Set PUBLIC_SANITY_PROJECT_ID and PUBLIC_SANITY_DATASET
# Optional: SANITY_API_WRITE_TOKEN only if you run migration/repair scripts

npm install
npm run dev
```

| URL | What |
|-----|------|
| http://localhost:4321/ | Public site |
| http://localhost:4321/admin/ | Sanity Studio |

## Content model

| Content | Where it lives |
|---------|----------------|
| News, events, causes, team, categories, tags | Sanity |
| Site settings, contact, home/about copy | `_data/info.yml` |
| Join FAQ | `_data/join_faq.yml` |
| Brand kit | `_data/brandkit.yml` + `public/images/brandkit/` |

Sanity is the source of truth for editorial content. Do not set `USE_FS_CONTENT=1` on Netlify.

## Editing content (`/admin`)

Editors use **Google** via Sanity (not GitHub).

1. Create a [Sanity](https://www.sanity.io) account (Google login is fine).
2. Ask a club admin to invite you to the project (Editor role).
3. Open [rotaractblreast.org/admin/](https://rotaractblreast.org/admin/) and sign in.
4. Use **Content**, **Media**, and **Query** (Vision) in the Studio toolbar.
5. Publish — a Sanity webhook should trigger a Netlify rebuild so changes go live.

Images live in Studio **Media** (Sanity CDN), not in the Git repo.

Ops setup for publish → deploy: see [`SANITY-NETLIFY.md`](./SANITY-NETLIFY.md).

## How deploys work

This site is **static**. Sanity content is fetched during `npm run build` and baked into HTML. Visitors do not call Sanity on each page view.

Rebuilds happen when:

1. Code is pushed to the production branch (`master`), or
2. Sanity publishes content (build hook + webhook), or
3. A **daily** scheduled Netlify build runs — needed because event “upcoming / ongoing / past” status is computed at build time from start/end dates.

## Stack

- [Astro 5](https://astro.build) (static) + Tailwind CSS 3
- [Sanity](https://www.sanity.io) Studio embedded with `@sanity/astro`
- [Pagefind](https://pagefind.app) search
- Netlify (CDN, headers, redirects)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build + Pagefind index |
| `npm run preview` | Preview the `dist` output |
| `npm run qa` | Local QA script |
| `npm run purge:orphans` | List unused Sanity assets (dry-run) |

## Deploy (Netlify)

Build command and publish directory are defined in `netlify.toml`:

```text
npm run build
→ publish: dist
```

Netlify installs dependencies itself (`npm ci` when `package-lock.json` is present) before that command.
Public Sanity project settings can live in `netlify.toml` `[build.environment]` (they are not secrets). Keep `SANITY_API_WRITE_TOKEN` out of Netlify — it is only for local maintenance scripts.

Redirects should stay minimal (legacy hosts, `/teamadmin` → `/admin/`, `/feed.xml` → `/rss.xml`). Do not add forced trailing-slash redirects; they can loop on Netlify.

## Contributing

Issues and pull requests are welcome. For agent / maintainer context (architecture pitfalls, env rules, rebuild hooks), see [`AGENTS.md`](./AGENTS.md). Production ship checklist: [`SHIP-CRITERIA.md`](./SHIP-CRITERIA.md).

## License / club

Website of Rotaract Bangalore East. Brand assets and club marks remain club property; code contributions follow the repository’s license and contribution norms.

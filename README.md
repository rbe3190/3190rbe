# Rotaract Bangalore East

[![Netlify Status](https://api.netlify.com/api/v1/badges/d4f68392-a404-44af-bcae-4ebd807ff1d1/deploy-status)](https://app.netlify.com/projects/rotaractblreast/deploys)

[rotaractblreast.org](https://rotaractblreast.org) — **Astro** (static) + **Sanity** CMS, hosted on **Netlify**.

**UNITE . RISE . EMPOWER** · Brand orange `#ff9000`

## Develop

```bash
cp .env.example .env   # set PUBLIC_SANITY_* (leave USE_FS_CONTENT unset)
npm install
npm run dev
```

Site: `http://localhost:4321` · Studio: `http://localhost:4321/admin/`

Content is **Sanity-only** (news, events, causes, team). Static YAML remains under `_data/` for site settings, join FAQ, and brand kit.
## Content admin (`/admin`)

Editors sign in with **Google** via Sanity (not GitHub).

1. Create a free [Sanity](https://www.sanity.io) account (Google login is fine).
2. Club admin invites you on the Sanity project (role **Editor**).
3. Open [rotaractblreast.org/admin/](https://rotaractblreast.org/admin/) → sign in.
4. Use the top toolbar: **Content** (docs), **Media** (all uploaded images/files), **Query** (Vision).
5. Publish → Netlify rebuild (Sanity webhook → build hook).

Dataset assets live in Studio **Media**, not under Manage → Dataset (that screen is for dataset settings, not a file browser).

Ops: set `PUBLIC_SANITY_PROJECT_ID` + `PUBLIC_SANITY_DATASET` in Netlify. Create a build hook and attach a Sanity webhook on publish.

Optional: purge unused migration leftovers (dry-run, then delete):

```bash
npm run purge:orphans
npm run purge:orphans:delete
```

### One-time content migration (already done)

Jekyll `_posts` / `_events` / `_causes` were migrated into Sanity and removed from the repo.
`scripts/migrate-content.mjs` remains only as a historical reference (it expects those folders).

Ops: ensure Netlify does **not** set `USE_FS_CONTENT=1` (site/build env or `netlify.toml`).
## Stack

- Astro 5 static site + Tailwind 3 (existing RBE tokens)
- Sanity Studio embedded at `/admin`
- Pagefind search, RSS, sitemap
- Forms still post to Google Forms

## QA

```bash
./scripts/qa-astro.sh
```

## Deploy

Netlify build: `npm ci && npm run build` → publish `dist` (see `netlify.toml`). Same site/domain as before.

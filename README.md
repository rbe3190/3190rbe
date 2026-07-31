# Rotaract Bangalore East

[![Netlify Status](https://api.netlify.com/api/v1/badges/d4f68392-a404-44af-bcae-4ebd807ff1d1/deploy-status)](https://app.netlify.com/projects/rotaractblreast/deploys)

[rotaractblreast.org](https://rotaractblreast.org) — **Astro** (static) + **Sanity** CMS, hosted on **Netlify**.

**UNITE . RISE . EMPOWER** · Brand orange `#ff9000`

## Develop

```bash
cp .env.example .env   # USE_FS_CONTENT=1 until Sanity is filled
npm install
npm run dev
```

Site: `http://localhost:4321` · Studio: `http://localhost:4321/admin/`

## Content admin (`/admin`)

Editors sign in with **Google** via Sanity (not GitHub).

1. Create a free [Sanity](https://www.sanity.io) account (Google login is fine).
2. Club admin invites you on the Sanity project (role **Editor**).
3. Open [rotaractblreast.org/admin/](https://rotaractblreast.org/admin/) → sign in.
4. Publish → Netlify rebuild (Sanity webhook → build hook).

Ops: set `PUBLIC_SANITY_PROJECT_ID` + `PUBLIC_SANITY_DATASET` in Netlify. Create a build hook and attach a Sanity webhook on publish.

### One-time content migration

```bash
# Write token from https://www.sanity.io/manage → API → Tokens
export PUBLIC_SANITY_PROJECT_ID=...
export PUBLIC_SANITY_DATASET=production
export SANITY_API_WRITE_TOKEN=...
npm run migrate
```

Then set `USE_FS_CONTENT=0` (or unset) so production builds read Sanity.

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

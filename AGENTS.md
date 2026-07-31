# AGENTS.md — Rotaract Bangalore East website

Persistent guidance for coding agents working in this repository.
Prefer this file over chat history when resuming work.

## Project

- **Site:** [rotaractblreast.org](https://rotaractblreast.org)
- **Repo:** open-source club website for Rotaract Bangalore East
- **Hosting:** Netlify (production branch: `master`)
- **CMS:** Sanity Studio embedded at `/admin` (Google login; editors do not need GitHub)

## Stack (current)

- **Astro 5** static site (`output: "static"`, `trailingSlash: "always"`)
- **Tailwind 3** with RBE design tokens (`#ff9000` brand orange)
- **Sanity 3** via `@sanity/astro` + React Studio
- **Pagefind** search (built into `npm run build`)
- **RSS** (`/rss.xml`), **sitemap**, Google Forms for join/contact/subscribe

Jekyll, Decap, and Git Gateway are **gone**. Do not reintroduce them.

## Content sources

| Content | Source of truth |
|--------|------------------|
| News (`post`), events, causes, team, categories, tags | **Sanity** |
| Site settings / contact / home copy | `_data/info.yml` |
| Join FAQ | `_data/join_faq.yml` |
| Brand kit metadata | `_data/brandkit.yml` + `public/images/brandkit/` |
| Site chrome images | `public/images/site/`, `public/images/RBELogoHD/` |

- Local upload folders (`public/images/uploads`, `_posts`, `_events`, `_causes`, `_data/team.yml`) were removed after CDN migration.
- `USE_FS_CONTENT=1` is a **local debug-only** escape hatch. Production must leave it unset. `useFs()` in `src/lib/content.ts` returns true only when that flag is `"1"` — a missing Sanity project id must **not** fall back to deleted FS collections.

## Environment

| Variable | Where | Notes |
|----------|--------|--------|
| `PUBLIC_SANITY_PROJECT_ID` | Netlify build + local `.env` | Public; also pinned in `netlify.toml` |
| `PUBLIC_SANITY_DATASET` | Netlify build + local `.env` | Usually `production` |
| `SANITY_API_WRITE_TOKEN` | **Local `.env` only** | Migration/repair/purge scripts — never commit, never put on Netlify |
| `USE_FS_CONTENT` | Optional local only | Do not set on Netlify |

`.env` is gitignored. Use `.env.example` as the template.

## Build & deploy

```text
npm ci && npm run build   →   publish dist
```

Defined in `netlify.toml`. Node 20.

### Rebuild triggers (both needed)

1. **Sanity publish → Netlify build hook** — so Studio edits go live without Git. See `SANITY-NETLIFY.md`.
2. **Daily scheduled build** — upcoming / ongoing / past event buckets are computed at **build time** (`src/lib/events.ts` → `nowStamp()`). Without a daily rebuild, ended events stay “upcoming” until the next deploy.

This is a **static** site: visitors never hit Sanity at request time. HTML is baked at build.

## Studio / markdown

- Custom body editor: `src/studio/MarkdownBodyInput.tsx` (+ `markdownEditor.css`)
- Wired via `markdownSchema({ input: MarkdownBodyInput })` in `sanity.config.ts`
- Images: preview dialog (alt + caption) → upload to Sanity Media → insert full CDN URL
- Public markdown: `src/lib/markdown.ts` + `.prose-rbe` in `src/styles/global.css`
- Schema types: `schemaTypes/` (`post`, `event`, `cause`, `team`, `category`, `tag`)

## Netlify redirects — hard rule

**Never** add trailing-slash force redirects like:

```toml
from = "/about"
to = "/about/"
force = true
```

Netlify matches both `/about` and `/about/`, which causes `ERR_TOO_MANY_REDIRECTS`. Astro already emits `about/index.html`; Netlify serves `/about/` natively.

Keep redirects **minimal and critical**, for example:

- Legacy host → primary domain (`*.netlify.com`, old domains if still in use)
- `/teamadmin` → `/admin/`
- `/feed.xml` → `/rss.xml`

Do not pile on “compatibility” slash or category redirects unless there is a measured need.

## Key paths

```text
src/pages/           Public routes
src/components/      UI
src/lib/content.ts   Sanity (and optional FS) content API
src/lib/events.ts    Event state: upcoming | ongoing | past
src/studio/          Studio UI customizations
schemaTypes/         Sanity schemas
scripts/             migrate / repair / purge / QA (local)
_data/               Static YAML (not in Studio)
public/              Static assets + Pagefind output sync
netlify.toml         Build, headers, redirects
```

## Scripts agents may run

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local site + Studio |
| `npm run build` | Production build + Pagefind |
| `npm run qa` | `scripts/qa-astro.sh` |
| `npm run purge:orphans` | Dry-run unused Sanity assets |
| `npm run repair:studio` | One-off data repairs (needs write token) |

Do **not** run destructive purge/delete or write migrations unless the user asks.

## Agent working agreements

- **Do not commit or push** unless the user explicitly asks.
- Prefer small, focused diffs; match existing Astro/Tailwind/RBE patterns.
- After content/architecture changes, verify `npm run build` (and smoke `/`, `/news/`, `/events/`, `/about/`, `/admin/`).
- Keep public docs (`README.md`) accurate for open-source readers; keep this file as the agent ops memory.
- Ship checklist: `SHIP-CRITERIA.md`.

## Recent cutover memory (2026-07)

- Migrated from Jekyll + Git-based CMS to Astro + Sanity.
- Merged to `master` via PR; production is Sanity-only.
- Production failures seen and fixed/understood:
  1. Missing `PUBLIC_SANITY_*` on Netlify → build fell back / threw → pin in `netlify.toml`.
  2. Trailing-slash `force` redirects → redirect loops on `/about/` etc. → remove those rules.
- Local uncommitted / in-flight: slimmed `netlify.toml` redirects (confirm before commit).
- Still required ops for editors: Sanity webhook → Netlify build hook; keep daily build for event dates.

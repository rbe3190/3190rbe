# Ship criteria — production promote (Astro + Sanity)

**Product sign-off checklist** before treating Netlify production as done.

## Local / preview

- [ ] `npm run build` succeeds (Astro → `dist` + Pagefind)
- [ ] `scripts/qa-astro.sh` PASS
- [ ] Public UI visual parity checklist PASS vs production (home, about, join, contact, news, event, causes, brandkit — desktop + mobile)
- [ ] Sample event JSON-LD: valid `endDate` (falls back to `startDate` if missing); includes `url`
- [ ] News JSON-LD includes `publisher` / `dateModified` / `mainEntityOfPage`
- [ ] `public/llms.txt` cites `sitemap-index.xml` and `/rss.xml`
- [ ] `dist/robots.txt` includes `Disallow: /admin/`
- [ ] No Decap / Git Gateway / consent banner / Clarity

## Production (Netlify, after promote)

- [ ] `curl -sI https://rotaractblreast.org/` includes `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- [ ] `curl -sI https://rotaractblreast.org/admin/` includes `X-Robots-Tag: noindex` (or Studio loads with noindex meta)
- [ ] `curl -s https://rotaractblreast.org/robots.txt` includes `Disallow: /admin/`
- [ ] Home loads Astro-bundled CSS (under `/_astro/`), not legacy `css/style.css`
- [ ] GA loads by default; no consent banner / Clarity
- [ ] Smoke: Join and Subscribe post to Apps Script (`PUBLIC_FORMS_API_URL`) → inline thank-you, no redirect, row lands in the `Join` / `Newsletter` tab; Contact shows details (no form); share; events/news grids
- [ ] Editor: Google login at `/admin`, publish → Netlify rebuild → content live
- [ ] Netlify env (pinned in `netlify.toml`): `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, `PUBLIC_FORMS_API_URL`; **do not** set `USE_FS_CONTENT=1` (Sanity is source of truth)
## Go / no-go

| Result | Meaning |
|--------|---------|
| **GO** | All local checks + production checks green; UI parity passed |
| **NO-GO** | UI parity fail, broken URLs, or admin/Google publish path broken |

Signed: _________________ Date: _________

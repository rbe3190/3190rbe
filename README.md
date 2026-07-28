# Rotaract Bangalore East

[rotaractblreast.org](https://rotaractblreast.org) — Jekyll + Netlify + [Decap CMS](https://decapcms.org/) with GitHub OAuth.

**UNITE . RISE . EMPOWER** · Brand orange `#ff9000`

## Develop

```bash
bundle install
bundle exec jekyll serve
```

Open `/admin/` locally to load Decap (GitHub login works against production OAuth after the app is registered).

## Content admin (`/admin`)

Editors sign in with **GitHub** (Write access on this repo). There is no Netlify Identity / Git Gateway.

### One-time ops (club Netlify + GitHub owner)

```bash
./scripts/qa-admin-oauth.sh
```

That script prints the full checklist: create a GitHub OAuth App (callback `https://api.netlify.com/auth/done`), install it under Netlify → OAuth, invite editors with Write, then disable Identity/Git Gateway after UAT.

### Editor onboarding

1. Create a free GitHub account.
2. Accept an invite to `rotaractblreast/RBEwebsite` with **Write** (team `website-editors` or Collaborator).
3. Open [rotaractblreast.org/admin/](https://rotaractblreast.org/admin/) → **Login with GitHub**.
4. Publish writes directly to `master` and triggers a Netlify deploy.

All News posts live under `_posts/` and are editable in the CMS.

## Stack

- Theme UI + Bootstrap 5.3 + orange brand layer [`css/rbe.css`](css/rbe.css)
- Design notes: [`DESIGN.md`](DESIGN.md)
- Content: `_posts`, `_events`, `_causes`, `_data`

## QA

```bash
./scripts/qa-local.sh
./scripts/qa-admin-oauth.sh   # after deploy + OAuth wired
```

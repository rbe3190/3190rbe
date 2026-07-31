# Sanity + Netlify webhook (ops)

1. Netlify → Site configuration → Build & deploy → Build hooks → **Add build hook** (name: `sanity-publish`).
2. Copy the hook URL.
3. Sanity manage → Project → API → Webhooks → Create:
   - URL: the Netlify build hook
   - Trigger on: Create / Update / Delete
   - Filter: `_type in ["post","event","cause","team","category","tag"]` (or all)
4. Publish a test edit in `/admin` and confirm a Netlify deploy starts.

Editors never need GitHub — only a Sanity invite + Google login.

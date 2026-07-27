#!/usr/bin/env bash
# Verify Netlify Identity + Git Gateway health for Decap /admin.
# Regenerating the GitHub PAT must be done in the Netlify UI (this script only verifies).
set -euo pipefail

SITE="${SITE_URL:-https://rotaractblreast.org}"
fail=0

ok() {
  local name="$1" cond="$2"
  if [[ "$cond" == "1" ]]; then
    echo "OK $name"
  else
    echo "FAIL $name"
    fail=1
  fi
}

echo "== Ops checklist (Netlify UI — run if FAIL below) =="
echo "1. Netlify → site → Identity → enabled, Invite only"
echo "2. Identity → Services → Git Gateway → Enable / Regenerate GitHub access token (repo scope)"
echo "3. Hard-refresh ${SITE}/admin/ after the Decap 3600s pause ends"
echo ""

echo "== Probe ${SITE} =="
gw_code=$(curl -s -o /tmp/rbe-gw-body.txt -w "%{http_code}" "${SITE}/.netlify/git/github/")
gw_body=$(cat /tmp/rbe-gw-body.txt 2>/dev/null || true)
echo "GET /.netlify/git/github/ → HTTP ${gw_code}"
echo "Body: ${gw_body:0:200}"

# Unauthenticated probe: 401/403 with a clear auth message is normal.
# 404 usually means Git Gateway is not enabled on the site.
if [[ "$gw_code" == "404" ]]; then
  ok "git_gateway_enabled" 0
  echo "HINT: Enable Git Gateway in Netlify Identity → Services."
else
  ok "git_gateway_endpoint_reachable" 1
fi

# Config shipped to production (after deploy)
cfg=$(curl -s "${SITE}/admin/config.yml" || true)
ok "prod_search_false" $([[ "$cfg" == *"search: false"* ]] && echo 1 || echo 0)
ok "prod_no_editorial_workflow" $([[ "$cfg" != *"publish_mode: editorial_workflow"* ]] && echo 1 || echo 0)
ok "prod_git_gateway" $([[ "$cfg" == *"git-gateway"* ]] && echo 1 || echo 0)

echo ""
echo "== Manual browser check after login (required for X-RateLimit-Limit) =="
echo "DevTools → Network → open News in /admin"
echo "  Expect: requests to ${SITE}/.netlify/git/github/..."
echo "  Expect: response header X-RateLimit-Limit ≈ 5000 (not ~60)"
echo "  Fail if: 'API rate limit exceeded for <your-IP>'"

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "Gateway/config checks failed. Complete Netlify ops + redeploy, then re-run."
  exit 1
fi
echo ""
echo "Automated probes passed. Complete the manual rate-limit header check after Identity login."

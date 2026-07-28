#!/usr/bin/env bash
# Ops + prod probes for Sveltia CMS + GitHub OAuth (replaces Git Gateway checks).
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

echo "== Ops checklist (GitHub + Netlify UI — complete before / after first deploy) =="
echo ""
echo "A. GitHub OAuth App (org preferred: rotaractblreast)"
echo "   1. https://github.com/organizations/rotaractblreast/settings/applications"
echo "      or https://github.com/settings/developers → New OAuth App"
echo "   2. Homepage URL: https://rotaractblreast.org"
echo "   3. Authorization callback URL (exact): https://api.netlify.com/auth/done"
echo "   4. Create → copy Client ID → generate Client Secret"
echo ""
echo "B. Netlify OAuth provider"
echo "   1. Site → Project configuration → Access & security → OAuth"
echo "   2. Install provider → GitHub → paste Client ID + Secret → Save"
echo "   (Do not confuse with Identity → External providers.)"
echo ""
echo "C. Editor access"
echo "   1. Create team website-editors (or add Collaborators) with Write on"
echo "      rotaractblreast/RBEwebsite"
echo "   2. Invite 2–5 editors; they must accept before first /admin login"
echo "   3. Do NOT enable require-PR branch protection on master (blocks CMS publish)"
echo ""
echo "D. After UAT passes — tear down Identity / Git Gateway"
echo "   1. Identity → Services → Disable Git Gateway (revoke old PAT)"
echo "   2. Disable Identity / remove Identity-only users"
echo "   3. Re-run this script: gateway should be 404 (expected)"
echo ""

echo "== Probe ${SITE} =="
cfg=$(curl -s "${SITE}/admin/config.yml" || true)
ok "prod_github_backend" $([[ "$cfg" == *"name: github"* ]] && echo 1 || echo 0)
ok "prod_repo" $([[ "$cfg" == *"rotaractblreast/RBEwebsite"* ]] && echo 1 || echo 0)
ok "prod_oauth_only" $([[ "$cfg" == *"auth_methods"* ]] && [[ "$cfg" == *"oauth"* ]] && echo 1 || echo 0)
ok "prod_no_git_gateway" $([[ "$cfg" != *"git-gateway"* ]] && echo 1 || echo 0)
ok "prod_search_false" $([[ "$cfg" == *"search: false"* ]] && echo 1 || echo 0)

admin_html=$(curl -s "${SITE}/admin/" || true)
ok "prod_sveltia_script" $([[ "$admin_html" == *"@sveltia/cms"* ]] && echo 1 || echo 0)
ok "prod_no_decap" $([[ "$admin_html" != *"decap-cms"* ]] && echo 1 || echo 0)
ok "prod_no_identity_widget" $([[ "$admin_html" != *"netlify-identity-widget"* ]] && echo 1 || echo 0)

gw_code=$(curl -s -o /tmp/rbe-gw-body.txt -w "%{http_code}" "${SITE}/.netlify/git/github/")
echo "GET /.netlify/git/github/ → HTTP ${gw_code}"
# After tear-down, 404 is success. Before tear-down, 401 still means gateway exists (legacy).
if [[ "$gw_code" == "404" ]]; then
  ok "git_gateway_disabled" 1
elif [[ "$gw_code" == "401" || "$gw_code" == "403" ]]; then
  echo "NOTE: Git Gateway still reachable (HTTP ${gw_code}). Disable after UAT (step D)."
  ok "git_gateway_still_enabled_pending_teardown" 1
else
  ok "git_gateway_probe_unexpected" 0
fi

echo ""
echo "== Manual browser UAT (required) =="
echo "1. Incognito → ${SITE}/admin/ → Login with GitHub"
echo "2. DevTools → Network → open News"
echo "   Expect: api.github.com (GraphQL/REST), NOT /.netlify/git/github/"
echo "   Expect: X-RateLimit-Limit ≈ 5000 (not ~60)"
echo "   Fail if: 'API rate limit exceeded for <your-IP>'"
echo "3. News list shows ~10 entries (archived posts stay on the public site)"
echo "4. Open Causes, Events, Team, Brand Kit — no 403 rate-limit storms"
echo "5. Edit + publish a harmless field → commit on master as your GitHub user → Netlify build green"
echo "6. Second Write editor can log in; user without Write cannot publish"

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "Automated probes failed. Finish OAuth ops + deploy, then re-run."
  exit 1
fi
echo ""
echo "Automated probes passed (or site not yet deployed). Complete manual UAT + step D tear-down."

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build:css >/tmp/rbe-css-build.log
bundle exec jekyll build >/tmp/rbe-jekyll-build.log

python3 - <<'PY'
from pathlib import Path
import re
import sys

failures = []

def ok(name, cond):
    print(("OK" if cond else "FAIL"), name)
    if not cond:
        failures.append(name)

def read(p):
    return Path(p).read_text(encoding="utf-8", errors="ignore")

about = read("_site/about.html")
home = read("_site/index.html")
join = read("_site/join.html")
contact = read("_site/contact.html")
events = read("_site/events.html")
news = read("_site/news/index.html")
brandkit = read("_site/brandkit.html")
search = read("_site/search.html")
admin = read("_site/admin/config.yml")
css = read("_site/assets/css/main.css")
robots = read("_site/robots.txt")
site_js = read("_site/assets/js/site.js")

ok("robots.txt", Path("_site/robots.txt").exists())
ok("robots_disallow_admin", "Disallow: /admin/" in robots)
ok("headers", Path("_site/_headers").exists())
ok("feed.xml", Path("_site/feed.xml").exists())
ok("compiled_css", Path("_site/assets/css/main.css").exists())
ok("site_js", Path("_site/assets/js/site.js").exists())
ok("solaris_css", "assets/css/main.css" in about)
ok("no_legacy_style", "css/style.css" not in about and "css/rbe.css" not in about)
ok("no_bootstrap_cdn", "bootstrap@" not in about and "cdn.jsdelivr.net/npm/bootstrap" not in about)
ok("skip_link", "Skip to main content" in about)
ok("main", 'id="main-content"' in about)
ok("mobile_nav", "mobile-nav" in about and "nav-toggle" in about)
ok("nav_escape", "Escape" in site_js and "nav-open" in site_js)
ok("consent_fab", "consent-open" in site_js or "consent-open" in css)
ok("consent", "rbe-consent" in about)
ok("district_3191", "3191" in home)
ok("hero_motto", "UNITE. RISE. EMPOWER." in home)
ok("hero_mobile_height", "min-h-[70vh]" in home or "min-h-\\[70vh\\]" in home)
ok("header_logo", "RBEUniteRiseEmpower-crest" in about)
ok("section_pad_responsive", ".section-pad" in css and "2.5rem" in css and "@media" in css)
ok("overflow_x", "overflow-x-hidden" in css or "overflow-x:hidden" in css)
ok("brandkit_scroll", "overflow-x-auto" in brandkit)
ok("brandkit_gallery", 'id="brandkit-gallery"' in brandkit or "brandkit-card" in brandkit)
ok("brandkit_filters", "brandkit-filter" in brandkit)
ok("no_brandkit_side_nav", "brandkit-nav" not in brandkit)
ok("team", "Surakshith" in about)
ok("join_form_fields", "entry.610221127" in join)
ok("contact_form_fields", "entry.1155332808" in contact)
ok("events_page", "Events" in events)
ok("news_page", "News" in news)
ok("admin_team", "_data/team.yml" in admin)
ok("admin_search_disabled", "search: false" in admin)
ok("admin_no_editorial_workflow", "publish_mode: editorial_workflow" not in admin)
ok("admin_no_squash_merges", "squash_merges:" not in admin)
ok("admin_git_gateway", "name: git-gateway" in admin)
ok("no_teamadmin", not Path("teamadmin").exists())
ok("feed_meta", "feed.xml" in about or "application/atom+xml" in about)
ok("ngo", "NGO" in about)
ok("no_donate_popup", "Donation Information" not in home)
ok("search_noindex", 'name="robots" content="noindex"' in search)

# v2 content & discovery
ok("events_past_heading", "Past events" in events)
ok("events_no_happening_now_section", "Happening now" not in events)
ok("home_event_lifecycle", "assign-event-state" in Path("_includes/assign-event-state.html").read_text() or Path("_includes/assign-event-state.html").exists())
ok("search_overlay", 'id="search-overlay"' in about and "data-search-open" in about)
ok("no_listing_search_strip", "listing-search-q" not in news and "listing-search-q" not in events and "listing-search-q" not in read("_site/causes.html"))
ok("search_type_filters", "data-search-type" in search and '"type": "pages"' in search)
ok("search_site_link_hero", "Search the site" in news)
ok("about_team_anchor", 'id="team"' in about)
ok("about_team_member_since", "Member since" in about)
ok("about_team_compact", "team-card" in about and "rounded-full" in about)
ok("about_team_no_portrait_tiles", "aspect-[4/5]" not in about and "aspect-\\[4\\/5\\]" not in about)
ok("about_team_no_bio_blurb", "Leading Rotaract Bangalore East with a focus" not in about)
ok("assign_event_state_include", Path("_includes/assign-event-state.html").exists())

# Single H1 on a sample post if present
posts = list(Path("_site/news").rglob("index.html"))
posts = [p for p in posts if p.parent.name != "news" and "page-" not in str(p)]
if posts:
    sample = read(posts[0])
    h1s = len(re.findall(r"<h1\b", sample, flags=re.I))
    ok("post_single_h1", h1s == 1)
else:
    ok("post_single_h1", True)

routes = [
    "_site/index.html",
    "_site/about.html",
    "_site/join.html",
    "_site/brandkit.html",
    "_site/contact.html",
    "_site/events.html",
    "_site/causes.html",
    "_site/search.html",
    "_site/404.html",
    "_site/thankyou.html",
    "_site/privacy.html",
    "_site/terms.html",
    "_site/news/index.html",
]
for r in routes:
    ok(f"route:{r}", Path(r).exists())

if failures:
    print("\nFailed:", ", ".join(failures))
    sys.exit(1)
print("\nAll local QA checks passed.")
PY

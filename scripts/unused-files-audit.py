#!/usr/bin/env python3
"""Generate unused-files audit for review (does not delete)."""
from __future__ import annotations

import json
import re
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KEEP_ALWAYS = {
    "js/search.js",
    "js/lunr.min.js",
    "news/index.html",
}


def list_dir(d: str) -> list[str]:
    base = ROOT / d
    if not base.exists():
        return []
    return sorted(
        str(x.relative_to(ROOT)).replace("\\", "/")
        for x in base.rglob("*")
        if x.is_file() and x.name != ".DS_Store"
    )


def size(path: str) -> int:
    p = ROOT / path
    return p.stat().st_size if p.exists() else 0


def human(n: float) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if n < 1024:
            return f"{int(n)}B" if unit == "B" else f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def live_blob() -> str:
    parts: list[str] = []
    for pattern in [
        "*.html",
        "_layouts/*",
        "_posts/*.md",
        "_events/*.md",
        "_causes/*.md",
        "news/*.html",
        "admin/*",
        "_data/*",
        "assets/js/*",
        "assets/css/*",
        "src/css/*",
        "_config.yml",
        "netlify.toml",
        "package.json",
        "tailwind.config.js",
    ]:
        for p in ROOT.glob(pattern):
            if p.is_file():
                parts.append(read_text(p))
    # Walk used includes only after seeding — include all _includes for basename
    # safety on search paths; unused detection uses include graph separately.
    return "\n".join(parts)


def used_includes() -> set[str]:
    seeds: list[str] = []
    for pattern in [
        "*.html",
        "_layouts/*",
        "_posts/*.md",
        "_events/*.md",
        "_causes/*.md",
        "news/*.html",
    ]:
        for p in ROOT.glob(pattern):
            if p.is_file():
                seeds.append(read_text(p))

    queue: deque[str] = deque()
    seen: set[str] = set()
    for text in seeds:
        queue.extend(re.findall(r"\{%\s*include\s+['\"]?([^'\"\s%]+)", text))
    while queue:
        name = queue.popleft()
        if name in seen:
            continue
        seen.add(name)
        path = ROOT / "_includes" / name
        if path.exists():
            queue.extend(
                re.findall(r"\{%\s*include\s+['\"]?([^'\"\s%]+)", read_text(path))
            )
    return seen


def unreferenced_images(content: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {
        "old_theme": [],
        "logo_hd": [],
        "team": [],
        "uploads": [],
        "other": [],
    }
    images = ROOT / "images"
    if not images.exists():
        return out

    brandkit_yml = read_text(ROOT / "_data" / "brandkit.yml")
    bk_refs = set(re.findall(r"/images/brandkit/([^\s\"')\]]+)", content + "\n" + brandkit_yml))
    bk_disk = {
        f.name
        for f in (images / "brandkit").iterdir()
        if f.is_file() and f.name != ".DS_Store"
    } if (images / "brandkit").exists() else set()

    out["brandkit_unlisted"] = sorted(
        f"images/brandkit/{n}" for n in (bk_disk - bk_refs)
    )
    out["brandkit_missing"] = sorted(
        f"images/brandkit/{n}" for n in (bk_refs - bk_disk)
    )

    for f in images.rglob("*"):
        if not f.is_file() or f.name == ".DS_Store":
            continue
        rel = str(f.relative_to(ROOT)).replace("\\", "/")
        if rel.startswith("images/brandkit/"):
            continue
        bn = f.name
        used = rel in content or f"/{rel}" in content
        if not used and " " in rel:
            enc = rel.replace(" ", "%20")
            used = enc in content or f"/{enc}" in content
        if not used and len(bn) >= 5 and bn in content:
            used = True
        if used:
            continue
        if rel.startswith("images/team/"):
            out["team"].append(rel)
        elif rel.startswith("images/uploads/"):
            out["uploads"].append(rel)
        elif rel.startswith("images/RBELogoHD/"):
            out["logo_hd"].append(rel)
        elif rel.startswith(
            (
                "images/background/",
                "images/main-slider/",
                "images/resource/",
                "images/icons/",
            )
        ):
            out["old_theme"].append(rel)
        else:
            out["other"].append(rel)
    for key in out:
        out[key] = sorted(out[key])
    return out


def main() -> None:
    content = live_blob()
    # Expand content with collection bodies already in live_blob
    for folder in ["_posts", "_events", "_causes"]:
        for p in (ROOT / folder).rglob("*.md"):
            content += "\n" + read_text(p)

    sections: list[dict] = []

    def add(title: str, confidence: str, paths: list[str], note: str = "") -> None:
        cleaned = [p for p in paths if p not in KEEP_ALWAYS]
        if not cleaned:
            return
        sections.append(
            {
                "title": title,
                "confidence": confidence,
                "note": note,
                "count": len(cleaned),
                "size_h": human(sum(size(p) for p in cleaned)),
                "paths": cleaned,
            }
        )

    add(
        "Archive: caaamingsooon/",
        "high",
        list_dir("caaamingsooon"),
        "Old coming-soon / landing prototype. Not linked from live site.",
    )
    add(
        "Archive: original_files/",
        "high",
        list_dir("original_files"),
        "Legacy theme dump. Not linked from live site.",
    )
    add(
        "Archive: stitch_rotaract_bangalore_east_redesign/",
        "high",
        list_dir("stitch_rotaract_bangalore_east_redesign"),
        "Stitch HTML/CSS mocks from redesign. Not shipped.",
    )
    add(
        "Old theme: css/",
        "high",
        list_dir("css"),
        "Only referenced from unused _includes/head.html. Live layout uses /assets/css/main.css.",
    )
    add(
        "Old theme: js/ (except search)",
        "high",
        [p for p in list_dir("js") if p not in KEEP_ALWAYS],
        "Only referenced from unused _includes/footer-script.html. KEEP js/search.js + js/lunr.min.js.",
    )
    add(
        "Old theme: fonts/",
        "high",
        list_dir("fonts"),
        "Only used by old css/. Live site uses Google Fonts + Material Symbols.",
    )
    add(
        "Leftover: templates/",
        "high",
        list_dir("templates"),
        "Scaffold leftover, not used by Jekyll collections.",
    )

    seen = used_includes()
    unused_inc = []
    for p in (ROOT / "_includes").rglob("*"):
        if not p.is_file():
            continue
        rel = str(p.relative_to(ROOT)).replace("\\", "/")
        rel_inc = str(p.relative_to(ROOT / "_includes")).replace("\\", "/")
        if p.name in seen or rel_inc in seen:
            continue
        unused_inc.append(rel)
    add(
        "Unused _includes/ (old theme partials)",
        "high",
        sorted(unused_inc),
        "Not reachable from any live page/layout include graph.",
    )

    imgs = unreferenced_images(content)
    add(
        "Images: old theme packs (background, slider, resource, icons)",
        "high",
        imgs["old_theme"],
        "Not referenced by live pages. Leftover from previous theme.",
    )
    add(
        "Images: RBELogoHD/ (superseded by brandkit)",
        "high",
        imgs["logo_hd"],
        "Source logo masters; live crest/logos come from images/brandkit/.",
    )
    add(
        "Images: team portraits not in team.yml",
        "high",
        imgs["team"],
        "On disk but not referenced. Confirm — may be retired members you still want.",
    )
    add(
        "Images: other unreferenced",
        "medium",
        imgs["other"],
        "Verify OG/favicon/footer needs before delete.",
    )
    add(
        "Images: uploads unreferenced",
        "medium",
        imgs["uploads"],
        "CMS upload not linked from any post/event/cause.",
    )
    add(
        "Brand kit: on disk but not in brandkit.yml / site",
        "medium",
        imgs["brandkit_unlisted"],
        "Not shown on /brandkit today. Keep if you plan to publish via Admin later.",
    )
    add(
        "Brand kit: MISSING files (broken refs)",
        "fix",
        imgs["brandkit_missing"],
        "Referenced in YAML but file absent — fix paths or restore files.",
    )

    total_files = sum(s["count"] for s in sections)
    total_size = sum(size(p) for s in sections for p in s["paths"])

    keep = sorted(KEEP_ALWAYS) + [
        "assets/css/main.css",
        "assets/js/site.js",
        "assets/js/brandkit.js",
        "news/index.html",
    ]

    txt = ROOT / "docs" / "unused-files-audit.txt"
    with txt.open("w", encoding="utf-8") as f:
        f.write("RBE UNUSED FILES AUDIT — REVIEW ONLY (nothing deleted)\n")
        f.write(f"Total cleanup candidates: {total_files} files (~{human(total_size)})\n")
        f.write(
            "Method: path not found in live Jekyll pages/layouts/includes/collections/admin/assets/data.\n"
        )
        f.write(
            "Old theme assets counted unused if only referenced by other unused includes.\n\n"
        )
        f.write("KEEP (do not delete):\n")
        for p in keep:
            f.write(f"  {p}\n")
        f.write("  images/brandkit/* files that ARE listed in _data/brandkit.yml\n\n")
        for s in sections:
            f.write("=" * 72 + "\n")
            f.write(f"[{s['confidence'].upper()}] {s['title']}\n")
            f.write(f"{s['count']} files · {s['size_h']}\n")
            if s["note"]:
                f.write(f"Note: {s['note']}\n")
            f.write("=" * 72 + "\n")
            for p in s["paths"]:
                f.write(f"  {p}\n")
            f.write("\n")

    payload = {
        "total_files": total_files,
        "total_size_h": human(total_size),
        "keep": keep,
        "sections": sections,
        "summary_rows": [
            {
                "section": s["title"],
                "confidence": s["confidence"],
                "files": s["count"],
                "size": s["size_h"],
            }
            for s in sections
        ],
    }
    (ROOT / "docs" / "unused-files-audit.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )

    print(f"total {total_files} {human(total_size)}")
    for s in sections:
        print(
            f"  [{s['confidence']}] {s['count']:4d}  {s['size_h']:8s}  {s['title']}"
        )
    print(f"wrote {txt}")


if __name__ == "__main__":
    main()

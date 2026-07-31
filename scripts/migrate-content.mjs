#!/usr/bin/env node
/**
 * HISTORICAL — one-time Jekyll → Sanity migration.
 * Source folders (_posts / _events / _causes / images/uploads) were removed after cutover.
 * Requires: PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN
 * Loads .env from the repo root if present (Node does not load it by itself).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import matter from "gray-matter";
import yaml from "js-yaml";
import { createClient } from "@sanity/client";

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // Prefer .env for this script so local secrets win over leftover shell/CI placeholders.
    process.env[key] = val;
  }
}

loadDotEnv();

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || projectId === "placeholder" || !token) {
  console.error(
    "Set PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env (or the environment) before migrating.",
  );
  console.error(
    `Currently: PROJECT_ID=${projectId ? "(set)" : "(missing)"} TOKEN=${token ? "(set)" : "(missing)"}`,
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2025-01-01",
  token,
  useCdn: false,
});

const ROOT = process.cwd();
const pathToAsset = new Map();
const uploadFailures = [];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(label, fn, attempts = 5) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const status = e?.statusCode || e?.response?.statusCode;
      const code = e?.code || e?.cause?.code;
      const retryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        code === "ECONNRESET" ||
        code === "ETIMEDOUT" ||
        code === "ECONNREFUSED" ||
        code === "ENOTFOUND" ||
        /rate|timeout|ECONNRESET|ETIMEDOUT|network|socket/i.test(
          String(e?.message || ""),
        );
      if (!retryable || i === attempts) throw e;
      const wait = Math.min(30000, 1000 * 2 ** (i - 1));
      console.warn(`retry ${i}/${attempts} ${label} after ${wait}ms (${e.message})`);
      await sleep(wait);
    }
  }
  throw last;
}

async function preloadExistingAssets() {
  console.log("Loading existing Sanity assets (resume)…");
  const rows = await withRetry("preload assets", () =>
    client.fetch(
      `*[_type in ["sanity.imageAsset","sanity.fileAsset"]]{
        _id, sha1hash, "sourceId": source.id
      }`,
    ),
  );
  let bySource = 0;
  for (const row of rows) {
    if (row.sourceId) {
      pathToAsset.set(row.sourceId, row._id);
      bySource++;
    }
  }
  console.log(`Resume map: ${bySource} assets keyed by source.id (${rows.length} total assets)`);
}

function slugFromFilename(file) {
  return file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function toIsoLocal(v) {
  if (v instanceof Date) return v.toISOString();
  const s = String(v ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00.000+05:30`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    return new Date(s.replace(" ", "T") + "+05:30").toISOString();
  }
  return s;
}

function isImage(file) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(file);
}

async function uploadFile(absPath, webPath, { forceKind } = {}) {
  if (pathToAsset.has(webPath)) return pathToAsset.get(webPath);
  const buf = fs.readFileSync(absPath);
  const hash = createHash("sha1").update(buf).digest("hex");
  const existing = await withRetry(`lookup ${webPath}`, () =>
    client.fetch(
      `*[_type in ["sanity.imageAsset","sanity.fileAsset"] && sha1hash == $hash][0]._id`,
      { hash },
    ),
  );
  if (existing) {
    pathToAsset.set(webPath, existing);
    return existing;
  }
  const kind = forceKind || (isImage(absPath) ? "image" : "file");
  const asset = await withRetry(`upload ${webPath}`, () =>
    client.assets.upload(kind, buf, {
      filename: path.basename(absPath),
      source: { id: webPath, name: "rbe-jekyll-migrate" },
    }),
  );
  pathToAsset.set(webPath, asset._id);
  console.log(`uploaded ${kind}: ${webPath}`);
  await sleep(120);
  return asset._id;
}

async function uploadTree(relDir, { forceKind } = {}) {
  const abs = path.join(ROOT, relDir);
  if (!fs.existsSync(abs)) return;
  const names = fs.readdirSync(abs).filter((name) => {
    const full = path.join(abs, name);
    return fs.statSync(full).isFile();
  });
  console.log(`Uploading ${names.length} files from ${relDir}…`);
  let i = 0;
  for (const name of names) {
    i++;
    const full = path.join(abs, name);
    const web = `/${relDir.replace(/\\/g, "/")}/${name}`;
    try {
      await uploadFile(full, web, { forceKind });
      if (i % 25 === 0) console.log(`  …${i}/${names.length} in ${relDir}`);
    } catch (e) {
      console.error(`FAIL upload ${web}:`, e.message);
      uploadFailures.push({ web, message: e.message, status: e?.statusCode });
      if (/permission|403|Insufficient/i.test(String(e.message))) {
        throw e;
      }
    }
  }
}

function imageRef(webPath) {
  if (!webPath) return undefined;
  const id = pathToAsset.get(webPath);
  if (!id) return undefined;
  return { _type: "image", asset: { _type: "reference", _ref: id } };
}

function fileRef(webPath) {
  if (!webPath) return undefined;
  const id = pathToAsset.get(webPath);
  if (!id) return undefined;
  return { _type: "file", asset: { _type: "reference", _ref: id } };
}

function readMd(dir) {
  return fs
    .readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(ROOT, dir, f), "utf8");
      return { file: f, ...matter(raw) };
    });
}

async function migratePosts() {
  for (const { file, data, content } of readMd("_posts")) {
    const slug = slugFromFilename(file);
    const id = `post-${slug}`;
    const categories = (data.categories || []).map((raw, i) => {
      const catSlug = String(raw).toLowerCase();
      return {
        _type: "reference",
        _ref: `category-${catSlug}`,
        _key: `cat${i}_${catSlug}`,
      };
    });
    const tags = (data.tags || []).map((raw, i) => {
      const tSlug = tagSlugify(raw);
      return {
        _type: "reference",
        _ref: `tag-${tSlug}`,
        _key: `tag${i}_${tSlug}`,
      };
    });
    await client.createOrReplace({
      _id: id,
      _type: "post",
      title: data.title,
      slug: { _type: "slug", current: slug },
      publishedAt: toIsoLocal(data.date),
      image: imageRef(data.image),
      categories,
      tags,
      description: data.description || "",
      bodyMarkdown: content.trim(),
    });
    console.log("post", slug);
  }
}

async function migrateEvents() {
  for (const { file, data, content } of readMd("_events")) {
    const slug = slugFromFilename(file);
    await client.createOrReplace({
      _id: `event-${slug}`,
      _type: "event",
      title: data.title,
      slug: { _type: "slug", current: slug },
      start: toIsoLocal(data.start),
      end: toIsoLocal(data.end),
      venue: data.venue || "",
      buttonOpen: Boolean(data.button_open ?? true),
      buttonText: data.button_text || "",
      buttonUrl: data.button_url || "",
      image: imageRef(data.image),
      intro: data.intro || "",
      description: data.description || "",
      bodyMarkdown: content.trim(),
    });
    console.log("event", slug);
  }
}

async function migrateCauses() {
  for (const { file, data, content } of readMd("_causes")) {
    const slug = file.replace(/\.md$/, "");
    const goal =
      data.goal === "---" || data.goal === "" || data.goal == null
        ? undefined
        : Number(data.goal);
    await client.createOrReplace({
      _id: `cause-${slug}`,
      _type: "cause",
      title: data.title,
      slug: { _type: "slug", current: slug },
      focus: data.focus || "",
      image: imageRef(data.image),
      due: data.due || undefined,
      active: Boolean(data.active),
      goal: Number.isFinite(goal) ? goal : undefined,
      progress: Number(data.progress ?? 0),
      featured: Boolean(data.featured),
      donationLink: data.donation_link || undefined,
      intro: data.intro || "",
      description: data.description || "",
      bodyMarkdown: content.trim(),
    });
    console.log("cause", slug);
  }
}

async function migrateCategories() {
  const defaults = [
    { title: "Club Service", slug: "club-service" },
    { title: "Community Service", slug: "community-service" },
    { title: "International Service", slug: "international-service" },
    { title: "Professional Development", slug: "professional-development" },
  ];
  for (const c of defaults) {
    await client.createOrReplace({
      _id: `category-${c.slug}`,
      _type: "category",
      title: c.title,
      slug: { _type: "slug", current: c.slug },
    });
  }
  console.log("categories", defaults.length);
}

function tagSlugify(raw) {
  const slug = String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tag";
}

function titleFromLegacy(raw) {
  return String(raw)
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

async function migrateTags() {
  const seen = new Map();
  for (const { data } of readMd("_posts")) {
    for (const raw of data.tags || []) {
      const slug = tagSlugify(raw);
      if (!seen.has(slug)) seen.set(slug, titleFromLegacy(raw) || slug);
    }
  }
  for (const [slug, title] of seen) {
    await client.createOrReplace({
      _id: `tag-${slug}`,
      _type: "tag",
      title,
      slug: { _type: "slug", current: slug },
    });
  }
  console.log("tags", seen.size);
}

async function migrateSingletons() {
  // Site settings / Join FAQ / Brand Kit are static on disk — not migrated to Sanity.

  const team = yaml.load(fs.readFileSync("_data/team.yml", "utf8"));
  await client.createOrReplace({
    _id: "team",
    _type: "team",
    members: (team.members || []).map((m, idx) => ({
      _key: `m${idx}`,
      name: m.name,
      role: m.role,
      memberSince: m.member_since,
      image: imageRef(m.image),
      featurelink: m.featurelink,
      social: m.social,
    })),
  });
}

async function main() {
  console.log(`Project ${projectId} / ${dataset}`);
  await preloadExistingAssets();
  console.log("Uploading assets…");
  await uploadTree("images/uploads");
  await uploadTree("images/team");
  // Brand kit files stay in `public/images/brandkit/` and are served by Netlify.
  await uploadTree("images/RBELogoHD");
  if (uploadFailures.length) {
    console.error(`Asset upload failures: ${uploadFailures.length} (continuing with documents)`);
    for (const f of uploadFailures.slice(0, 10)) {
      console.error(` - ${f.web}: ${f.message}`);
    }
    process.exitCode = 1;
  }
  console.log("Documents…");
  await migrateCategories();
  await migrateTags();
  await migratePosts();
  await migrateEvents();
  await migrateCauses();
  await migrateSingletons();
  const counts = await client.fetch(`{
    "posts": count(*[_type=="post"]),
    "events": count(*[_type=="event"]),
    "causes": count(*[_type=="cause"]),
    "categories": count(*[_type=="category"]),
    "tags": count(*[_type=="tag"]),
    "images": count(*[_type=="sanity.imageAsset"]),
    "files": count(*[_type=="sanity.fileAsset"]),
    "team": count(*[_type=="team"])
  }`);
  console.log("Done", counts);
  const okDocs =
    counts.posts === 29 &&
    counts.events === 13 &&
    counts.causes === 2 &&
    counts.team === 1 &&
    counts.categories === 4 &&
    counts.tags >= 1;
  if (!okDocs) {
    console.warn("Count mismatch vs expected posts/events/causes/team/categories + tags", counts);
    process.exitCode = 2;
  } else if (uploadFailures.length) {
    console.log("Documents OK; re-run migrate later to retry failed assets.");
  } else {
    console.log("Migration complete: documents match expected counts.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

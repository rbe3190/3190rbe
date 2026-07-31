/**
 * Repair Sanity Studio data after Astro migration cleanup:
 * - Ensure team member `_key`s
 * - Delete obsolete singletons now served from disk:
 *   siteSettings, joinFaq, brandKit
 * - Unset unused author / legacyComments on posts & events
 * - Seed news Categories/Tags and convert legacy strings → references
 *
 * Usage: node --env-file=.env scripts/repair-studio-data.mjs
 */
import { createClient } from "@sanity/client";
import { randomBytes } from "node:crypto";

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error("Need PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2025-01-01",
  token,
  useCdn: false,
});

const DEFAULT_CATEGORIES = [
  { title: "Club Service", slug: "club-service" },
  { title: "Community Service", slug: "community-service" },
  { title: "International Service", slug: "international-service" },
  { title: "Professional Development", slug: "professional-development" },
];

function ensureKeys(items, prefix) {
  if (!Array.isArray(items)) return items;
  return items.map((item, idx) => {
    if (!item || typeof item !== "object") return item;
    if (item._key) return item;
    return { ...item, _key: `${prefix}${idx}_${randomBytes(3).toString("hex")}` };
  });
}

function titleFromLegacy(raw) {
  return String(raw)
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function tagSlugify(raw) {
  const slug = String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tag";
}

async function deleteByType(type) {
  try {
    await client.delete(type);
    console.log(`Deleted ${type} singleton (now static on disk)`);
  } catch (e) {
    if (!/not found|does not exist/i.test(String(e.message))) {
      console.warn(`${type} delete:`, e.message);
    } else {
      console.log(`${type} already absent`);
    }
  }
  const leftovers = await client.fetch(`*[_type == $type]._id`, { type });
  for (const id of leftovers || []) {
    await client.delete(id);
    console.log("Deleted", id);
  }
}

async function unsetOnType(type, fields) {
  const ids = await client.fetch(`*[_type == $type]._id`, { type });
  let n = 0;
  for (const id of ids || []) {
    await client.patch(id).unset(fields).commit();
    n++;
  }
  console.log(`Unset [${fields.join(", ")}] on ${n} ${type} docs`);
}

async function ensureCategory(slug, title) {
  const id = `category-${slug}`;
  await client.createIfNotExists({
    _id: id,
    _type: "category",
    title,
    slug: { _type: "slug", current: slug },
  });
  return id;
}

async function ensureTag(slug, title) {
  const id = `tag-${slug}`;
  await client.createIfNotExists({
    _id: id,
    _type: "tag",
    title,
    slug: { _type: "slug", current: slug },
  });
  return id;
}

async function migratePostCategories() {
  for (const c of DEFAULT_CATEGORIES) {
    await ensureCategory(c.slug, c.title);
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories`);

  const posts = await client.fetch(`*[_type == "post"]{_id, categories}`);
  let converted = 0;
  for (const post of posts || []) {
    const raw = post.categories;
    if (!Array.isArray(raw) || raw.length === 0) continue;

    const allRefs = raw.every((item) => item && typeof item === "object" && item._ref);
    if (allRefs) continue;

    const refs = [];
    const seen = new Set();
    for (const item of raw) {
      let refId = null;
      if (item && typeof item === "object" && item._ref) {
        refId = item._ref;
      } else if (typeof item === "string" && item.trim()) {
        const slug = item.toLowerCase();
        refId = await ensureCategory(slug, titleFromLegacy(item));
      }
      if (!refId || seen.has(refId)) continue;
      seen.add(refId);
      refs.push({
        _type: "reference",
        _ref: refId,
        _key: `cat_${refId.replace(/^category-/, "")}_${randomBytes(2).toString("hex")}`,
      });
    }

    await client.patch(post._id).set({ categories: refs }).commit();
    converted++;
  }
  console.log(`Converted categories on ${converted} posts (others already references or empty)`);
}

async function migratePostTags() {
  const posts = await client.fetch(`*[_type == "post"]{_id, tags}`);
  let converted = 0;
  let created = 0;

  for (const post of posts || []) {
    const raw = post.tags;
    if (!Array.isArray(raw) || raw.length === 0) continue;

    const allRefs = raw.every((item) => item && typeof item === "object" && item._ref);
    if (allRefs) continue;

    const refs = [];
    const seen = new Set();
    for (const item of raw) {
      let refId = null;
      if (item && typeof item === "object" && item._ref) {
        refId = item._ref;
      } else if (typeof item === "string" && item.trim()) {
        const slug = tagSlugify(item);
        const before = await client.fetch(`count(*[_id == $id])`, { id: `tag-${slug}` });
        refId = await ensureTag(slug, titleFromLegacy(item) || slug);
        if (!before) created++;
      }
      if (!refId || seen.has(refId)) continue;
      seen.add(refId);
      refs.push({
        _type: "reference",
        _ref: refId,
        _key: `tag_${refId.replace(/^tag-/, "")}_${randomBytes(2).toString("hex")}`,
      });
    }

    await client.patch(post._id).set({ tags: refs }).commit();
    converted++;
  }
  console.log(
    `Converted tags on ${converted} posts (created ~${created} tag docs; others already references or empty)`,
  );
}

async function main() {
  const team = await client.fetch(`*[_id == "team"][0]`);
  if (team?.members) {
    await client
      .patch("team")
      .set({ members: ensureKeys(team.members, "m") })
      .commit({ autoGenerateArrayKeys: true });
    console.log("Repaired team member keys");
  } else {
    console.warn("No team document found");
  }

  await deleteByType("siteSettings");
  await deleteByType("joinFaq");
  await deleteByType("brandKit");

  await unsetOnType("post", ["author", "legacyComments"]);
  await unsetOnType("event", ["author"]);

  await migratePostCategories();
  await migratePostTags();

  console.log("Done. Hard-refresh /admin/ to see Studio fixes.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

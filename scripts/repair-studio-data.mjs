/**
 * Repair Sanity Studio data after Astro migration cleanup:
 * - Ensure team member `_key`s
 * - Delete obsolete singletons now served from disk:
 *   siteSettings, joinFaq, brandKit
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

function ensureKeys(items, prefix) {
  if (!Array.isArray(items)) return items;
  return items.map((item, idx) => {
    if (!item || typeof item !== "object") return item;
    if (item._key) return item;
    return { ...item, _key: `${prefix}${idx}_${randomBytes(3).toString("hex")}` };
  });
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

  console.log("Done. Hard-refresh /admin/ to see Studio fixes.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

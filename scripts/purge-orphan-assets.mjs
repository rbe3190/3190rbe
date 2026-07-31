/**
 * List or delete Sanity image/file assets that no document references.
 * Safe for leftovers from brand-kit / site-settings migration.
 *
 * Dry-run (default):
 *   node --env-file=.env scripts/purge-orphan-assets.mjs
 *
 * Delete:
 *   node --env-file=.env scripts/purge-orphan-assets.mjs --delete
 */
import { createClient } from "@sanity/client";

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;
const doDelete = process.argv.includes("--delete");

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

async function main() {
  const orphans = await client.fetch(`*[
    _type in ["sanity.imageAsset", "sanity.fileAsset"]
    && count(*[references(^._id)]) == 0
  ] | order(originalFilename asc) {
    _id,
    _type,
    originalFilename,
    size
  }`);

  console.log(`Orphan assets: ${orphans.length}`);
  for (const a of orphans.slice(0, 20)) {
    console.log(` - ${a.originalFilename || a._id} (${a._type}, ${a.size ?? "?"} bytes)`);
  }
  if (orphans.length > 20) console.log(` … and ${orphans.length - 20} more`);

  if (!doDelete) {
    console.log("\nDry-run only. Re-run with --delete to remove these.");
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const a of orphans) {
    try {
      await client.delete(a._id);
      ok++;
      if (ok % 25 === 0) console.log(`Deleted ${ok}/${orphans.length}…`);
    } catch (e) {
      fail++;
      console.warn(`Failed ${a._id} (${a.originalFilename}):`, e.message);
    }
  }
  console.log(`Done. Deleted ${ok}, failed ${fail}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "dist", "pagefind");
const dest = path.join(root, "public", "pagefind");

if (!fs.existsSync(src)) {
  console.warn("sync-pagefind-dev: dist/pagefind not found — skip (run pagefind first)");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log("Synced Pagefind index → public/pagefind (for local astro dev)");

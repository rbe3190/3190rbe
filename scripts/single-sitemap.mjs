/**
 * Astro always writes sitemap-index.xml + sitemap-0.xml via @astrojs/sitemap.
 * Collapse that into a single public/dist sitemap.xml and delete the index/chunks.
 * Must be registered AFTER the sitemap() integration so this runs last on build:done.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function resolveDir(dir) {
  if (!dir) return null;
  if (typeof dir === "string") return dir;
  if (dir instanceof URL) return fileURLToPath(dir);
  if (typeof dir.pathname === "string") {
    try {
      return fileURLToPath(dir);
    } catch {
      return dir.pathname;
    }
  }
  return String(dir);
}

export function singleSitemap() {
  return {
    name: "single-sitemap",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = resolveDir(dir);
        if (!root) {
          logger.warn("Could not resolve build output dir for sitemap.xml.");
          return;
        }

        const indexPath = path.join(root, "sitemap-index.xml");
        const entries = await fs.readdir(root);
        const chunks = entries
          .filter((name) => /^sitemap-\d+\.xml$/.test(name))
          .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

        if (chunks.length === 0) {
          logger.warn("No sitemap-N.xml chunks found; leaving dist as-is.");
          return;
        }

        if (chunks.length === 1) {
          await fs.rename(path.join(root, chunks[0]), path.join(root, "sitemap.xml"));
        } else {
          // Rare for this site (~90 URLs). Merge urlsets into one sitemap.xml.
          const bodies = [];
          let header = "";
          for (const name of chunks) {
            const xml = await fs.readFile(path.join(root, name), "utf8");
            if (!header) {
              const open = xml.match(/^[\s\S]*?<urlset[^>]*>/);
              header = open ? open[0] : '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
            }
            const urls = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
            bodies.push(...urls);
            await fs.unlink(path.join(root, name));
          }
          await fs.writeFile(
            path.join(root, "sitemap.xml"),
            `${header}${bodies.join("")}</urlset>`,
            "utf8",
          );
        }

        try {
          await fs.unlink(indexPath);
        } catch {
          // index may already be absent
        }

        // Drop any leftover numbered chunks after a single-file rename.
        for (const name of chunks.slice(chunks.length === 1 ? 1 : 0)) {
          try {
            await fs.unlink(path.join(root, name));
          } catch {
            // already removed in merge path
          }
        }

        logger.info("Wrote dist/sitemap.xml (removed sitemap-index.xml / sitemap-N.xml).");
      },
    },
  };
}

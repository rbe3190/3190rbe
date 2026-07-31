/**
 * Astro integration: keep @sanity/astro's injected /admin route (no collision),
 * then patch the built Studio HTML shell for RBE favicon / title / noindex.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FAVICON = "/images/site/favicon.png";

function patchAdminHtml(html) {
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/i, "<title>RBE Admin</title>");
  if (!/name=["']robots["']/i.test(out)) {
    out = out.replace(
      /<title>RBE Admin<\/title>/i,
      '<title>RBE Admin</title><meta name="robots" content="noindex, nofollow">',
    );
  } else {
    out = out.replace(
      /<meta\s+name=["']robots["'][^>]*>/i,
      '<meta name="robots" content="noindex, nofollow">',
    );
  }
  // Replace the default Sanity data-URI favicon (and any existing icon links).
  out = out.replace(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi, "");
  out = out.replace(
    /<\/title>/i,
    `</title><link rel="icon" href="${FAVICON}" type="image/png"><link rel="shortcut icon" href="${FAVICON}" type="image/png"><link rel="apple-touch-icon" href="${FAVICON}">`,
  );
  return out;
}

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

export function rbeAdminShell() {
  return {
    name: "rbe-admin-shell",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = resolveDir(dir);
        if (!root) {
          logger.warn("Could not resolve build output dir for admin shell patch.");
          return;
        }
        const candidates = [
          path.join(root, "admin", "index.html"),
          path.join(root, "admin.html"),
        ];
        for (const file of candidates) {
          try {
            const html = await fs.readFile(file, "utf8");
            const patched = patchAdminHtml(html);
            if (patched !== html) {
              await fs.writeFile(file, patched, "utf8");
              logger.info(`Patched Studio shell: ${path.relative(process.cwd(), file)}`);
            }
            return;
          } catch {
            // try next candidate
          }
        }
        logger.warn("Could not find built /admin HTML to patch (favicon/title/noindex).");
      },
    },
  };
}

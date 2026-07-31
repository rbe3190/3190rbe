import fs from "node:fs";
import path from "node:path";

/**
 * Serve Pagefind index during `astro dev`.
 * Indexes are generated only by `npm run build` (pagefind --site dist).
 * Looks in public/pagefind (synced after build) then dist/pagefind.
 */
export function pagefindDevPlugin(rootDir) {
  const mime = {
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".wasm": "application/wasm",
    ".pf_meta": "application/octet-stream",
    ".pf_index": "application/octet-stream",
    ".pf_fragment": "application/octet-stream",
  };

  function resolveFile(urlPath) {
    const rel = urlPath.replace(/^\/pagefind\/?/, "").split("?")[0];
    if (!rel || rel.includes("..")) return null;
    for (const base of [
      path.join(rootDir, "public", "pagefind"),
      path.join(rootDir, "dist", "pagefind"),
    ]) {
      const full = path.join(base, rel);
      if (full.startsWith(base) && fs.existsSync(full) && fs.statSync(full).isFile()) {
        return full;
      }
    }
    return null;
  }

  return {
    name: "pagefind-dev-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/pagefind/")) return next();
        const file = resolveFile(req.url);
        if (!file) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(
            "Pagefind index missing. Run `npm run build` once (creates dist/pagefind + public/pagefind), then restart `npm run dev`.",
          );
          return;
        }
        const ext = path.extname(file);
        res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

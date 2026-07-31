import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import sanity from "@sanity/astro";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { pagefindDevPlugin } from "./scripts/pagefind-dev-plugin.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const projectId =
  env.PUBLIC_SANITY_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID ||
  "placeholder";
const dataset =
  env.PUBLIC_SANITY_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  "production";

export default defineConfig({
  site: "https://rotaractblreast.org",
  output: "static",
  trailingSlash: "always",
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    plugins: [pagefindDevPlugin(__dirname)],
    // Studio hydrates in the browser — stub env reads used by Sanity tooling.
    // Module dedupe for react/sanity is handled by @sanity/astro (do not alias
    // `sanity` to a folder path; that breaks `sanity/router` etc. subpaths).
    define: {
      "process.env.PUBLIC_SANITY_PROJECT_ID": JSON.stringify(projectId),
      "process.env.PUBLIC_SANITY_DATASET": JSON.stringify(dataset),
      "process.env.SANITY_STUDIO_PROJECT_ID": JSON.stringify(projectId),
      "process.env.SANITY_STUDIO_DATASET": JSON.stringify(dataset),
    },
  },
  integrations: [
    sanity({
      projectId,
      dataset,
      useCdn: false,
      apiVersion: "2025-01-01",
      studioBasePath: "/admin",
      studioRouterHistory: "hash",
    }),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) =>
        !page.includes("/admin") &&
        !page.includes("/thankyou") &&
        !page.includes("/search"),
    }),
  ],
  redirects: {
    "/teamadmin": "/admin/",
  },
});

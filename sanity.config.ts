import { buildLegacyTheme, defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { markdownSchema } from "sanity-plugin-markdown";
import { schemaTypes } from "./schemaTypes";
import { RbeStudioIcon } from "./src/studio/RbeStudioIcon";
import "easymde/dist/easymde.min.css";

// Studio hydrates in the browser via @sanity/astro — use import.meta.env (Vite), not process.env.
const projectId =
  import.meta.env.PUBLIC_SANITY_PROJECT_ID ||
  import.meta.env.SANITY_STUDIO_PROJECT_ID ||
  "placeholder";
const dataset =
  import.meta.env.PUBLIC_SANITY_DATASET ||
  import.meta.env.SANITY_STUDIO_DATASET ||
  "production";

/** RBE brand tokens (aligned with site CSS / Tailwind theme). */
const rbeTheme = buildLegacyTheme({
  "--black": "#231a11",
  "--white": "#fff8f5",
  "--gray": "#564334",
  "--gray-base": "#897362",
  "--component-bg": "#fff8f5",
  "--component-text-color": "#231a11",
  "--brand-primary": "#ff9000",
  "--default-button-color": "#8e4e00",
  "--default-button-primary-color": "#ff9000",
  "--main-navigation-color": "#3a2e25",
  "--main-navigation-color--inverted": "#ffeee2",
  "--focus-color": "#ff9000",
});

export default defineConfig({
  name: "rbe",
  title: "Rotaract Bangalore East",
  icon: RbeStudioIcon,
  theme: rbeTheme,
  projectId,
  dataset,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Content")
          .items([
            S.listItem()
              .title("Team")
              .id("team")
              .child(S.document().schemaType("team").documentId("team")),
            S.divider(),
            S.documentTypeListItem("post").title("News"),
            S.documentTypeListItem("event").title("Events"),
            S.documentTypeListItem("cause").title("Causes"),
          ]),
    }),
    visionTool({ title: "Query" }),
    markdownSchema(),
  ],
  schema: {
    types: schemaTypes,
  },
});

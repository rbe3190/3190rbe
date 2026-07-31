import { marked, Renderer } from "marked";
import { SITE } from "./site";

/**
 * Single newline = line break, matching the kramdown GFM behaviour the Jekyll
 * site used, so migrated posts and CMS-authored copy break where authors typed.
 */
const MARKED_OPTIONS = { gfm: true, breaks: true, async: false } as const;

function siteHost(): string {
  try {
    return new URL(SITE.url).hostname.replace(/^www\./, "");
  } catch {
    return "rotaractblreast.org";
  }
}

/** True for http(s) links that leave the club site. */
export function isExternalHref(href: string): boolean {
  const raw = String(href ?? "").trim();
  if (!raw) return false;
  if (
    raw.startsWith("/") ||
    raw.startsWith("#") ||
    raw.startsWith("?") ||
    raw.startsWith("./") ||
    raw.startsWith("../") ||
    raw.startsWith("mailto:") ||
    raw.startsWith("tel:") ||
    raw.startsWith("sms:")
  ) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(raw, SITE.url);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.replace(/^www\./, "");
  return host !== siteHost();
}

/**
 * Ensure external `<a href>` tags open in a new tab.
 * Covers Markdown links and raw HTML anchors in body content.
 */
export function enhanceExternalLinks(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (full, attrs: string) => {
    if (/\btarget\s*=/i.test(attrs)) return full;
    const hrefMatch = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) return full;
    if (!isExternalHref(hrefMatch[2])) return full;

    let next = attrs.trim();
    if (/\brel\s*=/i.test(next)) {
      next = next.replace(/\brel\s*=\s*(["'])(.*?)\1/i, (_m, q, rel) => {
        const parts = new Set(String(rel).split(/\s+/).filter(Boolean));
        parts.add("noopener");
        parts.add("noreferrer");
        return `rel=${q}${[...parts].join(" ")}${q}`;
      });
    } else {
      next = `${next} rel="noopener noreferrer"`;
    }
    return `<a ${next} target="_blank">`;
  });
}

function escapeAttr(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Block `javascript:`-style sources while leaving normal URLs untouched. */
function safeSrc(href: string): string {
  const raw = String(href ?? "").trim();
  return /^\s*(javascript|vbscript|data):/i.test(raw) ? "" : raw;
}

const renderer = new Renderer();

renderer.image = ({ href, title, text }) => {
  const src = safeSrc(href);
  if (!src) return escapeAttr(text ?? "");
  const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
  return `<img src="${escapeAttr(src)}" alt="${escapeAttr(text ?? "")}"${titleAttr} loading="lazy" decoding="async">`;
};

/**
 * Promote a standalone image paragraph to `<figure>`, using the Markdown title
 * (`![alt](src "Caption")`) as a visible caption instead of a hover tooltip.
 * Images sharing a paragraph with text are left alone — `<figure>` cannot be
 * nested inside `<p>`.
 */
function promoteStandaloneImages(html: string): string {
  return html.replace(
    /<p>\s*(<a\b[^>]*>\s*)?(<img\b[^>]*>)(\s*<\/a>)?\s*<\/p>/g,
    (_full, openAnchor = "", img: string, closeAnchor = "") => {
      const title = img.match(/\stitle="([^"]*)"/);
      const cleanImg = img.replace(/\stitle="[^"]*"/, "");
      const caption = title?.[1] ? `<figcaption>${title[1]}</figcaption>` : "";
      return `<figure>${openAnchor}${cleanImg}${closeAnchor}${caption}</figure>`;
    },
  );
}

export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown || "", {
    ...MARKED_OPTIONS,
    renderer,
  }) as string;
  return enhanceExternalLinks(promoteStandaloneImages(html));
}

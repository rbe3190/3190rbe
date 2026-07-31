import type { Post } from "./types";

/** Jekyll-compatible public URL helpers (trailing slashes). */

export function newsPagePath(n: number): string {
  return n <= 1 ? "/news/" : `/news/page-${n}/`;
}

export function eventsPagePath(n: number): string {
  return n <= 1 ? "/events/" : `/events/page-${n}/`;
}

export function causesPagePath(n: number): string {
  return n <= 1 ? "/causes/" : `/causes/page-${n}/`;
}

export function newsTagPath(slug: string): string {
  return `/news/tag-${String(slug).toLowerCase()}/`;
}

/** Public path for a news category archive (`slug` is already URL-safe). */
export function newsCategoryPath(slug: string): string {
  return `/news/${String(slug).toLowerCase()}/`;
}

export function categorySlug(value: string): string {
  return String(value).toLowerCase();
}

/** URL-safe slug for tags (preserves simple legacy values like `hosting`). */
export function tagSlug(value: string): string {
  const slug = String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tag";
}

/** Display label for legacy CMS values like `Community-Service`. Prefer `PostCategory.title` when available. */
export function taxonomyLabel(value: string): string {
  return String(value ?? "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize legacy front-matter / string categories into title + slug. */
export function normalizePostCategory(raw: string): { title: string; slug: string } {
  const s = String(raw ?? "").trim();
  const slug = categorySlug(s);
  const title = taxonomyLabel(s)
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
  return { title: title || s, slug };
}

/** Normalize legacy front-matter / string tags into title + slug. */
export function normalizePostTag(raw: string): { title: string; slug: string } {
  const s = String(raw ?? "").trim();
  const slug = tagSlug(s);
  const title = taxonomyLabel(s)
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
  return { title: title || s, slug };
}

export function postDateParts(
  post: Post,
  fields: Array<"year" | "month" | "day"> = ["year", "month", "day"],
): Record<"year" | "month" | "day", string> {
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };
  if (fields.includes("year")) opts.year = "numeric";
  if (fields.includes("month")) opts.month = "2-digit";
  if (fields.includes("day")) opts.day = "2-digit";
  const parts = new Intl.DateTimeFormat("en-CA", opts).formatToParts(new Date(post.publishedAt));
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

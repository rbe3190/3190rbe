import type { Post } from "./types";

/** Jekyll-compatible public URL helpers (trailing slashes). */

export function newsPagePath(n: number): string {
  return n <= 1 ? "/news/" : `/news/page-${n}/`;
}

export function newsTagPath(tag: string): string {
  return `/news/tag-${tag}/`;
}

/** Jekyll archives slugify category names to lowercase. */
export function newsCategoryPath(category: string): string {
  return `/news/${category.toLowerCase()}/`;
}

export function categorySlug(category: string): string {
  return category.toLowerCase();
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

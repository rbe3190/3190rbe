import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import {
  loadBrandKitFromFs,
  loadCausesFromFs,
  loadEventsFromFs,
  loadJoinFaqFromFs,
  loadPostsFromFs,
  loadSiteSettingsFromFs,
  loadTeamFromFs,
} from "./contentFs";
import type {
  BrandKitGroup,
  Cause,
  EventDoc,
  Post,
  SiteSettings,
  TeamMember,
} from "./types";

function useFs(): boolean {
  // Prefer explicit FS mode (Netlify/env). Shell USE_FS_CONTENT=1 also works when Vite exposes it.
  const flag =
    import.meta.env.USE_FS_CONTENT ??
    (typeof process !== "undefined" ? process.env.USE_FS_CONTENT : undefined);
  if (flag === "1") return true;
  const id = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  return !id || id === "placeholder";
}

export function getSanityClient() {
  const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  const dataset = import.meta.env.PUBLIC_SANITY_DATASET || "production";
  if (!projectId || projectId === "placeholder") {
    throw new Error("PUBLIC_SANITY_PROJECT_ID is not set");
  }
  return createClient({
    projectId,
    dataset,
    apiVersion: "2025-01-01",
    useCdn: false,
  });
}

export function urlForImage(source: SanityImageSource | string | null | undefined): string | null {
  if (!source) return null;
  if (typeof source === "string") return source;
  try {
    const client = getSanityClient();
    return imageUrlBuilder(client).image(source).width(1600).url();
  } catch {
    return null;
  }
}

function postUrl(publishedAt: string, slug: string) {
  const d = new Date(publishedAt);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return `/news/${get("year")}/${get("month")}/${get("day")}/${slug}/`;
}

export async function getPosts(): Promise<Post[]> {
  if (useFs()) return loadPostsFromFs();
  const client = getSanityClient();
  const rows = await client.fetch<Array<Record<string, unknown>>>(
    `*[_type == "post"]|order(publishedAt desc){
      _id, title, "slug": slug.current, publishedAt, image, author, categories, tags, description, bodyMarkdown, legacyComments
    }`,
  );
  return rows.map((r) => {
    const slug = String(r.slug);
    const publishedAt = String(r.publishedAt);
    return {
      _id: String(r._id),
      title: String(r.title),
      slug,
      publishedAt,
      image: urlForImage(r.image as SanityImageSource),
      author: String(r.author ?? "rbe"),
      categories: (r.categories as string[]) ?? [],
      tags: (r.tags as string[]) ?? [],
      description: String(r.description ?? ""),
      bodyMarkdown: String(r.bodyMarkdown ?? ""),
      legacyComments: r.legacyComments as Post["legacyComments"],
      url: postUrl(publishedAt, slug),
    };
  });
}

export async function getEvents(): Promise<EventDoc[]> {
  if (useFs()) return loadEventsFromFs();
  const client = getSanityClient();
  const rows = await client.fetch<Array<Record<string, unknown>>>(
    `*[_type == "event"]|order(start desc){
      _id, title, "slug": slug.current, start, end, venue, author, buttonOpen, buttonText, buttonUrl, image, intro, description, bodyMarkdown
    }`,
  );
  return rows.map((r) => {
    const slug = String(r.slug);
    return {
      _id: String(r._id),
      title: String(r.title),
      slug,
      start: String(r.start),
      end: String(r.end),
      venue: String(r.venue ?? ""),
      author: String(r.author ?? "rbe"),
      buttonOpen: Boolean(r.buttonOpen),
      buttonText: String(r.buttonText ?? ""),
      buttonUrl: String(r.buttonUrl ?? ""),
      image: urlForImage(r.image as SanityImageSource),
      intro: String(r.intro ?? ""),
      description: String(r.description ?? ""),
      bodyMarkdown: String(r.bodyMarkdown ?? ""),
      url: `/events/${slug}/`,
    };
  });
}

export async function getCauses(): Promise<Cause[]> {
  if (useFs()) return loadCausesFromFs();
  const client = getSanityClient();
  const rows = await client.fetch<Array<Record<string, unknown>>>(
    `*[_type == "cause"]{
      _id, title, "slug": slug.current, focus, image, due, active, goal, progress, featured, donationLink, intro, description, bodyMarkdown
    }`,
  );
  return rows.map((r) => {
    const slug = String(r.slug);
    return {
      _id: String(r._id),
      title: String(r.title),
      slug,
      focus: String(r.focus ?? ""),
      image: urlForImage(r.image as SanityImageSource),
      due: r.due ? String(r.due) : null,
      active: Boolean(r.active),
      goal: typeof r.goal === "number" ? r.goal : null,
      progress: Number(r.progress ?? 0),
      featured: Boolean(r.featured),
      donationLink: r.donationLink ? String(r.donationLink) : null,
      intro: String(r.intro ?? ""),
      description: String(r.description ?? ""),
      bodyMarkdown: String(r.bodyMarkdown ?? ""),
      url: `/causes/${slug}/`,
    };
  });
}

/** Site settings are static: `_data/info.yml` (contact, social, home/about copy). */
export async function getSiteSettings(): Promise<SiteSettings> {
  return loadSiteSettingsFromFs();
}

export async function getTeam(): Promise<TeamMember[]> {
  if (useFs()) return loadTeamFromFs();
  const client = getSanityClient();
  const doc = await client.fetch(`*[_type == "team"][0]{members[]{..., "image": image.asset->url}}`);
  return (doc?.members ?? []).map((m: Record<string, unknown>) => ({
    name: String(m.name ?? ""),
    role: String(m.role ?? ""),
    memberSince: m.memberSince ? String(m.memberSince) : undefined,
    image: m.image ? String(m.image) : null,
    featurelink: m.featurelink ? String(m.featurelink) : undefined,
    social: (m.social as Record<string, string>) ?? {},
  }));
}

/** Always from `_data/join_faq.yml` — not managed in Sanity Studio. */
export async function getJoinFaq(): Promise<Array<{ question: string; answer: string }>> {
  return loadJoinFaqFromFs();
}

/** Brand kit is static: `_data/brandkit.yml` + `public/images/brandkit/` (Netlify). */
export async function getBrandKit(): Promise<BrandKitGroup[]> {
  return loadBrandKitFromFs();
}

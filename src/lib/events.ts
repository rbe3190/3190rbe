export type EventState = "ongoing" | "upcoming" | "past";

/** Asia/Kolkata “now” as unix seconds — matches Jekyll site.time usage. */
export function nowStamp(date = new Date()): number {
  return Math.floor(date.getTime() / 1000);
}

export function toUnix(isoOrLocal: string | Date | undefined | null): number | null {
  if (!isoOrLocal) return null;
  const d = typeof isoOrLocal === "string" ? new Date(isoOrLocal.replace(" ", "T")) : isoOrLocal;
  const t = d.getTime();
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

export function eventState(
  start: string | Date,
  end: string | Date | undefined | null,
  now: number = nowStamp(),
): EventState {
  const startStamp = toUnix(start);
  if (startStamp == null) return "past";
  const endStamp = toUnix(end ?? undefined);
  if (endStamp != null) {
    if (startStamp <= now && now <= endStamp) return "ongoing";
    if (startStamp > now) return "upcoming";
    return "past";
  }
  return startStamp > now ? "upcoming" : "past";
}

function asDate(iso: string | Date): Date {
  return typeof iso === "string" ? new Date(iso.replace(" ", "T")) : iso;
}

/** Full month — post detail, sidebars: `%B %d, %Y` */
export function formatDate(iso: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = asDate(iso);
  return d.toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    month: "long",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

/** Card dates — Jekyll `%b %d, %Y` → `Jul 31, 2026` */
export function formatDateCard(iso: string | Date): string {
  return asDate(iso).toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Event card start — Jekyll `%b %d, %Y · %H:%M` */
export function formatEventCardStart(iso: string | Date): string {
  const d = asDate(iso);
  const date = formatDateCard(d);
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

/** Home spotlight — Jekyll `%B %d, %Y · %H:%M` */
export function formatSpotlightDate(iso: string | Date): string {
  const d = asDate(iso);
  const date = formatDate(d);
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

/** Event/cause sidebar — close to Liquid `%d %b %Y, %I:%M %p` */
export function formatDateTime(iso: string | Date): string {
  const d = asDate(iso);
  const date = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date}, ${time}`;
}

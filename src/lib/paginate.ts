/** Shared list pagination for static archive pages. */

export function paginateList<T>(
  items: T[],
  page: number,
  pageSize: number,
): { page: number; totalPages: number; slice: T[] } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { page: safePage, totalPages, slice };
}

/** Static paths for page 2…N (page 1 lives at the section index). */
export function archivePagePaths(totalPages: number): number[] {
  if (totalPages <= 1) return [];
  return Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
}

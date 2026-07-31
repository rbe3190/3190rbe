import { defineField, defineType } from "sanity";

export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (r) => r.required(),
      description: "Shown on news cards and category chips (e.g. Community Service).",
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
      description: "URL segment under /news/… (e.g. community-service).",
    }),
  ],
  orderings: [
    { title: "Title, A–Z", name: "titleAsc", by: [{ field: "title", direction: "asc" }] },
    { title: "Title, Z–A", name: "titleDesc", by: [{ field: "title", direction: "desc" }] },
    { title: "Last edited, newest", name: "updatedDesc", by: [{ field: "_updatedAt", direction: "desc" }] },
    { title: "Last edited, oldest", name: "updatedAsc", by: [{ field: "_updatedAt", direction: "asc" }] },
    { title: "Created, newest", name: "createdDesc", by: [{ field: "_createdAt", direction: "desc" }] },
    { title: "Created, oldest", name: "createdAsc", by: [{ field: "_createdAt", direction: "asc" }] },
  ],
  preview: {
    select: { title: "title", slug: "slug.current" },
    prepare: ({ title, slug }) => ({
      title: title || "Untitled category",
      subtitle: slug ? `/news/${slug}/` : "Missing slug",
    }),
  },
});

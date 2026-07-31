import { defineField, defineType } from "sanity";

export const post = defineType({
  name: "post",
  title: "News",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "publishedAt", type: "datetime", validation: (r) => r.required() }),
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({ name: "author", type: "string", initialValue: "rbe" }),
    defineField({
      name: "categories",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Club Service", value: "Club-Service" },
          { title: "Community Service", value: "Community-Service" },
          { title: "International Service", value: "International-Service" },
          { title: "Professional Development", value: "Professional-Development" },
        ],
      },
    }),
    defineField({ name: "tags", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "description", type: "text" }),
    defineField({
      name: "bodyMarkdown",
      title: "Body",
      type: "markdown",
      description: "Write with Markdown toolbar (bold, lists, links, images) — similar to Decap.",
    }),
    defineField({
      name: "legacyComments",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "user", type: "string" },
            { name: "timestamp", type: "string" },
            { name: "comment", type: "text" },
          ],
        },
      ],
    }),
  ],
  orderings: [
    { title: "Published, newest", name: "pubDesc", by: [{ field: "publishedAt", direction: "desc" }] },
  ],
  preview: {
    select: { title: "title", media: "image", date: "publishedAt" },
    prepare: ({ title, media, date }) => ({
      title,
      media,
      subtitle: date ? new Date(date).toLocaleDateString() : "",
    }),
  },
});

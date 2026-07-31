import { defineField, defineType } from "sanity";

export const event = defineType({
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "start", type: "datetime", validation: (r) => r.required() }),
    defineField({ name: "end", type: "datetime", validation: (r) => r.required() }),
    defineField({ name: "venue", type: "string" }),
    defineField({ name: "author", type: "string", initialValue: "rbe" }),
    defineField({ name: "buttonOpen", type: "boolean", initialValue: true }),
    defineField({ name: "buttonText", type: "string" }),
    defineField({ name: "buttonUrl", type: "string" }),
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({ name: "intro", type: "text" }),
    defineField({ name: "description", type: "text" }),
    defineField({
      name: "bodyMarkdown",
      title: "Body",
      type: "markdown",
      description: "Write with Markdown toolbar (bold, lists, links, images) — similar to Decap.",
    }),
  ],
  orderings: [
    { title: "Start, newest", name: "startDesc", by: [{ field: "start", direction: "desc" }] },
  ],
  preview: {
    select: { title: "title", media: "image", start: "start" },
    prepare: ({ title, media, start }) => ({
      title,
      media,
      subtitle: start ? new Date(start).toLocaleString() : "",
    }),
  },
});

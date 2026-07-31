import { defineField, defineType } from "sanity";

export const cause = defineType({
  name: "cause",
  title: "Cause",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "focus", type: "string" }),
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({ name: "due", type: "date" }),
    defineField({ name: "active", type: "boolean", initialValue: true }),
    defineField({ name: "goal", type: "number" }),
    defineField({
      name: "progress",
      type: "number",
      validation: (r) => r.min(0).max(100),
      initialValue: 0,
    }),
    defineField({ name: "featured", type: "boolean", initialValue: false }),
    defineField({ name: "donationLink", type: "url" }),
    defineField({ name: "intro", type: "text" }),
    defineField({ name: "description", type: "text" }),
    defineField({
      name: "bodyMarkdown",
      title: "Body",
      type: "markdown",
      description: "Write with Markdown toolbar (bold, lists, links, images) — similar to Decap.",
    }),
  ],
  preview: {
    select: { title: "title", media: "image", active: "active" },
    prepare: ({ title, media, active }) => ({
      title,
      media,
      subtitle: active ? "Active" : "Inactive",
    }),
  },
});

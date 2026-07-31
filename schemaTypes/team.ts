import { defineField, defineType } from "sanity";

export const team = defineType({
  name: "team",
  title: "Team",
  type: "document",
  fields: [
    defineField({
      name: "members",
      title: "Members",
      type: "array",
      of: [
        {
          type: "object",
          name: "teamMember",
          fields: [
            defineField({ name: "name", type: "string", validation: (r) => r.required() }),
            defineField({ name: "role", type: "string" }),
            defineField({
              name: "memberSince",
              title: "Member since",
              type: "string",
              description: 'e.g. "2019" or "Rotary Year 2024-25"',
            }),
            defineField({ name: "image", type: "image", options: { hotspot: true } }),
            defineField({
              name: "featurelink",
              title: "Feature / profile link",
              type: "url",
            }),
            defineField({
              name: "social",
              type: "object",
              options: { collapsible: true, collapsed: true },
              fields: [
                { name: "linkedin", type: "url" },
                { name: "twitter", type: "url", title: "X / Twitter" },
                { name: "facebook", type: "url" },
                { name: "instagram", type: "url" },
                { name: "email", type: "string" },
              ],
            }),
          ],
          preview: {
            select: { title: "name", subtitle: "role", media: "image" },
            prepare: ({ title, subtitle, media }) => ({
              title: title || "Unnamed member",
              subtitle: subtitle || "Team member",
              media,
            }),
          },
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Team",
      subtitle: "About page members",
    }),
  },
});

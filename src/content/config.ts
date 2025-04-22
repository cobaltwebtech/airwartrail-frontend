import { defineCollection, z } from "astro:content";

// Define the schema for episodes collection
const episodesCollection = defineCollection({
  type: "content",
  schema: z.object({
    _schema: z.literal("default"),
    date: z.date(),
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    author: z.string(),
    draft: z.boolean().default(false),
  }),
});

// Export the collections object with all defined collections
export const collections = {
  episodes: episodesCollection,
};

// Content collections configuration for Astro
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
	loader: glob({
		pattern: ["**/*.md", "**/*.mdx"],
		base: "./src/content/blog",
	}),
	schema: z.object({
		_schema: z.literal("default"),
		date: z.coerce.date(),
		title: z.string(),
		description: z.string(),
		tags: z.array(z.string()),
		author: z.string(),
		draft: z.boolean().default(false),
	}),
});

export const collections = { blog };

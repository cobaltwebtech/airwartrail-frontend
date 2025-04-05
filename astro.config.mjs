import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import { remarkReadingTime } from "./src/lib/readTime";

export default defineConfig({
  site: "https://www.airwartrail.com",
  integrations: [mdx(), react()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    remarkPlugins: [remarkReadingTime],
    drafts: true,
  },
  experimental: {
    svg: {
      mode: "sprite",
    },
  },
});

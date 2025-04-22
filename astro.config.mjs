import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import { remarkReadingTime } from "./src/lib/readTime";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  site: "https://www.airwartrail.com",
  integrations: [mdx(), react()],

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    remarkPlugins: [remarkReadingTime],
    drafts: true,
  },

  adapter: cloudflare(),
});

import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import { remarkReadingTime } from "./src/lib/readTime";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  site: "https://airwartrail.vercel.app",
  integrations: [
    mdx(),
    react({
      mode: 'nodejs'
    })
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    remarkPlugins: [remarkReadingTime],
    drafts: true,
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
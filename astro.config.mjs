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
    react()
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      alias: import.meta.env.PROD && {
        "react-dom/server": "react-dom/server.edge",
      },
    },  
  },
  markdown: {
    remarkPlugins: [remarkReadingTime],
    drafts: true,
  },
  adapter: cloudflare({
    mode: "directory",
    platformProxy: {
      enabled: true,
    },
    functionPerRoute: false,
    routes: {
      strategy: "include",
      include: ["/*"]
    }
  }),
});
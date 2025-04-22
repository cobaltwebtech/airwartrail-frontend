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
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server
      // This avoids MessageChannel errors in Cloudflare
      alias: {
        "react-dom/server": "react-dom/server.edge",
      },
    },
  },

  markdown: {
    remarkPlugins: [remarkReadingTime],
    drafts: true,
  },

  adapter: cloudflare(),
});

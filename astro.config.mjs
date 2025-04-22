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
      alias: {
        "react-dom/server": "react-dom/server.edge",
      },
    },
    ssr: {
      noExternal: ['react-dom']
    }
  },

  markdown: {
    remarkPlugins: [remarkReadingTime],
    drafts: true,
  },

  adapter: cloudflare({
    runtime: {
      mode: 'local',
      type: 'pages'
    }
  }),

  ssr: {
    noExternal: ["@radix-ui/*"]
  }
});

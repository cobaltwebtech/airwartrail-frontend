import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  site: "https://www.airwartrail.com",
  integrations: [mdx(), react()],
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
    drafts: true,
  },
  session: {
    ttl: 60 * 60 * 24 * 7, // Session data expiration set to 7 days stored on Cloudflare KV
  },
  adapter: cloudflare({
    sessionKVBindingName: "AIRWARTRAIL_AUTHSESSIONS_KV",
    imageService: "cloudflare",
    platformProxy: {
      enabled: true,
    },
  }),
});

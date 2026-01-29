import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "server",
	site: "https://www.airwartrail.com",
	integrations: [mdx(), react()],
	vite: {
		plugins: [tailwindcss()],
	},
	experimental: {
		liveContentCollections: true,
	},
	markdown: {
		drafts: true,
	},
	session: {
		ttl: 60 * 60 * 24 * 7, // Session data expiration set to 7 days stored on Cloudflare KV
	},
	adapter: cloudflare({
		sessionKVBindingName: "KV_AUTH",
		imageService: "cloudflare",
		platformProxy: {
			enabled: true,
		},
	}),
});

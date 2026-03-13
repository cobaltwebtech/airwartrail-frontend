import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
	output: "server",
	site: "https://www.airwartrail.com",
	prefetch: {
		prefetchAll: true,
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: "Reddit Sans",
			cssVariable: "--default-font-family",
			options: {
				variants: [
					{
						src: ["./public/fonts/RedditSans-VariableFont_wght.woff2"],
						weight: "200 900",
						style: "normal",
					},
					{
						src: ["./public/fonts/RedditSans-Italic-VariableFont_wght.woff2"],
						weight: "200 900",
						style: "italic",
					},
				],
			},
		},
	],
	vite: {
		plugins: [tailwindcss()],
		build: {
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes("better-auth") || id.includes("zod")) return "better-auth";
						if (id.includes("stripe")) return "stripe";
						if (id.includes("drizzle-orm")) return "drizzle";
					},
				},
			},
		},
	},
	experimental: {
		rustCompiler: true,
		queuedRendering: {
			enabled: true,
		},
		clientPrerender: true,
	},
	markdown: {
		drafts: true,
	},
	session: {
		ttl: 60 * 60 * 24 * 7, // Session data expiration set to 7 days stored on Cloudflare KV
	},
	adapter: cloudflare({
		sessionKVBindingName: "KV_AUTH",
		imageService: "cloudflare-binding",
	}),
	integrations: [
		mdx(),
		react({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		sitemap({
			filter: (page) => {
				const excludedPaths = [
					"/auth/login-error/",
					"/auth/forgot-password/",
					"/auth/reset-error/",
					"/auth/reset-password/",
					"/auth/verification-error/",
					"/streaming/premium/",
					"/bonus-content",
					"/playlists/",
					"/subscribe/checkout/",
					"/subscribe/checkout/success/",
					"/subscribe/upgrade/",
				];
				return !excludedPaths.some((path) => page.includes(path));
			},
		}),
	],
});

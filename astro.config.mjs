import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import minify from "@playform/compress";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import compressor from "astro-compressor";

export default defineConfig({
	output: "server",
	site: "https://www.airwartrail.com",
	prefetch: {
		prefetchAll: true,
	},
	vite: {
		plugins: [tailwindcss()],
	},
	experimental: {
		liveContentCollections: true,
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
		imageService: "cloudflare",
		platformProxy: {
			enabled: true,
		},
	}),
	integrations: [
		mdx(),
		react(),
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
		minify({
			CSS: false,
			HTML: true,
			Image: false,
			JavaScript: false,
			SVG: true,
		}),
		compressor({
			gzip: false,
			brotli: true,
		}),
	],
});

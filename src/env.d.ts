/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

type AuthState = import("@/lib/auth-check").AuthState;

declare namespace App {
	interface Locals {
		/** Authentication and subscription state - populated by middleware */
		auth: AuthState;
		/** Cloudflare execution context */
		cfContext: import("@astrojs/cloudflare").ExecutionContext;
	}
}

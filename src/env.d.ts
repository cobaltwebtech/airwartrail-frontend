/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;
type AuthState = import("@/lib/auth-check").AuthState;

declare namespace App {
	interface Locals extends Runtime {
		/** Authentication and subscription state - populated by middleware */
		auth: AuthState;
	}
}

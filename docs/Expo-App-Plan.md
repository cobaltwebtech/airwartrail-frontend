I'll help you plan a mobile app using Expo that shares your existing infrastructure. Let me first understand your current architecture and explore how these components can work together. 

Understand current architecture and integrations

Searched for regex `betterAuth|better-auth`, 20 results

Searched for regex `tRPC|trpc`, 20 results

Searched for regex `stripe|Stripe`, 20 results

Searched for regex `mux|Mux|MuxPlayer`, 20 results

Searched for regex `wrangler|cloudflare|worker`, 15 results

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/trpc)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/auth.ts#1-1), lines 1 to 100

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/auth-client.ts)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/checkout/CheckoutForm.tsx#1-1), lines 1 to 100

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/trpc/server.ts#1-1), lines 1 to 80

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/trpc/client.ts#1-1), lines 1 to 80

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/auth.ts#100-100), lines 100 to 150

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/useSubStatus.ts)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/auth/LoginForm.tsx#1-1), lines 1 to 1

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/video-helpers.ts#1-1), lines 1 to 80

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/auth/LoginForm.tsx#1-1), lines 1 to 150

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/auth/SignupForm.tsx#1-1), lines 1 to 100

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/middleware.ts#1-1), lines 1 to 80

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/video)

Searched for regex `MuxPlayer|@mux/mux-player`, 20 results

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/db-auth-schema.ts#1-1), lines 1 to 100

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/auth-check.ts#1-1), lines 1 to 80

Searched for regex `AWT_CMS|service_binding`, 20 results

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/video/VideoPlayer.tsx#1-1), lines 1 to 150

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/video/VideoEmbed.tsx#1-1), lines 1 to 150

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/wrangler.jsonc)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/auth.ts#140-140), lines 140 to 200

Searched for regex `createClientSecret|credentialFunctions`, no results

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/checkout/StripeCheckout.tsx#1-1), lines 1 to 150

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/checkout/CheckoutProcess.tsx)

Searched for regex `httpOnly|credential|localStorage|sessionStorage`, 15 results

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/auth/ForgotPassword.tsx#1-1), lines 1 to 100

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/components/auth/PasswordReset.tsx#1-1), lines 1 to 100

Searched for regex `api/stripe|create-setup-intent|calculate-tax`, 14 results

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/pages/api)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/pages/api/stripe)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/pages/api/stripe/create-setup-intent.ts#1-1), lines 1 to 80

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/pages/api/stripe/create-subscription.ts#1-1), lines 1 to 80

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/pages/api/auth/%5B...all%5D.ts)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/pages/api/trpc/%5B...trpc%5D.ts)

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/src/lib/trpc/types.ts#1-1), lines 1 to 80

Searched for regex `generateSignedTokens|service\.auth\.generateToken`, 25 results

Read [](file:///Users/cgarza/GitHub-Repos/airwartrail-frontend/astro.config.mjs)

Searched for regex `requiresSub|hasActiveSubscription|videoAccess|premium|basic` (`**/src/pages/**`), 10 results

Searched for regex `http-only|SameSite|CSRF|xsrf`, 1 result

Read [](file:///Users/cgarza/Library/Application%20Support/Code/User/workspaceStorage/596f5a38dd2ae995625b3a4af29ed2ee/GitHub.copilot-chat/chat-session-resources/9ab8e8de-cee1-49fa-86f6-38b8fc04d74d/toolu_vrtx_01CcciuvhVNY8q5oNKiBB7hW__vscode-1772677448060/content.txt)

Perfect! I have a detailed understanding of your architecture. Now let me clarify some key decisions before creating the plan: 

Analyzing your answers...

Created memory file [](file:///Users/cgarza/Library/Application%20Support/Code/User/workspaceStorage/596f5a38dd2ae995625b3a4af29ed2ee/GitHub.copilot-chat/memory-tool/memories/OWFiOGU4ZGUtY2VlMS00OWZhLTg2ZjYtMzhiOGZjMDRkNzRk/plan.md)

Now I'll create a detailed implementation plan:

## Plan: Expo Mobile App with Shared Backend Infrastructure

**TL;DR**: Create a monorepo that shares authentication, payment, and video streaming logic between your existing Astro web app and a new Expo mobile app. Both will use the same Cloudflare Workers backend, D1 database, Stripe account, and Mux library for seamless cross-platform user experience.

**Steps**

### Phase 1: Monorepo Foundation
1. Restructure workspace into monorepo (move web app to `apps/web`, create `apps/mobile` for Expo)
   - Keep all existing web app files intact to minimize risk
   - Create shared packages under `packages/*` for auth, tRPC, types, UI components
   - Update package.json scripts to handle multi-app workspace (pnpm workspaces)
   - Update build pipelines: web still builds with `astro build`, mobile with `expo build`

2. Extract shared code into `packages/auth`
   - Copy Better Auth client setup from auth-client.ts and auth.ts
   - Create shared auth hooks (`useSession()`, `useAuthMachine()`) compatible with React/React Native
   - Add token-based auth fallback for mobile (Better Auth supports both cookie and token-based sessions via `sessionStorage` option)
   - Implement secure token storage using Expo's SecureStore on mobile

3. Extract shared code into `packages/trpc`
   - Move tRPC client config from client.ts into shared package
   - Keep HTTP batch link as-is; both web and mobile use same endpoint (`/api/trpc`)
   - Ensure SuperJSON transformer is used identically across platforms

4. Extract shared code into `packages/stripe`
   - Move Stripe subscription checking logic from useSubStatus.ts
   - Create cross-platform hook for subscription status (Platform.select() for platform-specific logic)
   - Share Stripe types and schemas from schemas.ts

### Phase 2: Mobile Authentication & Session Management
5. Update Better Auth server config (auth.ts) if needed
   - Test that existing Better Auth setup supports token-based sessions in addition to cookies
   - Add mobile redirect URI to Better Auth OAuth config if using social logins
   - Verify rate limiting with Cloudflare's CF-Connecting-IP header works for mobile traffic

6. Implement mobile auth client in `apps/mobile/lib/auth`
   - Use Better Auth's `@better-auth/react-native` (or fallback to fetch-based if unavailable)
   - Implement secure token storage: `SecureStore` for tokens, standard AsyncStorage for session data
   - Create auth state machine with offline support (cache session in mobile storage)
   - Implement token refresh logic - refresh token before each request if needed

7. Create mobile-friendly auth screens in `apps/mobile/screens/auth`
   - LoginScreen using shared auth logic, custom React Native UI
   - SignupScreen with email verification flow
   - PasswordResetScreen
   - MagicLinkScreen for email-based login
   - *Depends on Phase 1*

### Phase 3: Video Streaming on Mobile
8. Integrate `react-native-video` and Mux playback tokens
   - Install `react-native-video` and platform-specific peer dependencies
   - Create reusable VideoPlayer component in `apps/mobile/components/VideoPlayer.tsx`
   - Uses same token generation logic as web: call `trpc.mux.generateSignedTokens.query()` to get playback tokens
   - Pass signed token to native player (Mux supports token-authenticated playback via URL parameters)
   - Handle video quality adaptation, buffering, and error states

9. Create video library screens in `apps/mobile/screens`
   - VideoListScreen: Browse available videos (respects subscription tier via `useSubStatus()`)
   - VideoDetailScreen: Display single video with player, metadata, related videos
   - PlaylistScreen: Browse and play playlists
   - My LibraryScreen: Save favorites (requires new feature; optional for MVP)
   - *Depends on Phase 2 (auth check) and Phase 3.8*

### Phase 4: Mobile Payments (Stripe)
10. Integrate Stripe mobile SDKs
    - Install `@stripe/stripe-react-native` (official mobile SDK)
    - Replace web PaymentElement with mobile-native payment sheet from Stripe
    - Create CheckoutScreen in `apps/mobile/screens/CheckoutScreen.tsx`
    - Flow: Show subscription offer → Launch Stripe payment sheet → Handle result → Update subscription
    - Use tRPC endpoint `/api/stripe/create-subscription` (existing backend, reuse as-is)
    - *Depends on Phase 2 (auth) and Phase 4 prep*

11. Handle Stripe webhooks (no change needed)
    - Existing webhook handlers at `/pages/api/stripe/webhooks.ts` continue to work
    - Webhooks update subscription status in database for both web and mobile users transparently

12. Create account management screen in `apps/mobile/screens/AccountScreen.tsx`
    - Show subscription status (leveraging `useSubStatus()`)
    - Link to Stripe Customer Portal (same endpoint at `/api/stripe/portal` for both platforms)
    - Logout, settings, account details
    - *Depends on Phase 2 and Phase 4*

### Phase 5: Testing & Validation
13. Test authentication flows end-to-end
    - Email/password signup and login on mobile
    - Magic link flow on mobile (email app integration test)
    - Session persistence across app restart
    - Token refresh if expired
    - Cross-platform: sign in on web, verify access on mobile and vice-versa

14. Test video streaming
    - Play public videos without subscription
    - Attempt to play premium videos without subscription (verify access denied)
    - Sign up for subscription, verify premium video access on mobile
    - Test offline playback (buffer video, close app, play without network)

15. Test Stripe integration
    - Create subscription on mobile
    - Verify subscription status appears on mobile and web instantly
    - Cancel subscription via Stripe portal
    - Verify access revoked on both platforms

### Phase 6: Deployment & Documentation
16. Set up mobile CI/CD
    - Configure EAS Build for iOS/Android in `eas.json`
    - Set up preview builds for testing
    - Integrate with existing deployment pipeline or separate workflow

17. Prepare App Store submissions
    - Create app icons, splash screens (can reuse branding from web)
    - Write app descriptions and privacy policy (link to existing policies)
    - Test on iOS and Android testflight/internal testing tracks

18. Document shared code and integration points
    - Create MOBILE_GUIDE.md in monorepo root explaining architecture
    - Document which features are shared vs. mobile-specific
    - Provide examples of how to extend features to mobile

---

**Relevant files**
- auth-client.ts — Better Auth client setup (move to shared package)
- auth.ts — Better Auth server config (reference for mobile session handling)
- client.ts — tRPC client setup (share across platforms)
- useSubStatus.ts — Subscription checking logic (extract and adapt)
- auth — Auth UI (reference for logic, rebuild UI in React Native)
- StripeCheckout.tsx — Stripe form logic (replace with mobile SDK)
- video-helpers.ts — Token generation (shared, reuse as-is)
- wrangler.jsonc — No changes needed (same backend infrastructure)
- api — All API endpoints continue to work for both platforms

**Verification**
1. **Phase 1**: Run `pnpm -r dev` — both web and mobile apps start without errors. Shared packages have no circular dependencies.
2. **Phase 2**: On mobile, complete email signup → receive verification email → click link → redirected to app and logged in.
3. **Phase 3**: Authenticated user on mobile views video library → can play public videos → blocked from premium videos until subscription.
4. **Phase 4**: User subscribes via Stripe on mobile → subscription status immediately reflects on web app (webhook propagation test).
5. **Phase 5**: Sign in on web, close app, open on mobile without signing in again → session restored.
6. **Phase 6**: Subscription-free user plays premium video on web → gets paywall → subscribes via mobile → can play same video on web without refresh.

**Decisions**
- **Monorepo approach**: Maximizes code reuse, single deployment, easier to keep platforms in sync. Tradeoff: more complex workspace setup.
- **Token-based auth for mobile**: Better Auth supports both cookie and token sessions. Tokens are more portable for native apps.
- **react-native-video over WebView**: True native video player improves performance and UX. Mux's token-authenticated playback is fully compatible.
- **@stripe/stripe-react-native**: Official SDK provides native payment sheet (better UX than web forms on mobile).
- **Shared backend**: Zero duplication, single source of truth for data. Both apps read/write same database.

**Further Considerations**
1. **Deep Linking** — Should mobile app deep-link to specific videos/playlists? (e.g., `airwartrail://video/abc123`). This enables social sharing and web-to-app redirects.
   - Recommendation: Implement in Phase 5; requires updating tRPC routes to handle routing context.

2. **Offline Content** — Should users be able to download videos for offline playback? This is common in streaming apps and requires caching logic.
   - Recommendation: Defer to post-MVP; adds complexity with Stripe access control (can user access downloaded content if subscription expires?).

3. **Push Notifications** — Should mobile send notifications for new episodes, subscription reminders, etc.?
   - Recommendation: Plan for Phase 7 after MVP (requires Firebase/OneSignal + backend integration).

---

**Does this plan align with your vision?** Any changes to scope, priorities, or architectural decisions?
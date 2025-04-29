import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const token = url.searchParams.get("token");

  // Check reset password route specifically
  if (path === "/login/reset-password") {
    if (!token) {
      // If no token is present, redirect to error page
      return context.redirect("/login/login-error");
    }
    // Token exists, proceed with the request
    return next();
  }

  // Check if the user is authenticated
  const isAuthed = await context.session?.get("session");

  // Define public and private paths
  const publicPaths = ["/signup", "/login"];
  const isPublicPath = publicPaths.includes(path);
  const isPrivatePath = path.startsWith("/account");

  // Redirect users based on authentication status
  if (isPrivatePath && !isAuthed) {
    return context.redirect("/login");
  }
  if (isPublicPath && isAuthed) {
    return context.redirect("/account");
  }
  if (path === "/subscribe/success" && !isAuthed) {
    return context.redirect("/subscribe");
  }

  // Check for errors in the query string of the URL
  const error = url.searchParams.get("error");

  if (error === "EXPIRED_TOKEN" || error === "INVALID_TOKEN") {
    // Redirect if there are token errors in the Magic Link
    return context.redirect(`/login/login-error?magicLinkError=${error}`);
  }

  if (error === "token_expired" || error === "invalid_token") {
    // Redirect if the token is expired or invalid on verification emails
    return context.redirect(`/login/verification-error?response=${error}`);
  }

  return next();
});

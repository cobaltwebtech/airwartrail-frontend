import { auth } from "@/lib/auth";
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
  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  });

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

  // Check for errors in the query string in the URL
  const error = url.searchParams.get("error");

  if (error === "EXPIRED_TOKEN" || error === "INVALID_TOKEN") {
    // Redirect if there are token errors in the Magic Link
    return context.redirect(`/login/login-error?magicLinkError=${error}`);
  }

  if (error === "token_expired") {
    // Redirect if the verification token is expired
    return context.redirect(`/account/verification-error?response=${error}`);
  }

  return next();
});

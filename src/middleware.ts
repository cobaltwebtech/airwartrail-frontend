import { auth } from "@/lib/auth";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const token = url.searchParams.get("token");

  // Check reset password route specifically
  if (path === "/login/reset-password") {
    if (!token) {
      // If no token is present, redirect to home page
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
  const privatePaths = ["/account"];
  const isPrivatePath = privatePaths.includes(path);

  // Redirect users based on authentication status
  if (isPrivatePath && !isAuthed) {
    return context.redirect("/login");
  }
  if (isPublicPath && isAuthed) {
    return context.redirect("/account");
  }

  // Check for error query parameters in the URL
  const error = url.searchParams.get("error");

  if (error === "EXPIRED_TOKEN" || error === "INVALID_TOKEN") {
    return context.redirect(`/login/login-error?magicLinkError=${error}`);
  }

  return next();
});

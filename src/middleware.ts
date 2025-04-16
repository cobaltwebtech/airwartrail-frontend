import { auth } from "@/lib/auth";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  // Check if the user is authenticated
  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  });

  // Redirect routes based on authentication status
  const publicPaths = ["/signup", "/login"];
  const isPublicPath = publicPaths.includes(context.url.pathname);
  const privatePaths = ["/account"];
  const isPrivatePath = privatePaths.includes(context.url.pathname);

  if (isPrivatePath && !isAuthed) {
    return context.redirect("/login");
  }
  if (isPublicPath && isAuthed) {
    return context.redirect("/account");
  }

  // Check for error query parameters in the URL
  const url = new URL(context.request.url);
  const error = url.searchParams.get("error");

  if (error === "EXPIRED_TOKEN" || error === "INVALID_TOKEN") {
    // Redirect to the login-error page with the error query parameter
    return context.redirect(`/login/login-error?magicLinkError=${error}`);
  }

  // Proceed with the next middleware or request handler
  return next();
});

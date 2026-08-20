import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

export type AppUser = {
  id: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user?.email) return null;
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  return {
    id: user.id,
    email: user.email,
    fullName,
    displayName: fullName ?? user.email.split("@")[0],
  };
}

export async function requireAppUser(returnTo: string): Promise<AppUser> {
  const user = await getAppUser();
  if (user) return user;

  redirect(`/login?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
}

export function appSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `/auth/signout?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (url.pathname.startsWith("/auth/") || url.pathname === "/login") return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

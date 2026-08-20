"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!email.includes("@") || password.length < 6) {
    redirect("/login?message=Use%20um%20e-mail%20válido%20e%20uma%20senha%20com%206%20caracteres.");
  }
  return { email, password, fullName };
}

function safeReturnTo(formData: FormData) {
  const value = String(formData.get("returnTo") ?? "/");
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function login(formData: FormData) {
  const { email, password } = readCredentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?message=${encodeURIComponent("E-mail ou senha incorretos.")}`);
  redirect(safeReturnTo(formData));
}

export async function signup(formData: FormData) {
  const { email, password, fullName } = readCredentials(formData);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || email.split("@")[0] },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  redirect(`/login?message=${encodeURIComponent("Conta criada. Confira seu e-mail para confirmar o acesso.")}`);
}

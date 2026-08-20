"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

// O e-mail de confirmação é sempre emitido para o domínio canônico do MVP.
const appUrl = "https://os.layerflow.com.br";

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
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || email.split("@")[0] },
      emailRedirectTo: new URL("/auth/confirm", appUrl).toString(),
    },
  });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  redirect(`/login?message=${encodeURIComponent("Conta criada. Confira seu e-mail para confirmar o acesso.")}`);
}

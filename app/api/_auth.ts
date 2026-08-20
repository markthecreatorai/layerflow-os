import { createClient } from "../../lib/supabase/server";
import { getAppUser, type AppUser } from "../chatgpt-auth";

export async function requireApiUser(): Promise<AppUser | Response> {
  const user = await getAppUser();
  if (!user) {
    return Response.json(
      { error: "Sua sessão expirou. Entre novamente para continuar." },
      { status: 401 },
    );
  }
  return user;
}

export function isAuthResponse(value: AppUser | Response): value is Response {
  return value instanceof Response;
}

export async function userOwnsAccount(accountId: number, _owner: string) {
  void _owner;
  if (!Number.isInteger(accountId) || accountId <= 0) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_accounts")
    .select("id")
    .eq("id", accountId)
    .maybeSingle();
  return !error && Boolean(data);
}

export function forbiddenAccount() {
  return Response.json(
    { error: "Este perfil não pertence à sua conta." },
    { status: 403 },
  );
}

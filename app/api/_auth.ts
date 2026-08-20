import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { brandAccounts } from "../../db/schema";
import { getChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

export async function requireApiUser(): Promise<ChatGPTUser | Response> {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: "Sua sessão expirou. Entre novamente para continuar." },
      { status: 401 },
    );
  }
  return user;
}

export function isAuthResponse(value: ChatGPTUser | Response): value is Response {
  return value instanceof Response;
}

export async function userOwnsAccount(accountId: number, email: string) {
  if (!Number.isInteger(accountId) || accountId <= 0) return false;
  const db = getDb();
  const [account] = await db
    .select({ id: brandAccounts.id })
    .from(brandAccounts)
    .where(and(eq(brandAccounts.id, accountId), eq(brandAccounts.ownerEmail, email)))
    .limit(1);
  return Boolean(account);
}

export function forbiddenAccount() {
  return Response.json(
    { error: "Este perfil não pertence à sua conta." },
    { status: 403 },
  );
}

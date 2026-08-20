import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { brandAccounts, instagramConnections, instagramMedia } from "../../../../../db/schema";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../../../_auth";
import { getInstagramConnectionStatus, getInstagramPublicStatus } from "../_server";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isAuthResponse(auth)) return auth;
  const accountId = Number(new URL(request.url).searchParams.get("accountId"));
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
  const status = await getInstagramConnectionStatus(accountId, auth.email);
  return Response.json({ ...getInstagramPublicStatus(), ...status });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (isAuthResponse(auth)) return auth;
  const accountId = Number(new URL(request.url).searchParams.get("accountId"));
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();

  const db = getDb();
  const [connection] = await db.select({ id: instagramConnections.id }).from(instagramConnections).where(and(eq(instagramConnections.accountId, accountId), eq(instagramConnections.ownerEmail, auth.email))).limit(1);
  if (connection) {
    await db.delete(instagramMedia).where(eq(instagramMedia.connectionId, connection.id));
    await db.delete(instagramConnections).where(eq(instagramConnections.id, connection.id));
  }
  await db.update(brandAccounts).set({ connectionStatus: "Planejamento" }).where(and(eq(brandAccounts.id, accountId), eq(brandAccounts.ownerEmail, auth.email)));
  return Response.json({ disconnected: true });
}

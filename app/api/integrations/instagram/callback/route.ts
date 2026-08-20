import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { brandAccounts, instagramConnections, instagramOauthStates } from "../../../../../db/schema";
import { isAuthResponse, requireApiUser } from "../../../_auth";
import { encryptInstagramToken, exchangeInstagramAuthorizationCode, subscribeInstagramWebhooks } from "../_server";

function returnToLayerflow(request: Request, status: "connected" | "error", reason?: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("integration", "instagram");
  url.searchParams.set("status", status);
  if (reason) url.searchParams.set("reason", reason);
  return Response.redirect(url, 303);
}

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isAuthResponse(auth)) return auth;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error") || url.searchParams.get("error_reason");
  if (oauthError) return returnToLayerflow(request, "error", "authorization_denied");
  if (!code || !state) return returnToLayerflow(request, "error", "invalid_callback");

  const db = getDb();
  const [pending] = await db.select().from(instagramOauthStates).where(and(eq(instagramOauthStates.state, state), eq(instagramOauthStates.ownerEmail, auth.email))).limit(1);
  if (!pending || new Date(pending.expiresAt).getTime() < Date.now()) {
    if (pending) await db.delete(instagramOauthStates).where(eq(instagramOauthStates.state, state));
    return returnToLayerflow(request, "error", "expired_state");
  }
  await db.delete(instagramOauthStates).where(eq(instagramOauthStates.state, state));

  try {
    const authorization = await exchangeInstagramAuthorizationCode(code);
    const encrypted = await encryptInstagramToken(authorization.accessToken);
    const now = new Date().toISOString();
    await db.insert(instagramConnections).values({
      ownerEmail: auth.email,
      accountId: pending.accountId,
      instagramUserId: authorization.profile.instagramUserId,
      username: authorization.profile.username,
      accountType: authorization.profile.accountType,
      profilePictureUrl: authorization.profile.profilePictureUrl,
      tokenCiphertext: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenExpiresAt: authorization.expiresAt,
      status: "Conectado",
      followersCount: authorization.profile.followersCount,
      mediaCount: authorization.profile.mediaCount,
      lastError: null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: instagramConnections.accountId,
      set: {
        ownerEmail: auth.email,
        instagramUserId: authorization.profile.instagramUserId,
        username: authorization.profile.username,
        accountType: authorization.profile.accountType,
        profilePictureUrl: authorization.profile.profilePictureUrl,
        tokenCiphertext: encrypted.ciphertext,
        tokenIv: encrypted.iv,
        tokenExpiresAt: authorization.expiresAt,
        status: "Conectado",
        followersCount: authorization.profile.followersCount,
        mediaCount: authorization.profile.mediaCount,
        lastError: null,
        updatedAt: now,
      },
    });
    await db.update(brandAccounts).set({
      handle: `@${authorization.profile.username}`,
      connectionStatus: "Conectado",
    }).where(and(eq(brandAccounts.id, pending.accountId), eq(brandAccounts.ownerEmail, auth.email)));
    await subscribeInstagramWebhooks(authorization.profile.instagramUserId, authorization.accessToken).catch(() => undefined);
    return returnToLayerflow(request, "connected");
  } catch {
    return returnToLayerflow(request, "error", "token_exchange_failed");
  }
}

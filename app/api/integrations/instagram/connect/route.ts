import { getDb } from "../../../../../db";
import { instagramOauthStates } from "../../../../../db/schema";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../../../_auth";
import { bootstrapInstagramConnection, getInstagramConfig, INSTAGRAM_SCOPES } from "../_server";

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

  const accountId = Number(new URL(request.url).searchParams.get("accountId"));
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();

  const config = getInstagramConfig();
  if (config.bootstrapConfigured && !config.oauthConfigured) {
    try {
      await bootstrapInstagramConnection(accountId, auth.email);
      return returnToLayerflow(request, "connected");
    } catch {
      return returnToLayerflow(request, "error", "access_token_failed");
    }
  }

  if (!config.oauthConfigured) {
    return Response.json(
      { error: "Adicione o ID e o segredo do aplicativo Meta antes de conectar o Instagram." },
      { status: 503 },
    );
  }

  const state = crypto.randomUUID().replaceAll("-", "");
  await getDb().insert(instagramOauthStates).values({
    state,
    ownerEmail: auth.email,
    accountId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
  authorizeUrl.searchParams.set("force_reauth", "true");
  authorizeUrl.searchParams.set("client_id", config.appId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", INSTAGRAM_SCOPES.join(","));
  authorizeUrl.searchParams.set("state", state);
  return Response.redirect(authorizeUrl, 302);
}

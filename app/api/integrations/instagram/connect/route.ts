import { createClient } from "../../../../../lib/supabase/server";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../../../_auth";
import { bootstrapInstagramConnection, getInstagramConfig, INSTAGRAM_SCOPES } from "../_server";

const back = (request: Request, status: string, reason?: string) => { const url = new URL("/", request.url); url.searchParams.set("integration", "instagram"); url.searchParams.set("status", status); if (reason) url.searchParams.set("reason", reason); return Response.redirect(url, 303); };
export async function GET(request: Request) {
  const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
  const accountId = Number(new URL(request.url).searchParams.get("accountId")); if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
  const config = getInstagramConfig();
  if (config.bootstrapConfigured && !config.oauthConfigured) { try { await bootstrapInstagramConnection(accountId, auth); return back(request, "connected"); } catch { return back(request, "error", "access_token_failed"); } }
  if (!config.oauthConfigured) return Response.json({ error: "Adicione o ID e o segredo do aplicativo Meta antes de conectar o Instagram." }, { status: 503 });
  const state = crypto.randomUUID().replaceAll("-", ""); const supabase = await createClient();
  const saved = await supabase.from("instagram_oauth_states").insert({ state, owner_id: auth.id, owner_email: auth.email, account_id: accountId, expires_at: new Date(Date.now() + 600000).toISOString() }); if (saved.error) throw saved.error;
  const authorize = new URL("https://www.instagram.com/oauth/authorize"); authorize.search = new URLSearchParams({ force_reauth: "true", client_id: config.appId, redirect_uri: config.redirectUri, response_type: "code", scope: INSTAGRAM_SCOPES.join(","), state }).toString();
  return Response.redirect(authorize, 302);
}

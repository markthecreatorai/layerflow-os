import { createClient } from "../../../../../lib/supabase/server";
import { isAuthResponse, requireApiUser } from "../../../_auth";
import { encryptInstagramToken, exchangeInstagramAuthorizationCode, subscribeInstagramWebhooks } from "../_server";

const back = (request: Request, status: string, reason?: string) => { const url = new URL("/integrations/instagram/complete", request.url); url.searchParams.set("status", status); if (reason) url.searchParams.set("reason", reason); return Response.redirect(url, 303); };
export async function GET(request: Request) {
  const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
  const url = new URL(request.url); const code = url.searchParams.get("code"); const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code || !state) return back(request, "error", "authorization_denied");
  const supabase = await createClient(); const pending = await supabase.from("instagram_oauth_states").select("*").eq("state", state).maybeSingle();
  if (pending.error) throw pending.error; if (!pending.data || new Date(pending.data.expires_at).getTime() < Date.now()) return back(request, "error", "expired_state");
  await supabase.from("instagram_oauth_states").delete().eq("state", state);
  try {
    const authorization = await exchangeInstagramAuthorizationCode(code); const encrypted = await encryptInstagramToken(authorization.accessToken); const p = authorization.profile;
    const row = { owner_id: auth.id, owner_email: auth.email, account_id: pending.data.account_id, instagram_user_id: p.instagramUserId, username: p.username, account_type: p.accountType, profile_picture_url: p.profilePictureUrl, token_ciphertext: encrypted.ciphertext, token_iv: encrypted.iv, token_expires_at: authorization.expiresAt, status: "Conectado", followers_count: p.followersCount, media_count: p.mediaCount, updated_at: new Date().toISOString() };
    const connected = await supabase.from("instagram_connections").upsert(row, { onConflict: "account_id" }); if (connected.error) throw connected.error;
    const account = await supabase.from("brand_accounts").update({ handle: `@${p.username}`, connection_status: "Conectado" }).eq("id", pending.data.account_id); if (account.error) throw account.error;
    await subscribeInstagramWebhooks(p.instagramUserId, authorization.accessToken).catch(() => undefined); return back(request, "connected");
  } catch { return back(request, "error", "token_exchange_failed"); }
}

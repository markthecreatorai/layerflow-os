import { createClient } from "../../../../lib/supabase/server";
import { camelize } from "../../../../lib/supabase/rows";

const DEFAULT_REDIRECT_URI = "https://os.layerflow.com.br/api/integrations/instagram/callback";
const DEFAULT_GRAPH_VERSION = "v26.0";
export const INSTAGRAM_SCOPES = ["instagram_business_basic", "instagram_business_manage_insights", "instagram_business_manage_comments", "instagram_business_manage_messages"];

export function getInstagramConfig() {
  const appId = process.env.INSTAGRAM_APP_ID?.trim() ?? "";
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim() ?? "";
  const tokenKey = process.env.INSTAGRAM_TOKEN_KEY?.trim() ?? "";
  const bootstrapAccessToken = process.env.INSTAGRAM_BOOTSTRAP_ACCESS_TOKEN?.trim() ?? "";
  const bootstrapUserId = process.env.INSTAGRAM_BOOTSTRAP_USER_ID?.trim() ?? "";
  const webhookVerifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
  const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI;
  const graphVersion = process.env.INSTAGRAM_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
  const oauthConfigured = Boolean(appId && appSecret && tokenKey);
  const bootstrapConfigured = Boolean(bootstrapAccessToken && bootstrapUserId && tokenKey);
  return { appId, appSecret, tokenKey, bootstrapAccessToken, bootstrapUserId, webhookVerifyToken, redirectUri, graphVersion, oauthConfigured, bootstrapConfigured, configured: oauthConfigured || bootstrapConfigured };
}

export function getInstagramPublicStatus() {
  const config = getInstagramConfig();
  return { configured: config.configured, connectionMode: config.oauthConfigured ? "oauth" : config.bootstrapConfigured ? "access_token" : null, redirectUri: config.redirectUri, requiredScopes: INSTAGRAM_SCOPES };
}

const bytesToBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const base64ToBytes = (value: string) => new Uint8Array(Buffer.from(value, "base64"));
async function cryptoKey(raw: string) { const bytes = base64ToBytes(raw); if (bytes.byteLength !== 32) throw new Error("A chave de proteção dos tokens precisa ter 32 bytes."); return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]); }
export async function encryptInstagramToken(token: string) { const { tokenKey } = getInstagramConfig(); if (!tokenKey) throw new Error("A proteção segura dos tokens ainda não foi configurada."); const iv = crypto.getRandomValues(new Uint8Array(12)); const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(tokenKey), new TextEncoder().encode(token)); return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) }; }
export async function decryptInstagramToken(ciphertext: string, encodedIv: string) { const { tokenKey } = getInstagramConfig(); if (!tokenKey) throw new Error("A proteção segura dos tokens ainda não foi configurada."); const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(encodedIv) }, await cryptoKey(tokenKey), base64ToBytes(ciphertext)); return new TextDecoder().decode(decrypted); }

type MetaResponse = { error?: { message?: string; code?: number }; [key: string]: unknown };
async function readMeta(response: Response) { const payload = await response.json().catch(() => ({})) as MetaResponse; if (!response.ok || payload.error) throw new Error(`Instagram: ${payload.error?.message?.slice(0, 220) || "a Meta recusou a solicitação"}.`); return payload; }
async function graphGet(path: string, accessToken: string, params: Record<string, string>) { const config = getInstagramConfig(); const url = new URL(`https://graph.instagram.com/${config.graphVersion}/${path.replace(/^\/+/, "")}`); Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value)); url.searchParams.set("access_token", accessToken); return readMeta(await fetch(url)); }
export async function subscribeInstagramWebhooks(userId: string, token: string) { const config = getInstagramConfig(); return readMeta(await fetch(`https://graph.instagram.com/${config.graphVersion}/${userId}/subscribed_apps?subscribed_fields=comments,live_comments,messages`, { method: "POST", headers: { authorization: `Bearer ${token}` } })); }

export async function exchangeInstagramAuthorizationCode(code: string) {
  const config = getInstagramConfig(); if (!config.oauthConfigured) throw new Error("O aplicativo da Meta ainda não foi configurado.");
  const short = await readMeta(await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, grant_type: "authorization_code", redirect_uri: config.redirectUri, code }) }));
  const longUrl = new URL("https://graph.instagram.com/access_token"); longUrl.search = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: config.appSecret, access_token: String(short.access_token) }).toString();
  const long = await readMeta(await fetch(longUrl)); const accessToken = String(long.access_token ?? ""); const expiresIn = Number(long.expires_in ?? 0);
  const profile = await graphGet("me", accessToken, { fields: "user_id,username,name,account_type,profile_picture_url,followers_count,media_count" });
  return { accessToken, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(), profile: { instagramUserId: String(profile.user_id ?? profile.id), username: String(profile.username), accountType: String(profile.account_type ?? "PROFESSIONAL"), profilePictureUrl: profile.profile_picture_url ? String(profile.profile_picture_url) : null, followersCount: Number(profile.followers_count ?? 0), mediaCount: Number(profile.media_count ?? 0) } };
}

export async function bootstrapInstagramConnection(accountId: number, owner: { id: string; email: string }) {
  const config = getInstagramConfig(); if (!config.bootstrapConfigured) throw new Error("A credencial direta do Instagram ainda não foi configurada.");
  const profile = await graphGet("me", config.bootstrapAccessToken, { fields: "user_id,username,account_type,profile_picture_url,followers_count,media_count" });
  const instagramUserId = String(profile.user_id ?? profile.id); if (instagramUserId !== config.bootstrapUserId) throw new Error("A credencial pertence a outra conta do Instagram.");
  const encrypted = await encryptInstagramToken(config.bootstrapAccessToken); const supabase = await createClient();
  const row = { owner_id: owner.id, owner_email: owner.email, account_id: accountId, instagram_user_id: instagramUserId, username: String(profile.username), account_type: String(profile.account_type ?? "PROFESSIONAL"), profile_picture_url: profile.profile_picture_url || null, token_ciphertext: encrypted.ciphertext, token_iv: encrypted.iv, token_expires_at: new Date(Date.now() + 55 * 86400000).toISOString(), status: "Conectado", followers_count: Number(profile.followers_count ?? 0), media_count: Number(profile.media_count ?? 0), updated_at: new Date().toISOString() };
  const connection = await supabase.from("instagram_connections").upsert(row, { onConflict: "account_id" }).select("*").single(); if (connection.error) throw connection.error;
  const account = await supabase.from("brand_accounts").update({ handle: `@${row.username}`, connection_status: "Conectado" }).eq("id", accountId); if (account.error) throw account.error;
  return camelize(connection.data);
}

export async function syncInstagramMetrics(accountId: number) {
  const supabase = await createClient(); const connection = await supabase.from("instagram_connections").select("*").eq("account_id", accountId).maybeSingle();
  if (connection.error) throw connection.error; if (!connection.data) throw new Error("Conecte uma conta do Instagram antes de sincronizar.");
  const token = await decryptInstagramToken(connection.data.token_ciphertext, connection.data.token_iv);
  const profile = await graphGet("me", token, { fields: "user_id,username,account_type,profile_picture_url,followers_count,media_count" });
  const mediaPayload = await graphGet(String(profile.user_id ?? profile.id) + "/media", token, { fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count", limit: "20" });
  const media = (Array.isArray(mediaPayload.data) ? mediaPayload.data : []).map((raw) => { const item = raw as Record<string, unknown>; return { owner_id: connection.data.owner_id, connection_id: connection.data.id, instagram_media_id: String(item.id), caption: String(item.caption ?? ""), media_type: String(item.media_type ?? "IMAGE"), permalink: String(item.permalink ?? ""), published_at: String(item.timestamp ?? new Date().toISOString()), likes: Number(item.like_count ?? 0), comments: Number(item.comments_count ?? 0), synced_at: new Date().toISOString() }; });
  if (media.length) { const result = await supabase.from("instagram_media").upsert(media, { onConflict: "instagram_media_id" }); if (result.error) throw result.error; }
  const updated = await supabase.from("instagram_connections").update({ username: String(profile.username ?? connection.data.username), followers_count: Number(profile.followers_count ?? connection.data.followers_count), media_count: Number(profile.media_count ?? connection.data.media_count), last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: "Conectado", last_error: null }).eq("id", connection.data.id); if (updated.error) throw updated.error;
}

export async function getInstagramConnectionStatus(accountId: number) {
  const supabase = await createClient(); const connection = await supabase.from("instagram_connections").select("id,username,account_type,profile_picture_url,token_expires_at,status,followers_count,media_count,reach_30d,views_30d,profile_views_30d,interactions_30d,last_synced_at,last_error").eq("account_id", accountId).maybeSingle();
  if (connection.error) throw connection.error; const topMedia = connection.data ? await supabase.from("instagram_media").select("*").eq("connection_id", connection.data.id).order("reach", { ascending: false }).limit(10) : { data: [], error: null };
  if (topMedia.error) throw topMedia.error; return { connection: camelize(connection.data), topMedia: camelize(topMedia.data) };
}

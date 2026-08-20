import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { brandAccounts, instagramConnections, instagramMedia } from "../../../../db/schema";

const DEFAULT_REDIRECT_URI = "https://layerflow-os.lucascarrijo-contato.chatgpt.site/api/integrations/instagram/callback";
const DEFAULT_GRAPH_VERSION = "v26.0";

type InstagramRuntimeEnv = {
  INSTAGRAM_APP_ID?: string;
  INSTAGRAM_APP_SECRET?: string;
  INSTAGRAM_TOKEN_KEY?: string;
  INSTAGRAM_BOOTSTRAP_ACCESS_TOKEN?: string;
  INSTAGRAM_BOOTSTRAP_USER_ID?: string;
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN?: string;
  INSTAGRAM_OAUTH_REDIRECT_URI?: string;
  INSTAGRAM_GRAPH_VERSION?: string;
};

type MetaResponse = {
  error?: { message?: string; code?: number; type?: string };
  [key: string]: unknown;
};

export type InstagramPublicStatus = {
  configured: boolean;
  connectionMode: "oauth" | "access_token" | null;
  redirectUri: string;
  requiredScopes: string[];
};

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
];

export function getInstagramConfig() {
  const runtime = env as unknown as InstagramRuntimeEnv;
  const appId = runtime.INSTAGRAM_APP_ID?.trim() ?? "";
  const appSecret = runtime.INSTAGRAM_APP_SECRET?.trim() ?? "";
  const tokenKey = runtime.INSTAGRAM_TOKEN_KEY?.trim() ?? "";
  const bootstrapAccessToken = runtime.INSTAGRAM_BOOTSTRAP_ACCESS_TOKEN?.trim() ?? "";
  const bootstrapUserId = runtime.INSTAGRAM_BOOTSTRAP_USER_ID?.trim() ?? "";
  const webhookVerifyToken = runtime.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
  const redirectUri = runtime.INSTAGRAM_OAUTH_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI;
  const graphVersion = runtime.INSTAGRAM_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
  const oauthConfigured = Boolean(appId && appSecret && tokenKey);
  const bootstrapConfigured = Boolean(bootstrapAccessToken && bootstrapUserId && tokenKey);

  return {
    appId,
    appSecret,
    tokenKey,
    bootstrapAccessToken,
    bootstrapUserId,
    webhookVerifyToken,
    redirectUri,
    graphVersion,
    oauthConfigured,
    bootstrapConfigured,
    configured: oauthConfigured || bootstrapConfigured,
  };
}

export function getInstagramPublicStatus(): InstagramPublicStatus {
  const config = getInstagramConfig();
  return {
    configured: config.configured,
    connectionMode: config.oauthConfigured ? "oauth" : config.bootstrapConfigured ? "access_token" : null,
    redirectUri: config.redirectUri,
    requiredScopes: INSTAGRAM_SCOPES,
  };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function tokenCryptoKey(rawKey: string) {
  const bytes = base64ToBytes(rawKey);
  if (bytes.byteLength !== 32) throw new Error("A chave de proteção dos tokens precisa ter 32 bytes.");
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptInstagramToken(token: string) {
  const { tokenKey } = getInstagramConfig();
  if (!tokenKey) throw new Error("A proteção segura dos tokens ainda não foi configurada.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await tokenCryptoKey(tokenKey);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

export async function decryptInstagramToken(ciphertext: string, encodedIv: string) {
  const { tokenKey } = getInstagramConfig();
  if (!tokenKey) throw new Error("A proteção segura dos tokens ainda não foi configurada.");
  const key = await tokenCryptoKey(tokenKey);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encodedIv) },
    key,
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}

async function readMetaResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as MetaResponse;
  if (!response.ok || payload.error) {
    const code = payload.error?.code ? ` (${payload.error.code})` : "";
    const message = payload.error?.message?.slice(0, 240) || "A Meta recusou a solicitação.";
    throw new Error(`Instagram${code}: ${message}`);
  }
  return payload;
}

async function graphGet(path: string, accessToken: string, params: Record<string, string>) {
  const { graphVersion } = getInstagramConfig();
  const url = new URL(`https://graph.instagram.com/${graphVersion}/${path.replace(/^\/+/, "")}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("access_token", accessToken);
  return readMetaResponse(await fetch(url, { headers: { accept: "application/json" } }));
}

export async function subscribeInstagramWebhooks(instagramUserId: string, accessToken: string) {
  const { graphVersion } = getInstagramConfig();
  const url = new URL(`https://graph.instagram.com/${graphVersion}/${instagramUserId}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", "comments,live_comments,messages");
  return readMetaResponse(await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
  }));
}

export async function exchangeInstagramAuthorizationCode(code: string) {
  const config = getInstagramConfig();
  if (!config.oauthConfigured) throw new Error("O aplicativo da Meta ainda não foi configurado.");

  const form = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code,
  });
  const shortTokenPayload = await readMetaResponse(await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: form,
  }));
  const shortToken = String(shortTokenPayload.access_token ?? "");
  if (!shortToken) throw new Error("O Instagram não devolveu uma autorização válida.");

  const longTokenUrl = new URL("https://graph.instagram.com/access_token");
  longTokenUrl.searchParams.set("grant_type", "ig_exchange_token");
  longTokenUrl.searchParams.set("client_secret", config.appSecret);
  longTokenUrl.searchParams.set("access_token", shortToken);
  const longTokenPayload = await readMetaResponse(await fetch(longTokenUrl, { headers: { accept: "application/json" } }));
  const accessToken = String(longTokenPayload.access_token ?? "");
  const expiresIn = Number(longTokenPayload.expires_in ?? 0);
  if (!accessToken || !expiresIn) throw new Error("O Instagram não gerou a autorização de longa duração.");

  const profile = await graphGet("me", accessToken, {
    fields: "user_id,username,name,account_type,profile_picture_url,followers_count,media_count",
  });
  const instagramUserId = String(profile.user_id ?? profile.id ?? shortTokenPayload.user_id ?? "");
  const username = String(profile.username ?? "");
  if (!instagramUserId || !username) throw new Error("Não foi possível identificar a conta profissional do Instagram.");

  return {
    accessToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    profile: {
      instagramUserId,
      username,
      name: String(profile.name ?? username),
      accountType: String(profile.account_type ?? "PROFESSIONAL"),
      profilePictureUrl: profile.profile_picture_url ? String(profile.profile_picture_url) : null,
      followersCount: Number(profile.followers_count ?? 0),
      mediaCount: Number(profile.media_count ?? 0),
    },
  };
}

export async function bootstrapInstagramConnection(accountId: number, ownerEmail: string) {
  const config = getInstagramConfig();
  if (!config.bootstrapConfigured) throw new Error("A credencial direta do Instagram ainda não foi configurada.");

  const profile = await graphGet("me", config.bootstrapAccessToken, {
    fields: "user_id,username,name,account_type,profile_picture_url,followers_count,media_count",
  });
  const instagramUserId = String(profile.user_id ?? profile.id ?? "");
  const username = String(profile.username ?? "");
  if (!instagramUserId || !username) throw new Error("Não foi possível identificar a conta profissional do Instagram.");
  if (instagramUserId !== config.bootstrapUserId) throw new Error("A credencial recebida pertence a outra conta do Instagram.");

  const encrypted = await encryptInstagramToken(config.bootstrapAccessToken);
  const now = new Date().toISOString();
  const tokenExpiresAt = new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString();
  const db = getDb();
  const [connection] = await db.insert(instagramConnections).values({
    ownerEmail,
    accountId,
    instagramUserId,
    username,
    accountType: String(profile.account_type ?? "PROFESSIONAL"),
    profilePictureUrl: profile.profile_picture_url ? String(profile.profile_picture_url) : null,
    tokenCiphertext: encrypted.ciphertext,
    tokenIv: encrypted.iv,
    tokenExpiresAt,
    status: "Conectado",
    followersCount: Number(profile.followers_count ?? 0),
    mediaCount: Number(profile.media_count ?? 0),
    lastError: null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: instagramConnections.accountId,
    set: {
      ownerEmail,
      instagramUserId,
      username,
      accountType: String(profile.account_type ?? "PROFESSIONAL"),
      profilePictureUrl: profile.profile_picture_url ? String(profile.profile_picture_url) : null,
      tokenCiphertext: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenExpiresAt,
      status: "Conectado",
      followersCount: Number(profile.followers_count ?? 0),
      mediaCount: Number(profile.media_count ?? 0),
      lastError: null,
      updatedAt: now,
    },
  }).returning();

  await db.update(brandAccounts).set({
    handle: `@${username}`,
    connectionStatus: "Conectado",
  }).where(and(eq(brandAccounts.id, accountId), eq(brandAccounts.ownerEmail, ownerEmail)));

  return connection;
}

function metricTotal(data: unknown, name: string) {
  if (!Array.isArray(data)) return 0;
  const metric = data.find((entry) => entry && typeof entry === "object" && (entry as { name?: string }).name === name) as { total_value?: { value?: number }; values?: Array<{ value?: number }> } | undefined;
  if (typeof metric?.total_value?.value === "number") return metric.total_value.value;
  return metric?.values?.reduce((sum, value) => sum + (typeof value.value === "number" ? value.value : 0), 0) ?? 0;
}

async function getMediaInsights(mediaId: string, accessToken: string) {
  const metricSets = [
    "reach,views,saved,shares,total_interactions",
    "reach,saved,shares,total_interactions",
    "reach,saved",
  ];

  for (const metric of metricSets) {
    try {
      const payload = await graphGet(`${mediaId}/insights`, accessToken, { metric });
      return {
        reach: metricTotal(payload.data, "reach"),
        views: metricTotal(payload.data, "views"),
        saves: metricTotal(payload.data, "saved"),
        shares: metricTotal(payload.data, "shares"),
        totalInteractions: metricTotal(payload.data, "total_interactions"),
      };
    } catch {
      // Formatos diferentes aceitam conjuntos diferentes; tenta o conjunto compatível seguinte.
    }
  }
  return { reach: 0, views: 0, saves: 0, shares: 0, totalInteractions: 0 };
}

async function refreshTokenIfNeeded(connection: typeof instagramConnections.$inferSelect, accessToken: string) {
  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  if (expiresAt - Date.now() > fourteenDays) return { accessToken, expiresAt: connection.tokenExpiresAt };

  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);
  const payload = await readMetaResponse(await fetch(url, { headers: { accept: "application/json" } }));
  const refreshedToken = String(payload.access_token ?? "");
  const expiresIn = Number(payload.expires_in ?? 0);
  if (!refreshedToken || !expiresIn) throw new Error("O Instagram não renovou a autorização.");
  return { accessToken: refreshedToken, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
}

export async function syncInstagramMetrics(accountId: number, ownerEmail: string) {
  const db = getDb();
  const [connection] = await db.select().from(instagramConnections).where(and(eq(instagramConnections.accountId, accountId), eq(instagramConnections.ownerEmail, ownerEmail))).limit(1);
  if (!connection) throw new Error("Conecte uma conta do Instagram antes de sincronizar.");

  try {
    const storedAccessToken = await decryptInstagramToken(connection.tokenCiphertext, connection.tokenIv);
    let accessToken = storedAccessToken;
    const refreshed = await refreshTokenIfNeeded(connection, accessToken);
    accessToken = refreshed.accessToken;

    let encryptedToken: { ciphertext: string; iv: string } | null = null;
    if (accessToken !== storedAccessToken) {
      encryptedToken = await encryptInstagramToken(accessToken);
    }

    const profile = await graphGet("me", accessToken, {
      fields: "user_id,username,name,account_type,profile_picture_url,followers_count,media_count",
    });
    const instagramUserId = String(profile.user_id ?? profile.id ?? connection.instagramUserId);

    const until = Math.floor(Date.now() / 1000);
    const since = until - 30 * 24 * 60 * 60;
    let accountInsights: MetaResponse = { data: [] };
    try {
      accountInsights = await graphGet(`${instagramUserId}/insights`, accessToken, {
        metric: "reach,views,profile_views,total_interactions",
        period: "day",
        since: String(since),
        until: String(until),
      });
    } catch {
      // Perfil e mídia continuam sendo sincronizados quando uma métrica não está disponível.
    }

    const mediaPayload = await graphGet(`${instagramUserId}/media`, accessToken, {
      fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count",
      limit: "20",
    });
    const mediaItems = Array.isArray(mediaPayload.data) ? mediaPayload.data.slice(0, 20) : [];

    for (const rawItem of mediaItems) {
      const item = rawItem as Record<string, unknown>;
      const mediaId = String(item.id ?? "");
      if (!mediaId) continue;
      const insights = await getMediaInsights(mediaId, accessToken);
      await db.insert(instagramMedia).values({
        connectionId: connection.id,
        instagramMediaId: mediaId,
        caption: String(item.caption ?? ""),
        mediaType: String(item.media_type ?? "IMAGE"),
        permalink: String(item.permalink ?? ""),
        publishedAt: String(item.timestamp ?? new Date().toISOString()),
        reach: insights.reach,
        views: insights.views,
        likes: Number(item.like_count ?? 0),
        comments: Number(item.comments_count ?? 0),
        saves: insights.saves,
        shares: insights.shares,
        totalInteractions: insights.totalInteractions,
        syncedAt: new Date().toISOString(),
      }).onConflictDoUpdate({
        target: instagramMedia.instagramMediaId,
        set: {
          connectionId: connection.id,
          caption: String(item.caption ?? ""),
          mediaType: String(item.media_type ?? "IMAGE"),
          permalink: String(item.permalink ?? ""),
          publishedAt: String(item.timestamp ?? new Date().toISOString()),
          reach: insights.reach,
          views: insights.views,
          likes: Number(item.like_count ?? 0),
          comments: Number(item.comments_count ?? 0),
          saves: insights.saves,
          shares: insights.shares,
          totalInteractions: insights.totalInteractions,
          syncedAt: new Date().toISOString(),
        },
      });
    }

    const tokenUpdate = encryptedToken ? { tokenCiphertext: encryptedToken.ciphertext, tokenIv: encryptedToken.iv } : {};
    const [updated] = await db.update(instagramConnections).set({
      ...tokenUpdate,
      tokenExpiresAt: refreshed.expiresAt,
      instagramUserId,
      username: String(profile.username ?? connection.username),
      accountType: String(profile.account_type ?? connection.accountType),
      profilePictureUrl: profile.profile_picture_url ? String(profile.profile_picture_url) : connection.profilePictureUrl,
      followersCount: Number(profile.followers_count ?? connection.followersCount),
      mediaCount: Number(profile.media_count ?? connection.mediaCount),
      reach30d: metricTotal(accountInsights.data, "reach"),
      views30d: metricTotal(accountInsights.data, "views"),
      profileViews30d: metricTotal(accountInsights.data, "profile_views"),
      interactions30d: metricTotal(accountInsights.data, "total_interactions"),
      status: "Conectado",
      lastError: null,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(instagramConnections.id, connection.id)).returning();

    const topMedia = await db.select().from(instagramMedia).where(eq(instagramMedia.connectionId, connection.id)).orderBy(desc(instagramMedia.reach), desc(instagramMedia.views)).limit(10);
    return { connection: updated, topMedia };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível sincronizar o Instagram.";
    await db.update(instagramConnections).set({ status: "Atenção", lastError: message, updatedAt: new Date().toISOString() }).where(eq(instagramConnections.id, connection.id));
    throw error;
  }
}

export async function getInstagramConnectionStatus(accountId: number, ownerEmail: string) {
  const db = getDb();
  const [connection] = await db.select({
    id: instagramConnections.id,
    username: instagramConnections.username,
    accountType: instagramConnections.accountType,
    profilePictureUrl: instagramConnections.profilePictureUrl,
    tokenExpiresAt: instagramConnections.tokenExpiresAt,
    status: instagramConnections.status,
    followersCount: instagramConnections.followersCount,
    mediaCount: instagramConnections.mediaCount,
    reach30d: instagramConnections.reach30d,
    views30d: instagramConnections.views30d,
    profileViews30d: instagramConnections.profileViews30d,
    interactions30d: instagramConnections.interactions30d,
    lastSyncedAt: instagramConnections.lastSyncedAt,
    lastError: instagramConnections.lastError,
  }).from(instagramConnections).where(and(eq(instagramConnections.accountId, accountId), eq(instagramConnections.ownerEmail, ownerEmail))).limit(1);

  const topMedia = connection ? await db.select().from(instagramMedia).where(eq(instagramMedia.connectionId, connection.id)).orderBy(desc(instagramMedia.reach), desc(instagramMedia.views)).limit(10) : [];
  return { connection: connection ?? null, topMedia };
}

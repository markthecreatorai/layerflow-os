import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { automationEvents, automationFunnels, instagramConnections, libraryAssets } from "../../../db/schema";
import { decryptInstagramToken, getInstagramConfig } from "../integrations/instagram/_server";

const DEFAULT_ORIGIN = "https://layerflow-os.lucascarrijo-contato.chatgpt.site";

type WebhookValue = {
  id?: string;
  from?: { id?: string; username?: string };
  text?: string;
  media?: { id?: string; media_product_type?: string };
};

type WebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    field?: string;
    value?: WebhookValue;
    changes?: Array<{ field?: string; value?: WebhookValue }>;
  }>;
};

function parseList(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String).map((item) => item.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function replaceVariables(value: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((result, [key, replacement]) => result.replaceAll(`{{${key}}}`, replacement), value);
}

function bytesFromHex(value: string) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2) return new Uint8Array();
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

export async function verifyMetaSignature(body: ArrayBuffer, signatureHeader: string | null) {
  const { appSecret } = getInstagramConfig();
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const signature = bytesFromHex(signatureHeader.slice(7));
  if (!signature.byteLength) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, signature, body);
}

export function getAutomationReadiness(connectionExists: boolean) {
  const config = getInstagramConfig();
  const webhookUrl = `${DEFAULT_ORIGIN}/api/automations/webhook`;
  const webhookConfigured = Boolean(config.webhookVerifyToken && config.appSecret);
  return {
    connected: connectionExists,
    liveReady: Boolean(connectionExists && config.oauthConfigured && webhookConfigured),
    mode: connectionExists && config.oauthConfigured && webhookConfigured ? "live" : "test",
    webhookConfigured,
    webhookUrl,
    webhookVerifyToken: config.webhookVerifyToken || null,
    requiredScopes: [
      "instagram_business_basic",
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
    ],
  };
}

async function readMetaResponse(response: Response) {
  const payload = await response.json().catch(() => ({})) as { error?: { message?: string; code?: number }; id?: string; message_id?: string };
  if (!response.ok || payload.error) {
    const code = payload.error?.code ? ` (${payload.error.code})` : "";
    throw new Error(`Instagram${code}: ${payload.error?.message?.slice(0, 220) || "não concluiu o envio"}.`);
  }
  return payload;
}

async function graphPost(path: string, accessToken: string, body: Record<string, unknown>) {
  const { graphVersion } = getInstagramConfig();
  return readMetaResponse(await fetch(`https://graph.instagram.com/${graphVersion}/${path.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  }));
}

function findMatch(funnel: typeof automationFunnels.$inferSelect, commentText: string) {
  if (funnel.triggerType === "any_comment") return "qualquer comentário";
  const normalizedComment = normalize(commentText);
  const keywords = parseList(funnel.keywords);
  return keywords.find((keyword) => funnel.matchType === "exact" ? normalizedComment === normalize(keyword) : normalizedComment.includes(normalize(keyword))) ?? null;
}

function isBlocked(funnel: typeof automationFunnels.$inferSelect, username: string, commentText: string) {
  const normalizedUser = normalize(username.replace(/^@/, ""));
  if (parseList(funnel.blockedUsers).some((item) => normalize(item.replace(/^@/, "")) === normalizedUser)) return true;
  const normalizedComment = normalize(commentText);
  return parseList(funnel.blockedWords).some((item) => normalizedComment.includes(normalize(item)));
}

async function processComment(connection: typeof instagramConnections.$inferSelect, value: WebhookValue) {
  const commentId = String(value.id ?? "");
  const mediaId = String(value.media?.id ?? "");
  const username = String(value.from?.username ?? "instagram_user");
  const instagramUserId = value.from?.id ? String(value.from.id) : null;
  const commentText = String(value.text ?? "");
  if (!commentId || !commentText) return;

  const db = getDb();
  const [existing] = await db.select({ id: automationEvents.id }).from(automationEvents).where(eq(automationEvents.instagramCommentId, commentId)).limit(1);
  if (existing) return;

  const funnels = await db.select().from(automationFunnels).where(and(
    eq(automationFunnels.accountId, connection.accountId),
    eq(automationFunnels.ownerEmail, connection.ownerEmail),
    eq(automationFunnels.status, "Ativa"),
  )).orderBy(desc(automationFunnels.createdAt));

  const candidates = funnels
    .filter((funnel) => (!funnel.mediaId || funnel.mediaId === mediaId) && !(funnel.ignoreOwnComments && normalize(username) === normalize(connection.username)) && !isBlocked(funnel, username, commentText))
    .map((funnel) => ({ funnel, keyword: findMatch(funnel, commentText) }))
    .filter((candidate): candidate is { funnel: typeof automationFunnels.$inferSelect; keyword: string } => Boolean(candidate.keyword))
    .sort((a, b) => Number(Boolean(b.funnel.mediaId)) - Number(Boolean(a.funnel.mediaId)) || Number(b.funnel.matchType === "exact") - Number(a.funnel.matchType === "exact"));

  const candidate = candidates[0];
  if (!candidate) return;
  const { funnel, keyword } = candidate;

  const cooldownStart = new Date(Date.now() - Math.max(0, funnel.cooldownHours) * 60 * 60 * 1000).toISOString();
  const [recent] = await db.select({ id: automationEvents.id }).from(automationEvents).where(and(
    eq(automationEvents.automationId, funnel.id),
    eq(automationEvents.username, username),
    gt(automationEvents.createdAt, cooldownStart),
  )).limit(1);

  const trackingToken = crypto.randomUUID().replaceAll("-", "");
  const [asset] = funnel.assetId ? await db.select().from(libraryAssets).where(and(eq(libraryAssets.id, funnel.assetId), eq(libraryAssets.accountId, funnel.accountId))).limit(1) : [];
  const destinationUrl = asset ? null : funnel.dmLink;
  const [event] = await db.insert(automationEvents).values({
    automationId: funnel.id,
    connectionId: connection.id,
    instagramCommentId: commentId,
    instagramMediaId: mediaId || null,
    instagramUserId,
    username,
    commentText,
    matchedKeyword: keyword,
    assetId: asset?.id ?? null,
    destinationUrl,
    trackingToken,
    status: recent ? "Ignorado" : "Processando",
    error: recent ? `Limite de ${funnel.cooldownHours}h ainda ativo para este usuário.` : null,
  }).returning();
  if (recent) return;

  const scripts = parseList(funnel.replyScripts);
  const scriptIndex = funnel.replyMode === "sequential" ? funnel.repliesSent % Math.max(1, scripts.length) : Math.floor(Math.random() * Math.max(1, scripts.length));
  const firstName = username.split(/[._-]/)[0] || username;
  const trackedUrl = (asset || destinationUrl) ? `${DEFAULT_ORIGIN}/api/automations/click/${event.id}/${trackingToken}` : "";
  const variables = { first_name: firstName, username, keyword, lead_magnet_title: asset?.title ?? "material", link: trackedUrl };
  const publicReply = scripts.length ? replaceVariables(scripts[scriptIndex], variables) : "Acabei de te enviar no direct!";
  let dmMessage = replaceVariables(funnel.dmMessage, variables).trim();
  if (trackedUrl && !dmMessage.includes(trackedUrl)) dmMessage = `${dmMessage}\n\n${funnel.dmButtonLabel || "Acessar"}: ${trackedUrl}`.trim();

  let metaReplyId: string | null = null;
  let metaMessageId: string | null = null;
  let publicReplySent = false;
  let dmSent = false;
  const errors: string[] = [];

  try {
    const accessToken = await decryptInstagramToken(connection.tokenCiphertext, connection.tokenIv);
    if (funnel.publicReplyEnabled) {
      try {
        const result = await graphPost(`${commentId}/replies`, accessToken, { message: publicReply });
        metaReplyId = result.id ? String(result.id) : null;
        publicReplySent = true;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "A resposta pública falhou.");
      }
    }
    try {
      const result = await graphPost(`${connection.instagramUserId}/messages`, accessToken, {
        recipient: { comment_id: commentId },
        message: { text: dmMessage },
      });
      metaMessageId = result.message_id ? String(result.message_id) : null;
      dmSent = true;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "A mensagem privada falhou.");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "A autorização do Instagram não pôde ser usada.");
  }

  const status = errors.length === 0 ? "Entregue" : (publicReplySent || dmSent) ? "Parcial" : "Erro";
  const now = new Date().toISOString();
  await db.update(automationEvents).set({
    publicReply: funnel.publicReplyEnabled ? publicReply : null,
    dmMessage,
    metaReplyId,
    metaMessageId,
    status,
    error: errors.join(" ") || null,
    processedAt: now,
  }).where(eq(automationEvents.id, event.id));
  await db.update(automationFunnels).set({
    commentsCount: sql`${automationFunnels.commentsCount} + 1`,
    repliesSent: sql`${automationFunnels.repliesSent} + ${publicReplySent ? 1 : 0}`,
    dmsSent: sql`${automationFunnels.dmsSent} + ${dmSent ? 1 : 0}`,
    leads: sql`${automationFunnels.leads} + ${dmSent ? 1 : 0}`,
    lastRunAt: now,
    updatedAt: now,
  }).where(eq(automationFunnels.id, funnel.id));
}

export async function processInstagramWebhook(payload: WebhookPayload) {
  if (payload.object !== "instagram" || !Array.isArray(payload.entry)) return;
  const db = getDb();
  for (const entry of payload.entry) {
    const changes = entry.changes?.length ? entry.changes : [{ field: entry.field, value: entry.value }];
    for (const change of changes) {
      if (!change.value || !["comments", "live_comments"].includes(String(change.field))) continue;
      const [connection] = await db.select().from(instagramConnections).where(eq(instagramConnections.instagramUserId, String(entry.id ?? ""))).limit(1);
      if (connection) await processComment(connection, change.value);
    }
  }
}

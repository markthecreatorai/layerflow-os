import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { automationEvents, automationFunnels, instagramConnections, instagramMedia, libraryAssets } from "../../../db/schema";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../_auth";
import { getAutomationReadiness } from "./_server";

type AutomationInput = {
  id?: number;
  action?: "duplicate";
  accountId?: number;
  name?: string;
  templateType?: string;
  status?: string;
  triggerType?: string;
  mediaId?: string | null;
  mediaLabel?: string | null;
  matchType?: string;
  keywords?: string[];
  publicReplyEnabled?: boolean;
  replyMode?: string;
  replyScripts?: string[];
  dmMessage?: string;
  dmButtonLabel?: string;
  dmLink?: string | null;
  assetId?: number | null;
  cooldownHours?: number;
  ignoreOwnComments?: boolean;
  blockedWords?: string[];
  blockedUsers?: string[];
};

function cleanList(values?: string[]) {
  return [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))].slice(0, 30);
}

async function accountConnection(accountId: number, ownerEmail: string) {
  const [connection] = await getDb().select().from(instagramConnections).where(and(eq(instagramConnections.accountId, accountId), eq(instagramConnections.ownerEmail, ownerEmail))).limit(1);
  return connection ?? null;
}

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isAuthResponse(auth)) return auth;
  const accountId = Number(new URL(request.url).searchParams.get("accountId"));
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();

  const db = getDb();
  const connection = await accountConnection(accountId, auth.email);
  const [funnels, events, assets, media] = await Promise.all([
    db.select().from(automationFunnels).where(and(eq(automationFunnels.accountId, accountId), eq(automationFunnels.ownerEmail, auth.email))).orderBy(desc(automationFunnels.updatedAt)),
    db.select().from(automationEvents).innerJoin(automationFunnels, eq(automationEvents.automationId, automationFunnels.id)).where(and(eq(automationFunnels.accountId, accountId), eq(automationFunnels.ownerEmail, auth.email))).orderBy(desc(automationEvents.createdAt)).limit(30),
    db.select({ id: libraryAssets.id, title: libraryAssets.title, format: libraryAssets.format, status: libraryAssets.status }).from(libraryAssets).where(and(eq(libraryAssets.accountId, accountId), eq(libraryAssets.category, "Isca digital"))).orderBy(desc(libraryAssets.createdAt)),
    connection ? db.select({ id: instagramMedia.instagramMediaId, caption: instagramMedia.caption, mediaType: instagramMedia.mediaType, permalink: instagramMedia.permalink, publishedAt: instagramMedia.publishedAt }).from(instagramMedia).where(eq(instagramMedia.connectionId, connection.id)).orderBy(desc(instagramMedia.publishedAt)).limit(30) : Promise.resolve([]),
  ]);

  return Response.json({
    automations: funnels,
    events: events.map((row) => ({ ...row.automation_events, automationName: row.automation_funnels.name })),
    assets,
    media,
    instagram: connection ? { username: connection.username, status: connection.status } : null,
    readiness: getAutomationReadiness(Boolean(connection)),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isAuthResponse(auth)) return auth;
  const payload = await request.json().catch(() => ({})) as AutomationInput;
  const accountId = Number(payload.accountId);
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();

  const name = String(payload.name ?? "").trim();
  const keywords = cleanList(payload.keywords);
  const replyScripts = cleanList(payload.replyScripts);
  const dmMessage = String(payload.dmMessage ?? "").trim();
  if (!name || !dmMessage) return Response.json({ error: "Dê um nome à automação e escreva a mensagem privada." }, { status: 400 });
  if (payload.triggerType !== "any_comment" && keywords.length === 0) return Response.json({ error: "Adicione pelo menos uma palavra-chave." }, { status: 400 });
  if (payload.publicReplyEnabled !== false && replyScripts.length === 0) return Response.json({ error: "Adicione pelo menos uma resposta pública." }, { status: 400 });

  const connection = await accountConnection(accountId, auth.email);
  const readiness = getAutomationReadiness(Boolean(connection));
  const requestedStatus = payload.status === "Ativa" ? "Ativa" : "Rascunho";
  const status = requestedStatus === "Ativa" && !readiness.liveReady ? "Teste" : requestedStatus;
  const now = new Date().toISOString();
  const [automation] = await getDb().insert(automationFunnels).values({
    ownerEmail: auth.email,
    accountId,
    name,
    templateType: String(payload.templateType ?? "lead_magnet"),
    status,
    triggerType: payload.triggerType === "any_comment" ? "any_comment" : "keywords",
    mediaId: payload.mediaId || null,
    mediaLabel: payload.mediaLabel || null,
    matchType: payload.matchType === "exact" ? "exact" : "contains",
    keywords: JSON.stringify(keywords),
    publicReplyEnabled: payload.publicReplyEnabled !== false,
    replyMode: payload.replyMode === "sequential" ? "sequential" : "random",
    replyScripts: JSON.stringify(replyScripts),
    dmMessage,
    dmButtonLabel: String(payload.dmButtonLabel ?? "Acessar material").trim().slice(0, 40),
    dmLink: payload.dmLink ? String(payload.dmLink).trim() : null,
    assetId: payload.assetId ? Number(payload.assetId) : null,
    cooldownHours: Math.max(0, Math.min(720, Number(payload.cooldownHours ?? 24))),
    ignoreOwnComments: payload.ignoreOwnComments !== false,
    blockedWords: JSON.stringify(cleanList(payload.blockedWords)),
    blockedUsers: JSON.stringify(cleanList(payload.blockedUsers)),
    updatedAt: now,
  }).returning();
  return Response.json({ automation, mode: readiness.mode }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (isAuthResponse(auth)) return auth;
  const payload = await request.json().catch(() => ({})) as AutomationInput;
  const id = Number(payload.id);
  const db = getDb();
  const [current] = await db.select().from(automationFunnels).where(and(eq(automationFunnels.id, id), eq(automationFunnels.ownerEmail, auth.email))).limit(1);
  if (!current || !(await userOwnsAccount(current.accountId, auth.email))) return forbiddenAccount();

  if (payload.action === "duplicate") {
    const [automation] = await db.insert(automationFunnels).values({ ...current, id: undefined, createdAt: undefined, name: `${current.name} — cópia`, status: "Rascunho", updatedAt: new Date().toISOString() }).returning();
    return Response.json({ automation });
  }

  const connection = await accountConnection(current.accountId, auth.email);
  const readiness = getAutomationReadiness(Boolean(connection));
  const requestedStatus = payload.status;
  const status = requestedStatus === "Ativa" && !readiness.liveReady ? "Teste" : requestedStatus;
  const [automation] = await db.update(automationFunnels).set({
    ...(status ? { status } : {}),
    ...(payload.name ? { name: payload.name.trim() } : {}),
    ...(payload.templateType ? { templateType: payload.templateType } : {}),
    ...(payload.triggerType ? { triggerType: payload.triggerType === "any_comment" ? "any_comment" : "keywords" } : {}),
    ...(payload.mediaId !== undefined ? { mediaId: payload.mediaId || null } : {}),
    ...(payload.mediaLabel !== undefined ? { mediaLabel: payload.mediaLabel || null } : {}),
    ...(payload.matchType ? { matchType: payload.matchType === "exact" ? "exact" : "contains" } : {}),
    ...(payload.keywords ? { keywords: JSON.stringify(cleanList(payload.keywords)) } : {}),
    ...(typeof payload.publicReplyEnabled === "boolean" ? { publicReplyEnabled: payload.publicReplyEnabled } : {}),
    ...(payload.replyMode ? { replyMode: payload.replyMode === "sequential" ? "sequential" : "random" } : {}),
    ...(payload.replyScripts ? { replyScripts: JSON.stringify(cleanList(payload.replyScripts)) } : {}),
    ...(payload.dmMessage !== undefined ? { dmMessage: payload.dmMessage.trim() } : {}),
    ...(payload.dmButtonLabel !== undefined ? { dmButtonLabel: payload.dmButtonLabel.trim().slice(0, 40) } : {}),
    ...(payload.dmLink !== undefined ? { dmLink: payload.dmLink || null } : {}),
    ...(payload.assetId !== undefined ? { assetId: payload.assetId ? Number(payload.assetId) : null } : {}),
    ...(payload.cooldownHours !== undefined ? { cooldownHours: Math.max(0, Math.min(720, Number(payload.cooldownHours))) } : {}),
    ...(typeof payload.ignoreOwnComments === "boolean" ? { ignoreOwnComments: payload.ignoreOwnComments } : {}),
    ...(payload.blockedWords ? { blockedWords: JSON.stringify(cleanList(payload.blockedWords)) } : {}),
    ...(payload.blockedUsers ? { blockedUsers: JSON.stringify(cleanList(payload.blockedUsers)) } : {}),
    updatedAt: new Date().toISOString(),
  }).where(and(eq(automationFunnels.id, id), eq(automationFunnels.ownerEmail, auth.email))).returning();
  return Response.json({ automation, mode: readiness.mode });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (isAuthResponse(auth)) return auth;
  const payload = await request.json().catch(() => ({})) as AutomationInput;
  const id = Number(payload.id);
  const db = getDb();
  const [current] = await db.select().from(automationFunnels).where(and(eq(automationFunnels.id, id), eq(automationFunnels.ownerEmail, auth.email))).limit(1);
  if (!current || !(await userOwnsAccount(current.accountId, auth.email))) return forbiddenAccount();
  await db.delete(automationEvents).where(eq(automationEvents.automationId, id));
  await db.delete(automationFunnels).where(and(eq(automationFunnels.id, id), eq(automationFunnels.ownerEmail, auth.email)));
  return Response.json({ deleted: true });
}

import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { automationFunnels, libraryAssets } from "../../../../db/schema";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../../_auth";

type TestInput = {
  id?: number;
  accountId?: number;
  keyword?: string;
  replyScripts?: string[];
  dmMessage?: string;
  dmButtonLabel?: string;
  dmLink?: string;
  assetId?: number | null;
};

function list(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
}

function fill(value: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((result, [key, replacement]) => result.replaceAll(`{{${key}}}`, replacement), value);
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isAuthResponse(auth)) return auth;
  const payload = await request.json().catch(() => ({})) as TestInput;
  const accountId = Number(payload.accountId);
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();

  let replyScripts = payload.replyScripts ?? [];
  let dmMessage = payload.dmMessage ?? "";
  let dmButtonLabel = payload.dmButtonLabel ?? "Acessar material";
  let dmLink = payload.dmLink ?? "";
  let assetId = payload.assetId ?? null;

  if (payload.id) {
    const [automation] = await getDb().select().from(automationFunnels).where(and(eq(automationFunnels.id, Number(payload.id)), eq(automationFunnels.ownerEmail, auth.email), eq(automationFunnels.accountId, accountId))).limit(1);
    if (!automation) return Response.json({ error: "Automação não encontrada." }, { status: 404 });
    replyScripts = list(automation.replyScripts);
    dmMessage = automation.dmMessage;
    dmButtonLabel = automation.dmButtonLabel;
    dmLink = automation.dmLink ?? "";
    assetId = automation.assetId;
  }

  const [asset] = assetId ? await getDb().select({ title: libraryAssets.title }).from(libraryAssets).where(and(eq(libraryAssets.id, assetId), eq(libraryAssets.accountId, accountId))).limit(1) : [];
  const keyword = payload.keyword || "GUIA";
  const variables = {
    first_name: "Lucas",
    username: "lucas.criativo",
    keyword,
    lead_magnet_title: asset?.title ?? "material gratuito",
    link: dmLink || "https://seulink.com/material",
  };
  const publicReply = fill(replyScripts[0] || "Acabei de te enviar no direct, {{first_name}}!", variables);
  let directMessage = fill(dmMessage || "Oi, {{first_name}}! Aqui está o material que você pediu: {{link}}", variables);
  if (variables.link && !directMessage.includes(variables.link)) directMessage = `${directMessage}\n\n${dmButtonLabel}: ${variables.link}`;
  return Response.json({ simulated: true, publicReply, directMessage, keyword, recipient: "@lucas.criativo" });
}

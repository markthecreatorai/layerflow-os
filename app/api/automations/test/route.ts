import { createClient } from "../../../../lib/supabase/server";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../../_auth";

const list = (value: string) => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; } };
const fill = (value: string, vars: Record<string, string>) => Object.entries(vars).reduce((text, [key, replacement]) => text.replaceAll(`{{${key}}}`, replacement), value);

export async function POST(request: Request) {
  const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>; const accountId = Number(payload.accountId);
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
  const supabase = await createClient(); let automation: Record<string, unknown> | null = null;
  if (payload.id) { const result = await supabase.from("automation_funnels").select("*").eq("id", Number(payload.id)).eq("account_id", accountId).maybeSingle(); if (result.error) throw result.error; automation = result.data; }
  const assetId = automation?.asset_id ?? payload.assetId; const asset = assetId ? await supabase.from("library_assets").select("title").eq("id", Number(assetId)).maybeSingle() : { data: null, error: null };
  if (asset.error) throw asset.error;
  const keyword = String(payload.keyword || "GUIA"); const dmLink = String(automation?.dm_link ?? payload.dmLink ?? "");
  const variables = { first_name: "Lucas", username: "lucas.criativo", keyword, lead_magnet_title: asset.data?.title ?? "material gratuito", link: dmLink || "https://seulink.com/material" };
  const scripts = automation ? list(String(automation.reply_scripts ?? "[]")) : (Array.isArray(payload.replyScripts) ? payload.replyScripts.map(String) : []);
  const publicReply = fill(scripts[0] || "Acabei de te enviar no direct, {{first_name}}!", variables);
  let directMessage = fill(String(automation?.dm_message ?? payload.dmMessage ?? "Oi, {{first_name}}! Aqui está o material: {{link}}"), variables);
  const label = String(automation?.dm_button_label ?? payload.dmButtonLabel ?? "Acessar material");
  if (variables.link && !directMessage.includes(variables.link)) directMessage += `\n\n${label}: ${variables.link}`;
  return Response.json({ simulated: true, publicReply, directMessage, keyword, recipient: "@lucas.criativo" });
}

import { createClient } from "../../../lib/supabase/server";
import { camelize } from "../../../lib/supabase/rows";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../_auth";
import { getAutomationReadiness } from "./_server";

type Input = Record<string, unknown> & { id?: number; action?: string; accountId?: number };
type JoinedEvent = Record<string, unknown> & { automation_funnels?: { name?: string } | null };
const cleanList = (values: unknown) => [...new Set((Array.isArray(values) ? values : []).map(String).map((v) => v.trim()).filter(Boolean))].slice(0, 30);
const listJson = (value: unknown) => JSON.stringify(cleanList(value));

async function connectionFor(accountId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("instagram_connections").select("*").eq("account_id", accountId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
  const accountId = Number(new URL(request.url).searchParams.get("accountId"));
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
  const supabase = await createClient(); const connection = await connectionFor(accountId);
  const [funnels, assets, media] = await Promise.all([
    supabase.from("automation_funnels").select("*").eq("account_id", accountId).order("updated_at", { ascending: false }),
    supabase.from("library_assets").select("id,title,format,status").eq("account_id", accountId).eq("category", "Isca digital").order("created_at", { ascending: false }),
    connection ? supabase.from("instagram_media").select("instagram_media_id,caption,media_type,permalink,published_at").eq("connection_id", connection.id).order("published_at", { ascending: false }).limit(30) : Promise.resolve({ data: [], error: null }),
  ]);
  if (funnels.error) throw funnels.error; if (assets.error) throw assets.error; if (media.error) throw media.error;
  const ids = (funnels.data ?? []).map((item) => item.id);
  const events = ids.length ? await supabase.from("automation_events").select("*,automation_funnels(name)").in("automation_id", ids).order("created_at", { ascending: false }).limit(30) : { data: [], error: null };
  if (events.error) throw events.error;
  return Response.json({ automations: camelize(funnels.data), events: camelize((events.data ?? []).map((raw) => { const event = raw as JoinedEvent; return { ...event, automation_name: event.automation_funnels?.name, automation_funnels: undefined }; })), assets: camelize(assets.data), media: camelize((media.data ?? []).map((item: Record<string, unknown>) => ({ ...item, id: item.instagram_media_id }))), instagram: connection ? { username: connection.username, status: connection.status } : null, readiness: getAutomationReadiness(Boolean(connection)) });
}

function values(payload: Input, auth: { id: string; email: string }, accountId: number, status: string) {
  return { owner_id: auth.id, owner_email: auth.email, account_id: accountId, name: String(payload.name ?? "").trim(), template_type: String(payload.templateType ?? "lead_magnet"), status, trigger_type: payload.triggerType === "any_comment" ? "any_comment" : "keywords", media_id: payload.mediaId || null, media_label: payload.mediaLabel || null, match_type: payload.matchType === "exact" ? "exact" : "contains", keywords: listJson(payload.keywords), public_reply_enabled: payload.publicReplyEnabled !== false, reply_mode: payload.replyMode === "sequential" ? "sequential" : "random", reply_scripts: listJson(payload.replyScripts), dm_message: String(payload.dmMessage ?? "").trim(), dm_button_label: String(payload.dmButtonLabel ?? "Acessar material").trim().slice(0, 40), dm_link: payload.dmLink ? String(payload.dmLink).trim() : null, asset_id: payload.assetId ? Number(payload.assetId) : null, cooldown_hours: Math.max(0, Math.min(720, Number(payload.cooldownHours ?? 24))), ignore_own_comments: payload.ignoreOwnComments !== false, blocked_words: listJson(payload.blockedWords), blocked_users: listJson(payload.blockedUsers), updated_at: new Date().toISOString() };
}

export async function POST(request: Request) {
  const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
  const payload = await request.json().catch(() => ({})) as Input; const accountId = Number(payload.accountId);
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
  if (!String(payload.name ?? "").trim() || !String(payload.dmMessage ?? "").trim()) return Response.json({ error: "Dê um nome à automação e escreva a mensagem privada." }, { status: 400 });
  const readiness = getAutomationReadiness(Boolean(await connectionFor(accountId)));
  const status = payload.status === "Ativa" && readiness.liveReady ? "Ativa" : payload.status === "Ativa" ? "Teste" : "Rascunho";
  const supabase = await createClient(); const result = await supabase.from("automation_funnels").insert(values(payload, auth, accountId, status)).select("*").single();
  if (result.error) throw result.error;
  return Response.json({ automation: camelize(result.data), mode: readiness.mode }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
  const payload = await request.json().catch(() => ({})) as Input; const supabase = await createClient();
  const current = await supabase.from("automation_funnels").select("*").eq("id", Number(payload.id)).maybeSingle();
  if (current.error) throw current.error; if (!current.data) return forbiddenAccount();
  if (!(await userOwnsAccount(current.data.account_id, auth.email))) return forbiddenAccount();
  if (payload.action === "duplicate") {
    const copy = { ...current.data };
    delete copy.id;
    delete copy.created_at;
    const duplicated = await supabase.from("automation_funnels").insert({ ...copy, name: `${copy.name} — cópia`, status: "Rascunho", updated_at: new Date().toISOString() }).select("*").single();
    if (duplicated.error) throw duplicated.error; return Response.json({ automation: camelize(duplicated.data) });
  }
  const readiness = getAutomationReadiness(Boolean(await connectionFor(current.data.account_id)));
  const next = values({ ...camelize(current.data), ...payload }, auth, current.data.account_id, payload.status === "Ativa" && !readiness.liveReady ? "Teste" : String(payload.status ?? current.data.status));
  const updated = await supabase.from("automation_funnels").update(next).eq("id", current.data.id).select("*").single();
  if (updated.error) throw updated.error; return Response.json({ automation: camelize(updated.data), mode: readiness.mode });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
  const payload = await request.json().catch(() => ({})) as Input; const supabase = await createClient();
  const result = await supabase.from("automation_funnels").delete().eq("id", Number(payload.id)).select("id").maybeSingle();
  if (result.error) throw result.error; if (!result.data) return forbiddenAccount();
  return Response.json({ deleted: true });
}

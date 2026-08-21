import { createClient } from "../../../lib/supabase/server";
import { camelize } from "../../../lib/supabase/rows";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../_auth";

const initialContent = [
  { title: "Você não está sem ideia, só está olhando pro lugar errado", kind: "Reel", status: "Produção", platform: "Instagram", pillar: "Criação", hook: "Você não está sem ideia. Está procurando no lugar errado.", scheduled_at: "2026-08-20T18:30:00-03:00" },
  { title: "Criatividade não perdeu valor depois da IA", kind: "Carrossel", status: "Revisão", platform: "Instagram", pillar: "Renascentismo 2.0", hook: "A IA não matou a criatividade. Só deixou o trabalho mediano mais fácil de reconhecer.", scheduled_at: "2026-08-21T12:00:00-03:00" },
  { title: "O sistema que transforma uma ideia em uma semana de conteúdo", kind: "Newsletter", status: "Roteiro", platform: "Substack", pillar: "Sistemas", hook: "O problema não é ter poucas ideias. É abandonar cada uma antes de explorar o que ela carrega.", scheduled_at: "2026-08-22T09:00:00-03:00" },
  { title: "Por que um bom portfólio não traz clientes sozinho", kind: "Thread", status: "Ideia", platform: "X", pillar: "Monetização", hook: "Seu portfólio prova que você sabe fazer. Não prova que alguém deveria comprar agora." },
  { title: "Criar conteúdo virou uma forma elegante de procrastinar", kind: "Reel", status: "Agendado", platform: "Instagram", pillar: "Criação", hook: "Criar conteúdo também pode ser procrastinação.", scheduled_at: "2026-08-23T19:00:00-03:00" },
  { title: "Você não precisa de mais seguidores para vender conhecimento", kind: "Carrossel", status: "Publicado", platform: "Instagram", pillar: "Monetização", hook: "Você não precisa de uma audiência maior. Precisa de uma oferta mais nítida.", published_at: "2026-08-16T12:00:00-03:00", reach: 18240, saves: 612, comments: 84 },
];

async function seedIfEmpty(accountId: number, ownerId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase.from("content_items").select("id", { count: "exact", head: true }).eq("account_id", accountId);
  if (error) throw error;
  if (!count) {
    const seeded = await supabase.from("content_items").insert(initialContent.map((item) => ({ ...item, owner_id: ownerId, account_id: accountId })));
    if (seeded.error) throw seeded.error;
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
    const accountId = Number(new URL(request.url).searchParams.get("accountId"));
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    await seedIfEmpty(accountId, auth.id);
    const supabase = await createClient();
    const { data, error } = await supabase.from("content_items").select("*").eq("account_id", accountId).order("created_at", { ascending: false }).order("id", { ascending: false });
    if (error) throw error;
    return Response.json({ items: camelize(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os conteúdos.";
    console.error(JSON.stringify({ level: "error", route: "/api/content", method: "GET", message }));
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
    const payload = await request.json() as Record<string, unknown>;
    const title = String(payload.title ?? "").trim(); const accountId = Number(payload.accountId);
    if (!title) return Response.json({ error: "O título é obrigatório." }, { status: 400 });
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    const supabase = await createClient();
    const { data, error } = await supabase.from("content_items").insert({ owner_id: auth.id, account_id: accountId, title, kind: payload.kind ?? "Ideia", status: payload.status ?? "Ideia", platform: payload.platform ?? "Instagram", pillar: payload.pillar ?? "Criatividade", hook: payload.hook ?? "", body: payload.body ?? "", scheduled_at: payload.scheduledAt || null }).select("*").single();
    if (error) throw error;
    return Response.json({ item: camelize(data) }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar o conteúdo." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
    const payload = await request.json() as { id?: number; status?: string; scheduledAt?: string | null; title?: string };
    if (!payload.id) return Response.json({ error: "O conteúdo é obrigatório." }, { status: 400 });
    const supabase = await createClient();
    const existing = await supabase.from("content_items").select("account_id").eq("id", payload.id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return Response.json({ error: "Conteúdo não encontrado." }, { status: 404 });
    if (!(await userOwnsAccount(existing.data.account_id, auth.email))) return forbiddenAccount();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.status) updates.status = payload.status;
    if (payload.title?.trim()) updates.title = payload.title.trim();
    if (payload.scheduledAt !== undefined) updates.scheduled_at = payload.scheduledAt;
    const { data, error } = await supabase.from("content_items").update(updates).eq("id", payload.id).select("*").single();
    if (error) throw error;
    return Response.json({ item: camelize(data) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o conteúdo." }, { status: 500 }); }
}

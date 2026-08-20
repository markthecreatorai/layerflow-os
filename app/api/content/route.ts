import { count, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { contentItems } from "../../../db/schema";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../_auth";

const initialContent = [
  { title: "Você não está sem ideia, só está olhando pro lugar errado", kind: "Reel", status: "Produção", platform: "Instagram", pillar: "Criação", hook: "Você não está sem ideia. Está procurando no lugar errado.", scheduledAt: "2026-08-20T18:30:00-03:00", reach: 0, saves: 0, comments: 0 },
  { title: "Criatividade não perdeu valor depois da IA", kind: "Carrossel", status: "Revisão", platform: "Instagram", pillar: "Renascentismo 2.0", hook: "A IA não matou a criatividade. Só deixou o trabalho mediano mais fácil de reconhecer.", scheduledAt: "2026-08-21T12:00:00-03:00", reach: 0, saves: 0, comments: 0 },
  { title: "O sistema que transforma uma ideia em uma semana de conteúdo", kind: "Newsletter", status: "Roteiro", platform: "Substack", pillar: "Sistemas", hook: "O problema não é ter poucas ideias. É abandonar cada uma antes de explorar o que ela carrega.", scheduledAt: "2026-08-22T09:00:00-03:00", reach: 0, saves: 0, comments: 0 },
  { title: "Por que um bom portfólio não traz clientes sozinho", kind: "Thread", status: "Ideia", platform: "X", pillar: "Monetização", hook: "Seu portfólio prova que você sabe fazer. Não prova que alguém deveria comprar agora.", scheduledAt: null, reach: 0, saves: 0, comments: 0 },
  { title: "Criar conteúdo virou uma forma elegante de procrastinar", kind: "Reel", status: "Agendado", platform: "Instagram", pillar: "Criação", hook: "Criar conteúdo também pode ser procrastinação.", scheduledAt: "2026-08-23T19:00:00-03:00", reach: 0, saves: 0, comments: 0 },
  { title: "Você não precisa de mais seguidores para vender conhecimento", kind: "Carrossel", status: "Publicado", platform: "Instagram", pillar: "Monetização", hook: "Você não precisa de uma audiência maior. Precisa de uma oferta mais nítida.", publishedAt: "2026-08-16T12:00:00-03:00", reach: 18240, saves: 612, comments: 84 },
  { title: "A combinação rara vale mais do que escolher um nicho", kind: "Reel", status: "Publicado", platform: "Instagram", pillar: "Marca pessoal", hook: "Seu nicho não precisa explicar tudo o que você é.", publishedAt: "2026-08-14T19:00:00-03:00", reach: 12480, saves: 391, comments: 63 },
  { title: "O novo profissional criativo não vende apenas execução", kind: "Newsletter", status: "Publicado", platform: "Substack", pillar: "Renascentismo 2.0", hook: "Execução ficou mais barata. Olhar crítico não.", publishedAt: "2026-08-11T09:00:00-03:00", reach: 3860, saves: 118, comments: 29 },
];

async function seedIfEmpty(accountId: number) {
  const db = getDb();
  const [result] = await db.select({ value: count() }).from(contentItems).where(eq(contentItems.accountId, accountId));
  if ((result?.value ?? 0) === 0 && accountId === 1) await db.insert(contentItems).values(initialContent.map((item) => ({ ...item, accountId })));
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const accountId = Number(new URL(request.url).searchParams.get("accountId")) || 1;
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    await seedIfEmpty(accountId);
    const db = getDb();
    const items = await db.select().from(contentItems).where(eq(contentItems.accountId, accountId)).orderBy(desc(contentItems.createdAt), desc(contentItems.id));
    return Response.json({ items });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os conteúdos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const payload = (await request.json()) as Partial<typeof contentItems.$inferInsert>;
    const title = payload.title?.trim();
    if (!title) return Response.json({ error: "O título é obrigatório." }, { status: 400 });
    const accountId = Number(payload.accountId) || 1;
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    const db = getDb();
    const [item] = await db.insert(contentItems).values({
      title,
      accountId,
      kind: payload.kind ?? "Ideia",
      status: payload.status ?? "Ideia",
      platform: payload.platform ?? "Instagram",
      pillar: payload.pillar ?? "Criatividade",
      hook: payload.hook ?? "",
      body: payload.body ?? "",
      scheduledAt: payload.scheduledAt ?? null,
    }).returning();
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar o conteúdo." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const payload = (await request.json()) as { id?: number; status?: string; scheduledAt?: string | null; title?: string };
    if (!payload.id) return Response.json({ error: "O conteúdo é obrigatório." }, { status: 400 });
    const db = getDb();
    const [existing] = await db.select({ accountId: contentItems.accountId }).from(contentItems).where(eq(contentItems.id, payload.id)).limit(1);
    if (!existing) return Response.json({ error: "Conteúdo não encontrado." }, { status: 404 });
    if (!(await userOwnsAccount(existing.accountId, auth.email))) return forbiddenAccount();
    const updates: Partial<typeof contentItems.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (payload.status) updates.status = payload.status;
    if (payload.title?.trim()) updates.title = payload.title.trim();
    if (payload.scheduledAt !== undefined) updates.scheduledAt = payload.scheduledAt;
    const [item] = await db.update(contentItems).set(updates).where(eq(contentItems.id, payload.id)).returning();
    return Response.json({ item });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o conteúdo." }, { status: 500 });
  }
}

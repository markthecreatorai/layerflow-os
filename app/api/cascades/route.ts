import { createClient } from "../../../lib/supabase/server";
import { camelize } from "../../../lib/supabase/rows";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../_auth";

const starterCascade = {
  title: "Criatividade na era da inteligência artificial",
  source_text: "Texto-base sobre como ferramentas de IA aumentam a capacidade de execução, mas tornam repertório, gosto e olhar crítico ainda mais importantes.",
  thesis: "A IA não diminuiu o valor da criatividade — ela aumentou o custo de não ter um olhar próprio.",
  angles: JSON.stringify([{ title: "Execução deixou de ser diferencial", format: "Reel", hook: "A IA não substituiu criativos. Substituiu a desculpa de que executar era o bastante." }, { title: "Repertório volta a ganhar valor", format: "Carrossel", hook: "Quanto mais fácil ficou produzir, mais caro ficou saber o que merece existir." }]),
  proofs: JSON.stringify(["Ferramentas iguais geram resultados diferentes", "O crescimento dos profissionais multidisciplinares"]),
  objections: JSON.stringify(["A IA barateou o serviço criativo", "Clientes passaram a executar por conta própria"]),
  cta: "Comente CASCATA para receber o mapa completo.", status: "Ativa",
};

async function seedIfEmpty(accountId: number, ownerId: string) {
  const supabase = await createClient();
  const result = await supabase.from("source_bases").select("id", { count: "exact", head: true }).eq("account_id", accountId);
  if (result.error) throw result.error;
  if (!result.count) {
    const inserted = await supabase.from("source_bases").insert({ ...starterCascade, owner_id: ownerId, account_id: accountId });
    if (inserted.error) throw inserted.error;
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
    const accountId = Number(new URL(request.url).searchParams.get("accountId"));
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    await seedIfEmpty(accountId, auth.id);
    const supabase = await createClient();
    const { data, error } = await supabase.from("source_bases").select("*").eq("account_id", accountId).order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ cascades: camelize(data) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar as cascatas." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
    const payload = await request.json() as { title?: string; sourceText?: string; accountId?: number };
    const sourceText = payload.sourceText?.trim(); const accountId = Number(payload.accountId);
    if (!sourceText) return Response.json({ error: "Adicione um texto-base." }, { status: 400 });
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    const supabase = await createClient();
    const { data, error } = await supabase.from("source_bases").insert({ owner_id: auth.id, account_id: accountId, title: payload.title?.trim() || "Nova base de conteúdo", source_text: sourceText, status: "Aprofundar" }).select("*").single();
    if (error) throw error;
    return Response.json({ cascade: camelize(data) }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a base." }, { status: 500 }); }
}

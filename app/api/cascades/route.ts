import { count, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { sourceBases } from "../../../db/schema";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../_auth";

const starterCascade = {
  title: "Criatividade na era da inteligência artificial",
  sourceText: "Texto-base sobre como ferramentas de IA aumentam a capacidade de execução, mas tornam repertório, gosto e olhar crítico ainda mais importantes.",
  thesis: "A IA não diminuiu o valor da criatividade — ela aumentou o custo de não ter um olhar próprio.",
  angles: JSON.stringify([
    { title: "Execução deixou de ser diferencial", format: "Reel", hook: "A IA não substituiu criativos. Substituiu a desculpa de que executar era o bastante." },
    { title: "Repertório volta a ganhar valor", format: "Carrossel", hook: "Quanto mais fácil ficou produzir, mais caro ficou saber o que merece existir." },
    { title: "O profissional renascentista", format: "Newsletter", hook: "O mercado separou habilidades por décadas. A IA está juntando tudo de novo." },
    { title: "A objeção do trabalho genérico", format: "Thread", hook: "Se todo mundo usa as mesmas ferramentas, por que alguns trabalhos ainda parecem impossíveis de copiar?" },
  ]),
  proofs: JSON.stringify(["Rick Rubin não toca instrumentos", "Ferramentas iguais geram resultados diferentes", "O crescimento dos profissionais multidisciplinares"]),
  objections: JSON.stringify(["A IA barateou o serviço criativo", "Clientes passaram a executar por conta própria"]),
  cta: "Comente CASCATA para receber o mapa completo.",
  status: "Ativa",
};

async function seedIfEmpty(accountId: number) {
  const db = getDb();
  const [result] = await db.select({ value: count() }).from(sourceBases).where(eq(sourceBases.accountId, accountId));
  if ((result?.value ?? 0) === 0 && accountId === 1) await db.insert(sourceBases).values({ ...starterCascade, accountId });
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const accountId = Number(new URL(request.url).searchParams.get("accountId")) || 1;
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    await seedIfEmpty(accountId);
    const db = getDb();
    const cascades = await db.select().from(sourceBases).where(eq(sourceBases.accountId, accountId)).orderBy(desc(sourceBases.createdAt));
    return Response.json({ cascades });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar as cascatas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const payload = (await request.json()) as { title?: string; sourceText?: string; accountId?: number };
    const sourceText = payload.sourceText?.trim();
    if (!sourceText) return Response.json({ error: "Adicione um texto-base." }, { status: 400 });
    const accountId = Number(payload.accountId) || 1;
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    const db = getDb();
    const [cascade] = await db.insert(sourceBases).values({ accountId, title: payload.title?.trim() || "Nova base de conteúdo", sourceText, status: "Aprofundar" }).returning();
    return Response.json({ cascade }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a base." }, { status: 500 });
  }
}

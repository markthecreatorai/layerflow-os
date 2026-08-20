import { env } from "cloudflare:workers";
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { libraryAssets } from "../../../db/schema";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../_auth";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
]);

const starterAssets = [
  { title: "Mapa da Marca Criativa", category: "Isca digital", format: "PDF", status: "Publicado", description: "Diagnóstico para profissionais criativos encontrarem uma combinação rara de habilidades.", conversions: 184 },
  { title: "Cascata de Conteúdo", category: "Isca digital", format: "Notion", status: "Ativo", description: "Modelo para transformar uma base densa em vários ângulos de conteúdo.", conversions: 96 },
  { title: "Reel — Criatividade depois da IA", category: "Roteiro", format: "Vídeo 60s", status: "Aprovado", description: "Gancho, desenvolvimento e fecho para reel de posicionamento.", conversions: 0 },
  { title: "Carrossel — Portfólio não vende sozinho", category: "Roteiro", format: "8 telas", status: "Rascunho", description: "Estrutura de contraste para autoridade e geração de demanda.", conversions: 0 },
  { title: "Estrutura de newsletter ensaio", category: "Modelo", format: "Documento", status: "Pronto", description: "Base longa com abertura invertida, tensão e fechamento seco.", conversions: 0 },
];

async function seedIfEmpty(accountId: number) {
  const db = getDb();
  const [result] = await db.select({ value: count() }).from(libraryAssets).where(eq(libraryAssets.accountId, accountId));
  if ((result?.value ?? 0) === 0 && accountId === 1) {
    await db.insert(libraryAssets).values(starterAssets.map((asset) => ({ ...asset, accountId })));
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const accountId = Number(new URL(request.url).searchParams.get("accountId")) || 1;
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    await seedIfEmpty(accountId);
    const db = getDb();
    const assets = await db.select().from(libraryAssets).where(eq(libraryAssets.accountId, accountId)).orderBy(desc(libraryAssets.createdAt));
    return Response.json({ assets: assets.map((asset) => ({ ...asset, downloadUrl: asset.storageKey ? `/api/library/${asset.id}/file` : asset.url })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a biblioteca." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const category = String(form.get("category") ?? "Isca digital");
    const accountId = Number(form.get("accountId")) || 1;

    if (!title || !(file instanceof File)) return Response.json({ error: "Título e arquivo são obrigatórios." }, { status: 400 });
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "O arquivo deve ter no máximo 25 MB." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "Formato não aceito. Use PDF, ZIP, DOCX, PPTX, TXT, MD, PNG ou JPG." }, { status: 400 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
    const storageKey = `accounts/${accountId}/lead-magnets/${crypto.randomUUID()}-${safeName}`;
    await env.BUCKET.put(storageKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name, accountId: String(accountId), ownerEmail: auth.email },
    });

    const extension = file.name.split(".").pop()?.toUpperCase() || "Arquivo";
    const db = getDb();
    const [asset] = await db.insert(libraryAssets).values({
      accountId,
      title,
      category,
      format: extension,
      status: "Publicado",
      description,
      storageKey,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      conversions: 0,
    }).returning();

    return Response.json({ asset: { ...asset, downloadUrl: `/api/library/${asset.id}/file` } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível enviar o arquivo." }, { status: 500 });
  }
}

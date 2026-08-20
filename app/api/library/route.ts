import { createClient } from "../../../lib/supabase/server";
import { camelize } from "../../../lib/supabase/rows";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../_auth";

const BUCKET = "layerflow-library";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "application/zip", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain", "text/markdown", "image/png", "image/jpeg"]);
const starterAssets = [
  { title: "Mapa da Marca Criativa", category: "Isca digital", format: "PDF", status: "Modelo", description: "Envie seu próprio arquivo para publicar este material.", conversions: 0 },
  { title: "Cascata de Conteúdo", category: "Isca digital", format: "Documento", status: "Modelo", description: "Modelo para transformar uma base densa em vários ângulos de conteúdo.", conversions: 0 },
];

async function seedIfEmpty(accountId: number, ownerId: string) {
  const supabase = await createClient();
  const result = await supabase.from("library_assets").select("id", { count: "exact", head: true }).eq("account_id", accountId);
  if (result.error) throw result.error;
  if (!result.count) {
    const inserted = await supabase.from("library_assets").insert(starterAssets.map((asset) => ({ ...asset, owner_id: ownerId, account_id: accountId })));
    if (inserted.error) throw inserted.error;
  }
}

function withDownload(asset: Record<string, unknown>) {
  const value = camelize<Record<string, unknown>>(asset);
  return { ...value, downloadUrl: asset.storage_key ? `/api/library/${asset.id}/file` : asset.url };
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
    const accountId = Number(new URL(request.url).searchParams.get("accountId"));
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    await seedIfEmpty(accountId, auth.id);
    const supabase = await createClient();
    const { data, error } = await supabase.from("library_assets").select("*").eq("account_id", accountId).order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ assets: (data ?? []).map(withDownload) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a biblioteca." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
    const form = await request.formData(); const file = form.get("file");
    const title = String(form.get("title") ?? "").trim(); const description = String(form.get("description") ?? "").trim();
    const category = String(form.get("category") ?? "Isca digital"); const accountId = Number(form.get("accountId"));
    if (!title || !(file instanceof File)) return Response.json({ error: "Título e arquivo são obrigatórios." }, { status: 400 });
    if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "O arquivo deve ter no máximo 10 MB." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "Formato não aceito. Use PDF, ZIP, DOCX, PPTX, TXT, MD, PNG ou JPG." }, { status: 400 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
    const storageKey = `${auth.id}/accounts/${accountId}/lead-magnets/${crypto.randomUUID()}-${safeName}`;
    const supabase = await createClient();
    const uploaded = await supabase.storage.from(BUCKET).upload(storageKey, file, { contentType: file.type, upsert: false });
    if (uploaded.error) throw uploaded.error;
    const extension = file.name.split(".").pop()?.toUpperCase() || "Arquivo";
    const created = await supabase.from("library_assets").insert({ owner_id: auth.id, account_id: accountId, title, category, format: extension, status: "Publicado", description, storage_key: storageKey, file_name: file.name, mime_type: file.type, file_size: file.size, conversions: 0 }).select("*").single();
    if (created.error) { await supabase.storage.from(BUCKET).remove([storageKey]); throw created.error; }
    return Response.json({ asset: withDownload(created.data) }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível enviar o arquivo." }, { status: 500 }); }
}

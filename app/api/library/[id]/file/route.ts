import { createClient } from "../../../../../lib/supabase/server";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../../../_auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth;
    const { id } = await params; const supabase = await createClient();
    const result = await supabase.from("library_assets").select("account_id,storage_key,file_name,mime_type").eq("id", Number(id)).maybeSingle();
    if (result.error) throw result.error;
    const asset = result.data;
    if (!asset?.storage_key) return new Response("Arquivo não encontrado.", { status: 404 });
    if (!(await userOwnsAccount(asset.account_id, auth.email))) return forbiddenAccount();
    const downloaded = await supabase.storage.from("layerflow-library").download(asset.storage_key);
    if (downloaded.error) throw downloaded.error;
    return new Response(downloaded.data, { headers: { "content-type": asset.mime_type || "application/octet-stream", "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(asset.file_name || "lead-magnet")}`, "cache-control": "private, max-age=300" } });
  } catch { return new Response("Não foi possível baixar o arquivo.", { status: 500 }); }
}

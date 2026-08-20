import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { libraryAssets } from "../../../../../db/schema";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../../../_auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const { id } = await params;
    const db = getDb();
    const [asset] = await db.select().from(libraryAssets).where(eq(libraryAssets.id, Number(id))).limit(1);
    if (!asset?.storageKey) return new Response("Arquivo não encontrado.", { status: 404 });
    if (!(await userOwnsAccount(asset.accountId, auth.email))) return forbiddenAccount();

    const object = await env.BUCKET.get(asset.storageKey);
    if (!object) return new Response("Arquivo não encontrado.", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(asset.fileName || "lead-magnet")}`);
    headers.set("cache-control", "private, max-age=300");
    return new Response(object.body, { headers });
  } catch {
    return new Response("Não foi possível baixar o arquivo.", { status: 500 });
  }
}

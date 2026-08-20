import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { automationEvents, automationFunnels, libraryAssets } from "../../../../../../db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string; token: string }> }) {
  const { eventId, token } = await params;
  const db = getDb();
  const [event] = await db.select().from(automationEvents).where(and(
    eq(automationEvents.id, Number(eventId)),
    eq(automationEvents.trackingToken, token),
  )).limit(1);
  if (!event) return new Response("Link inválido ou expirado.", { status: 404 });

  const firstClick = !event.clickedAt;
  const now = new Date().toISOString();
  await db.update(automationEvents).set({ clickedAt: event.clickedAt ?? now }).where(eq(automationEvents.id, event.id));
  if (firstClick) {
    await db.update(automationFunnels).set({ clicks: sql`${automationFunnels.clicks} + 1`, updatedAt: now }).where(eq(automationFunnels.id, event.automationId));
  }

  if (event.assetId) {
    const [asset] = await db.select().from(libraryAssets).where(eq(libraryAssets.id, event.assetId)).limit(1);
    if (!asset?.storageKey) return new Response("Material não encontrado.", { status: 404 });
    const object = await env.BUCKET.get(asset.storageKey);
    if (!object) return new Response("Material não encontrado.", { status: 404 });
    if (firstClick) await db.update(libraryAssets).set({ conversions: sql`${libraryAssets.conversions} + 1` }).where(eq(libraryAssets.id, asset.id));
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(asset.fileName || "lead-magnet")}`);
    headers.set("cache-control", "private, no-store");
    return new Response(object.body, { headers });
  }

  if (event.destinationUrl) {
    try {
      const destination = new URL(event.destinationUrl);
      if (!["http:", "https:"].includes(destination.protocol)) throw new Error("invalid protocol");
      return Response.redirect(destination, 302);
    } catch {
      return new Response("Destino inválido.", { status: 400 });
    }
  }
  return new Response("Material entregue.", { status: 200 });
}

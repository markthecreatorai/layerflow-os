import { getInstagramConfig } from "../../integrations/instagram/_server";
import { processInstagramWebhook, verifyMetaSignature } from "../_server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const config = getInstagramConfig();
  if (mode === "subscribe" && challenge && config.webhookVerifyToken && token === config.webhookVerifyToken) {
    return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("Verificação recusada.", { status: 403 });
}

export async function POST(request: Request) {
  const body = await request.arrayBuffer();
  const valid = await verifyMetaSignature(body, request.headers.get("x-hub-signature-256"));
  if (!valid) return new Response("Assinatura inválida.", { status: 401 });
  const payload = JSON.parse(new TextDecoder().decode(body)) as Parameters<typeof processInstagramWebhook>[0];
  await processInstagramWebhook(payload);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

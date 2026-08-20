import { getInstagramConfig } from "../integrations/instagram/_server";

const origin = process.env.NEXT_PUBLIC_APP_URL || "https://layerflow-os-lucaslcarrijos-projects.vercel.app";

export async function verifyMetaSignature(body: ArrayBuffer, signatureHeader: string | null) {
  const { appSecret } = getInstagramConfig();
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const hex = signatureHeader.slice(7); if (!/^[a-f0-9]{64}$/i.test(hex)) return false;
  const signature = new Uint8Array(hex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, signature, body);
}

export function getAutomationReadiness(connectionExists: boolean) {
  const config = getInstagramConfig();
  const processorConfigured = Boolean(process.env.INSTAGRAM_WEBHOOK_PROCESSOR_URL && process.env.INSTAGRAM_WEBHOOK_PROCESSOR_SECRET);
  const webhookConfigured = Boolean(config.webhookVerifyToken && config.appSecret && processorConfigured);
  const liveReady = Boolean(connectionExists && config.oauthConfigured && webhookConfigured);
  return { connected: connectionExists, liveReady, mode: liveReady ? "live" : "test", webhookConfigured, webhookUrl: `${origin}/api/automations/webhook`, webhookVerifyToken: config.webhookVerifyToken || null, requiredScopes: ["instagram_business_basic", "instagram_business_manage_comments", "instagram_business_manage_messages"] };
}

export async function processInstagramWebhook(payload: unknown) {
  const url = process.env.INSTAGRAM_WEBHOOK_PROCESSOR_URL;
  const secret = process.env.INSTAGRAM_WEBHOOK_PROCESSOR_SECRET;
  if (!url || !secret) throw new Error("O processador seguro das automações ainda não foi configurado.");
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-layerflow-webhook-secret": secret }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("O processador das automações recusou o evento.");
}

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string; token: string }> }) {
  const { eventId, token } = await params;
  const processor = process.env.INSTAGRAM_CLICK_PROCESSOR_URL;
  if (!processor) return new Response("A entrega pública deste material ainda não foi ativada.", { status: 503 });
  const url = new URL(processor); url.searchParams.set("eventId", eventId); url.searchParams.set("token", token);
  return Response.redirect(url, 302);
}

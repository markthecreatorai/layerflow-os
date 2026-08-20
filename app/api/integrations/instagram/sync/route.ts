import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../../../_auth";
import { syncInstagramMetrics } from "../_server";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isAuthResponse(auth)) return auth;
  const payload = (await request.json().catch(() => ({}))) as { accountId?: number };
  const accountId = Number(payload.accountId);
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount();

  try {
    await syncInstagramMetrics(accountId, auth.email);
    return Response.json({ synced: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível sincronizar as métricas." }, { status: 502 });
  }
}

import { createClient } from "../../../../../lib/supabase/server";
import { forbiddenAccount, isAuthResponse, requireApiUser, userOwnsAccount } from "../../../_auth";
import { getInstagramConnectionStatus, getInstagramPublicStatus } from "../_server";

export async function GET(request: Request) {
  const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth; const accountId = Number(new URL(request.url).searchParams.get("accountId"));
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount(); return Response.json({ ...getInstagramPublicStatus(), ...await getInstagramConnectionStatus(accountId) });
}
export async function DELETE(request: Request) {
  const auth = await requireApiUser(); if (isAuthResponse(auth)) return auth; const accountId = Number(new URL(request.url).searchParams.get("accountId"));
  if (!(await userOwnsAccount(accountId, auth.email))) return forbiddenAccount(); const supabase = await createClient();
  const removed = await supabase.from("instagram_connections").delete().eq("account_id", accountId); if (removed.error) throw removed.error;
  const account = await supabase.from("brand_accounts").update({ connection_status: "Planejamento" }).eq("id", accountId); if (account.error) throw account.error;
  return Response.json({ disconnected: true });
}

import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo");
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/login";
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(safeReturnTo === "/" ? "/login" : safeReturnTo, url.origin));
}

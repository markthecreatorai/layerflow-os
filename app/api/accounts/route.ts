import { createClient } from "../../../lib/supabase/server";
import { camelize } from "../../../lib/supabase/rows";
import { isAuthResponse, requireApiUser } from "../_auth";

const publicFields = "id,name,handle,platform,initials,accent,connection_status";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const supabase = await createClient();
    const result = await supabase.from("brand_accounts").select(publicFields).order("id");
    let data = result.data;
    if (result.error) throw result.error;
    if (!data?.length) {
      const displayName = auth.fullName ?? auth.displayName ?? auth.email;
      const name = displayName.includes("@") ? displayName.split("@")[0] : displayName;
      const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "IG";
      const created = await supabase.from("brand_accounts").insert({ owner_id: auth.id, owner_email: auth.email, name, handle: "@novo.perfil", platform: "Instagram", initials, accent: "#B8FF6A", connection_status: "Planejamento" }).select(publicFields).single();
      if (created.error) throw created.error;
      data = created.data ? [created.data] : [];
    }
    return Response.json({ accounts: camelize(data) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os perfis." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const payload = await request.json() as { name?: string; handle?: string };
    const name = payload.name?.trim();
    const rawHandle = payload.handle?.trim().replace(/^@+/, "");
    if (!name || !rawHandle) return Response.json({ error: "Nome e usuário são obrigatórios." }, { status: 400 });
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "IG";
    const accents = ["#B8FF6A", "#D3B6FF", "#9CC7FF", "#FFD685", "#FFAE9B"];
    const supabase = await createClient();
    const { data, error } = await supabase.from("brand_accounts").insert({ owner_id: auth.id, owner_email: auth.email, name, handle: `@${rawHandle}`, platform: "Instagram", initials, accent: accents[Math.floor(Math.random() * accents.length)], connection_status: "Planejamento" }).select(publicFields).single();
    if (error) throw error;
    return Response.json({ account: camelize(data) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível adicionar o perfil." }, { status: 500 });
  }
}

import { count, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { brandAccounts } from "../../../db/schema";
import { isAuthResponse, requireApiUser } from "../_auth";

const publicAccountFields = {
  id: brandAccounts.id,
  name: brandAccounts.name,
  handle: brandAccounts.handle,
  platform: brandAccounts.platform,
  initials: brandAccounts.initials,
  accent: brandAccounts.accent,
  connectionStatus: brandAccounts.connectionStatus,
};

async function seedIfEmpty(ownerEmail: string, displayName: string) {
  const db = getDb();
  await db.update(brandAccounts).set({ ownerEmail }).where(eq(brandAccounts.ownerEmail, ""));
  const [result] = await db.select({ value: count() }).from(brandAccounts).where(eq(brandAccounts.ownerEmail, ownerEmail));
  if ((result?.value ?? 0) === 0) {
    const name = displayName.includes("@") ? displayName.split("@")[0] : displayName;
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "IG";
    await db.insert(brandAccounts).values({
      ownerEmail,
      name,
      handle: "@novo.perfil",
      platform: "Instagram",
      initials,
      accent: "#B8FF6A",
      connectionStatus: "Planejamento",
    });
  }
}

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    await seedIfEmpty(auth.email, auth.fullName ?? auth.displayName);
    const db = getDb();
    const accounts = await db.select(publicAccountFields).from(brandAccounts).where(eq(brandAccounts.ownerEmail, auth.email)).orderBy(brandAccounts.id);
    return Response.json({ accounts });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os perfis." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if (isAuthResponse(auth)) return auth;
    const payload = (await request.json()) as { name?: string; handle?: string };
    const name = payload.name?.trim();
    const rawHandle = payload.handle?.trim().replace(/^@+/, "");
    if (!name || !rawHandle) return Response.json({ error: "Nome e usuário são obrigatórios." }, { status: 400 });
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "IG";
    const accents = ["#B8FF6A", "#D3B6FF", "#9CC7FF", "#FFD685", "#FFAE9B"];
    const db = getDb();
    const [account] = await db.insert(brandAccounts).values({
      ownerEmail: auth.email,
      name,
      handle: `@${rawHandle}`,
      platform: "Instagram",
      initials,
      accent: accents[Math.floor(Math.random() * accents.length)],
      connectionStatus: "Planejamento",
    }).returning(publicAccountFields);
    return Response.json({ account }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível adicionar o perfil." }, { status: 500 });
  }
}

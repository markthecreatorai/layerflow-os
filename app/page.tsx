import LayerflowClient from "./layerflow-client";
import { appSignOutPath, requireAppUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireAppUser("/");
  const params = await searchParams;
  const initialActive = params.integration === "instagram" ? "Integrações" : "Visão geral";

  return (
    <LayerflowClient
      viewer={{
        displayName: user.displayName,
        email: user.email,
        fullName: user.fullName,
      }}
      signOutPath={appSignOutPath("/")}
      initialActive={initialActive}
    />
  );
}

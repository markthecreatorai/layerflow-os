"use client";
import { useEffect } from "react";

export default function InstagramCompleteClient({ status }: { status: string }) {
  const connected = status === "connected";
  useEffect(() => {
    window.opener?.postMessage({ type: "layerflow:instagram-oauth", status }, window.location.origin);
    if (connected) window.setTimeout(() => window.close(), 900);
  }, [connected, status]);
  return <main className="oauth-complete"><div className="connector-icon instagram">IG</div><h1>{connected ? "Instagram conectado" : "Não foi possível conectar"}</h1><p>{connected ? "Tudo certo. Esta janela fechará automaticamente." : "Volte ao Layerflow, confira a configuração e tente novamente."}</p><button type="button" onClick={() => window.close()}>Voltar ao Layerflow</button></main>;
}

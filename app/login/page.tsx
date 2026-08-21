import { login, signup } from "./actions";

type LoginProps = {
  searchParams: Promise<{ message?: string; returnTo?: string; mode?: string }>;
};

export default async function LoginPage({ searchParams }: LoginProps) {
  const { message, returnTo = "/", mode } = await searchParams;
  const isSignup = mode === "signup";
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand"><span>LF</span><strong>Layerflow OS</strong></div>
        <div>
          <p className="eyebrow">Seu sistema criativo</p>
          <h1>{isSignup ? "Crie seu espaço no Layerflow." : "Que bom ter você de volta."}</h1>
          <p className="login-copy">{isSignup ? "Leva menos de um minuto. Depois, você conecta o Instagram em poucos cliques." : "Entre para continuar organizando conteúdo, métricas e automações."}</p>
        </div>
        <nav className="login-tabs" aria-label="Acesso"><a className={!isSignup ? "active" : ""} href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Entrar</a><a className={isSignup ? "active" : ""} href={`/login?mode=signup&returnTo=${encodeURIComponent(returnTo)}`}>Criar conta</a></nav>
        {message ? <p className="login-message" role="status">{message}</p> : null}
        <form className="login-form">
          <input type="hidden" name="returnTo" value={returnTo} />
          {isSignup ? <><label htmlFor="fullName">Como podemos chamar você?</label><input id="fullName" name="fullName" type="text" autoComplete="name" required placeholder="Seu nome" /></> : null}
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" />
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={6} required placeholder={isSignup ? "Crie uma senha com 6+ caracteres" : "Sua senha"} />
          <div className="login-actions">
            <button formAction={isSignup ? signup : login} className="primary">{isSignup ? "Criar minha conta" : "Entrar no Layerflow"}</button>
          </div>
        </form>
        <p className="login-footnote">{isSignup ? "Ao continuar, você concorda em usar o Layerflow de forma responsável." : "Se ainda não tem uma conta, escolha “Criar conta” acima."}</p>
      </section>
    </main>
  );
}

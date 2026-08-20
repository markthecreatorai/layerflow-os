import { login, signup } from "./actions";

type LoginProps = {
  searchParams: Promise<{ message?: string; returnTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginProps) {
  const { message, returnTo = "/" } = await searchParams;
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand"><span>LF</span><strong>Layerflow OS</strong></div>
        <div>
          <p className="eyebrow">Seu sistema criativo</p>
          <h1>Entre para organizar sua marca.</h1>
          <p className="login-copy">Conteúdo, biblioteca, métricas e automações em um único espaço seguro.</p>
        </div>
        {message ? <p className="login-message" role="status">{message}</p> : null}
        <form className="login-form">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label htmlFor="fullName">Nome <small>(para criar conta)</small></label>
          <input id="fullName" name="fullName" type="text" autoComplete="name" placeholder="Seu nome" />
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" />
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="current-password" minLength={6} required placeholder="Mínimo de 6 caracteres" />
          <div className="login-actions">
            <button formAction={login} className="primary">Entrar</button>
            <button formAction={signup} className="secondary">Criar conta</button>
          </div>
        </form>
      </section>
    </main>
  );
}

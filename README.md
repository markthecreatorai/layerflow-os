# Layerflow OS

Sistema operacional editorial para organizar marcas, conteúdo, biblioteca de materiais, métricas do Instagram e automações.

## Stack de produção

- Next.js 16 + React 19 na Vercel;
- Supabase Auth para login por e-mail e senha;
- Supabase Postgres com Row Level Security em todas as tabelas;
- Supabase Storage privado para os arquivos da biblioteca.

## Desenvolvimento local

```bash
cp .env.example .env.local
npm install
npm run dev
```

O build de produção é validado com `npm run build`.

## Banco e segurança

As migrações versionadas ficam em `supabase/migrations`. Cada registro pertence a um usuário do Supabase e as políticas RLS bloqueiam acesso entre contas. O bucket `layerflow-library` também é privado e limita cada arquivo a 10 MB.

## Instagram

As telas e o OAuth estão prontos, mas a conexão ao vivo exige as credenciais do aplicativo oficial da Meta descritas em `.env.example`. Sem essas credenciais, as automações permanecem corretamente em modo de teste.

# Layerflow OS

Sistema operacional editorial para gerenciar marca pessoal, múltiplos perfis de Instagram e uma esteira de conteúdo completa — da ideia aos resultados.

## O que já funciona

- espaços separados por perfil/conta gerenciada;
- banco de ideias e cascatas de conteúdo;
- kanban e lista de produção, com avanço de etapas;
- calendário editorial com agendamento interno;
- upload e download de lead magnets, roteiros e modelos;
- dashboard e exportação de resultados em CSV;
- busca global, captura rápida e importação de rascunhos;
- fluxos guiados para futuras integrações com Instagram, X e Substack.

## Stack

- Next.js 16 + React 19;
- Vinext/Vite para execução em Cloudflare Workers;
- Drizzle ORM + D1 para dados estruturados;
- R2 para arquivos da biblioteca;
- Lucide React para ícones.

## Desenvolvimento local

```bash
npm install
npm run db:generate
npm run dev
```

## Variáveis e bindings

O projeto espera os bindings `DB` (D1) e `BUCKET` (R2), definidos em `.openai/hosting.json` no ambiente de hospedagem. Credenciais futuras de APIs sociais devem ser adicionadas apenas como variáveis protegidas.

## Estado das integrações

O gerenciamento editorial e a separação por contas já estão ativos. A publicação automática e a importação de métricas exigem credenciais OAuth e permissões dos aplicativos oficiais da Meta e do X. O Substack permanece como fluxo manual assistido até haver uma API de publicação compatível com a conta.

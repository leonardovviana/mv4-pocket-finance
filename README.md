# MV4 Financeiro (PWA)

Aplicativo financeiro interno da Agência MV4 (PWA) com:

- Cadastros de receitas e despesas
- Importadores (scripts) para lançamentos em lote
- Chat público com solicitações de pagamento e notificações
- Dashboard com gráficos e “Saldo em caixa” (manual)

## Tecnologias

- Vite + React + TypeScript
- Tailwind + shadcn/ui
- Supabase (Auth, Postgres, Storage, Realtime)
- PWA via `vite-plugin-pwa`

## Rodar localmente

```cmd
cd "c:\Users\Leonardo\Documents\PROJETOS (APPS-SITES)\mv4-pocket-finance"
npm install
npm run dev
```

Abra `http://localhost:8080`.

## Build

```cmd
npm run build
npm run preview
```

## PWA / Notificações

- O app pede permissão de notificação ao abrir o `Chat Público`.
- Quando o app estiver em segundo plano, novas mensagens/solicitações no chat público geram notificação.
- O clique na notificação abre `/chat`.

## Supabase

- Migrações em `supabase/migrations/`
- Tipos gerados/atualizados em `src/integrations/supabase/types.ts`

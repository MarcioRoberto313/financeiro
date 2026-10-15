# Finanças — orçamento, DRE, metas e relatórios

App web de finanças pessoais (PWA, instalável no celular) com:

- **Dashboard**: receitas, despesas, resultado e saldo do mês, gráfico de 12 meses, despesas por categoria, orçado x realizado, metas e contas.
- **Lançamentos**: cadastro manual, filtros por mês, conta, categoria e busca, e categorização rápida direto na tabela.
- **Importar**: extrato **OFX** (ignora lançamentos já importados) ou **CSV** (mapeamento de colunas, sinais invertidos para fatura de cartão) com sugestão automática de categoria a partir do histórico.
- **Orçamento**: grade categoria × mês editável, com repetição do valor no ano e preenchimento pela média do ano anterior.
- **Orçado x Realizado**: visão por mês, acumulado no ano ou ano completo, desvio por categoria e alerta de estouros.
- **DRE**: Receitas → Despesas fixas → Variáveis → Dívidas → Sobra → Investimentos → Saldo de caixa, nos modos Realizado, Orçado e Comparativo, com AV%.
- **Metas**: valor alvo, prazo, aportes e resgates, valor necessário por mês e ritmo atual.
- **Relatórios**: despesas por categoria mês a mês, evolução do saldo, maiores despesas e exportação para CSV (Excel).
- **Configurações**: contas e cartões, categorias e o grupo de cada uma na DRE.

> Transferências entre contas (ex.: pagamento da fatura do cartão) usam a categoria
> **Transferência entre contas**, que fica fora da DRE e do orçamento para o gasto não ser contado duas vezes.

## Tecnologia

Next.js 16 (App Router, Server Actions, Cache Components) · Prisma · SQLite (dev) / PostgreSQL (produção) · Tailwind CSS 4 · Recharts · autenticação própria (bcrypt + JWT em cookie httpOnly).

Valores monetários são guardados em **centavos (inteiros)**.

## Rodando localmente

```bash
npm install
cp .env.example .env      # e gere um SESSION_SECRET
npm run db:push           # cria o banco SQLite (prisma/dev.db)
npm run db:seed           # opcional: usuário de demonstração com 12 meses de dados
npm run dev
```

Abra http://localhost:3000. O usuário de demonstração e a senha dele estão no topo de `prisma/seed.ts`.

Outros comandos: `npm run db:studio` (visualizar o banco), `npm run build` e `npm start` (produção).

Arquivos de exemplo para testar a importação ficam em `exemplos/`.

## Publicar na internet (próximo passo)

1. Crie um banco PostgreSQL (ex.: Supabase ou Neon).
2. Em `prisma/schema.prisma`, troque `provider = "sqlite"` por `"postgresql"`.
3. Faça o deploy na Vercel (ou outro host Node) com as variáveis `DATABASE_URL` e `SESSION_SECRET`.
4. Rode `npx prisma db push` apontando para o banco de produção.

Depois de publicado em HTTPS, o app pode ser instalado pelo navegador do celular ("Adicionar à tela inicial"). Para publicar nas lojas (Play Store / App Store), o mesmo site pode ser empacotado com Capacitor ou como TWA, sem reescrever o código.

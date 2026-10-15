// Popula o banco com um usuário de demonstração.
// Login: demo@financeiro.test  |  Senha: demo1234
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES } from "../src/lib/constants";

const db = new PrismaClient();

// Gerador pseudoaleatório determinístico para o seed ser reprodutível.
let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const vary = (base: number, spread = 0.15) => Math.round(base * (1 + (rnd() * 2 - 1) * spread));
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, Math.min(d, 28), 12));

async function main() {
  await db.user.deleteMany({ where: { email: "demo@financeiro.test" } });
  const user = await db.user.create({
    data: { name: "Usuário Demo", email: "demo@financeiro.test", passwordHash: await bcrypt.hash("demo1234", 10) },
  });

  const cats = Object.fromEntries(
    await Promise.all(
      DEFAULT_CATEGORIES.map(async (c) => [c.name, (await db.category.create({ data: { ...c, userId: user.id } })).id]),
    ),
  ) as Record<string, string>;

  const corrente = await db.account.create({
    data: { userId: user.id, name: "Nubank", type: "CORRENTE", initialBalance: 350000, color: "#8b5cf6" },
  });
  const cartao = await db.account.create({
    data: { userId: user.id, name: "Cartão Visa", type: "CARTAO", initialBalance: 0, color: "#f43f5e" },
  });
  await db.account.create({
    data: { userId: user.id, name: "Reserva (CDB)", type: "INVESTIMENTO", initialBalance: 1500000, color: "#14b8a6" },
  });

  // Recorrências mensais: [categoria, descrição, valor em centavos (com sinal), dia, conta]
  const monthly: [string, string, number, number, string][] = [
    ["Salário", "Salário", 850000, 5, corrente.id],
    ["Moradia", "Aluguel", -220000, 10, corrente.id],
    ["Contas da casa", "Energia elétrica", -24000, 15, corrente.id],
    ["Contas da casa", "Internet", -11990, 12, corrente.id],
    ["Saúde", "Plano de saúde", -68000, 8, corrente.id],
    ["Educação", "Curso de inglês", -42000, 7, corrente.id],
    ["Assinaturas", "Streaming", -5590, 18, cartao.id],
    ["Financiamentos", "Parcela do carro", -98000, 20, corrente.id],
    ["Aportes", "Aporte reserva", -80000, 6, corrente.id],
  ];
  const variable: [string, string[], number, number][] = [
    ["Alimentação", ["Supermercado", "Padaria", "iFood", "Restaurante"], 18000, 7],
    ["Transporte", ["Combustível", "Uber", "Estacionamento"], 15000, 4],
    ["Lazer", ["Cinema", "Bar", "Show"], 12000, 2],
    ["Compras", ["Amazon", "Farmácia", "Loja de roupas"], 16000, 2],
  ];

  const txs: Prisma.TransactionCreateManyInput[] = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const ref = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const y = ref.getUTCFullYear();
    const m = ref.getUTCMonth() + 1;
    const lastDay = i === 0 ? today.getUTCDate() : 28;
    for (const [cat, desc, amount, d, acc] of monthly) {
      if (d > lastDay) continue;
      const value = cat === "Contas da casa" && desc === "Energia elétrica" ? -vary(-amount, 0.25) : amount;
      txs.push({ userId: user.id, accountId: acc, categoryId: cats[cat], date: day(y, m, d), description: desc, amount: value });
    }
    for (const [cat, descs, avg, count] of variable) {
      for (let k = 0; k < count; k++) {
        const d = 1 + Math.floor(rnd() * lastDay);
        txs.push({
          userId: user.id,
          accountId: rnd() > 0.5 ? cartao.id : corrente.id,
          categoryId: cats[cat],
          date: day(y, m, d),
          description: descs[Math.floor(rnd() * descs.length)],
          amount: -vary(avg, 0.6),
        });
      }
    }
    if (rnd() > 0.6 && 20 <= lastDay) {
      txs.push({ userId: user.id, accountId: corrente.id, categoryId: cats["Renda extra"], date: day(y, m, 20), description: "Freelance", amount: vary(150000, 0.4) });
    }
    if (25 <= lastDay) {
      txs.push({ userId: user.id, accountId: corrente.id, categoryId: cats["Rendimentos"], date: day(y, m, 25), description: "Rendimento CDB", amount: vary(14000, 0.1) });
    }
    // Pagamento da fatura: transferência da conta corrente para o cartão (fora da DRE).
    if (i > 0) {
      const fatura = -txs
        .filter((t) => t.accountId === cartao.id && t.amount < 0 && (t.date as Date).getUTCMonth() === m - 1 && (t.date as Date).getUTCFullYear() === y)
        .reduce((s, t) => s + t.amount, 0);
      const transf = cats["Transferência entre contas"];
      txs.push({ userId: user.id, accountId: corrente.id, categoryId: transf, date: day(y, m, 28), description: "Pagamento fatura Cartão Visa", amount: -fatura });
      txs.push({ userId: user.id, accountId: cartao.id, categoryId: transf, date: day(y, m, 28), description: "Pagamento recebido", amount: fatura });
    }
  }
  await db.transaction.createMany({ data: txs });

  // Orçamento do ano corrente
  const year = today.getUTCFullYear();
  const plan: Record<string, number> = {
    "Salário": 850000, "Renda extra": 50000, "Rendimentos": 14000,
    "Moradia": 220000, "Contas da casa": 36000, "Saúde": 68000, "Educação": 42000, "Assinaturas": 6000,
    "Alimentação": 110000, "Transporte": 55000, "Lazer": 25000, "Compras": 30000, "Outros": 10000,
    "Financiamentos": 98000, "Aportes": 100000,
  };
  await db.budget.createMany({
    data: Object.entries(plan).flatMap(([cat, amount]) =>
      Array.from({ length: 12 }, (_, i) => ({ userId: user.id, categoryId: cats[cat], year, month: i + 1, amount })),
    ),
  });

  // Metas
  const reserva = await db.goal.create({
    data: { userId: user.id, name: "Reserva de emergência", targetAmount: 3000000, color: "#10b981", deadline: day(year + 1, 6, 30) },
  });
  const viagem = await db.goal.create({
    data: { userId: user.id, name: "Viagem de férias", targetAmount: 1200000, color: "#6366f1", deadline: day(year + 1, 1, 15) },
  });
  for (let i = 0; i < 8; i++) {
    const ref = new Date(Date.UTC(year, today.getUTCMonth() - i, 6, 12));
    await db.goalContribution.create({ data: { goalId: reserva.id, date: ref, amount: 80000 } });
    if (i < 5) await db.goalContribution.create({ data: { goalId: viagem.id, date: ref, amount: 60000 } });
  }

  console.log(`Seed ok: ${txs.length} lançamentos para ${user.email}`);
}

main().finally(() => db.$disconnect());

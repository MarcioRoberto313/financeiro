import "server-only";
import { db } from "./db";
import { yearRange, monthRange } from "./format";
import { GROUP_ORDER, TRANSFER, type CategoryKind, type DreGroup } from "./constants";

/** Categoria que entra na DRE e no orçamento (exclui transferências). */
export type CategoryRow = {
  id: string;
  name: string;
  kind: "RECEITA" | "DESPESA";
  group: DreGroup;
  color: string;
  archived?: boolean;
};

export type AnyCategory = Omit<CategoryRow, "kind" | "group"> & { kind: CategoryKind; group: DreGroup | typeof TRANSFER };

const UNCAT_IN = "__sem_categoria_entrada";
const UNCAT_OUT = "__sem_categoria_saida";

export async function getCategories(userId: string, includeArchived = false): Promise<AnyCategory[]> {
  const rows = await db.category.findMany({
    where: { userId, ...(includeArchived ? {} : { archived: false }) },
    orderBy: [{ kind: "desc" }, { name: "asc" }],
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind as CategoryKind,
    group: c.group as AnyCategory["group"],
    color: c.color,
    archived: c.archived,
  }));
}

const isDreCategory = (c: AnyCategory): c is CategoryRow => c.group !== TRANSFER;

export async function getAccountsWithBalance(userId: string) {
  const [accounts, sums] = await Promise.all([
    db.account.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    db.transaction.groupBy({ by: ["accountId"], where: { userId }, _sum: { amount: true } }),
  ]);
  const byId = new Map(sums.map((s) => [s.accountId, s._sum.amount ?? 0]));
  return accounts.map((a) => ({ ...a, balance: a.initialBalance + (byId.get(a.id) ?? 0) }));
}

const zeros = () => Array.from({ length: 12 }, () => 0);

/**
 * Matriz do ano: para cada categoria, 12 meses de realizado e orçado (valores positivos
 * na "direção natural" da categoria: receita recebida, despesa gasta).
 * Lançamentos sem categoria entram em duas linhas virtuais.
 */
export async function getYearMatrix(userId: string, year: number) {
  const [allCategories, txs, budgets] = await Promise.all([
    getCategories(userId, true),
    db.transaction.findMany({
      where: { userId, date: yearRange(year) },
      select: { categoryId: true, amount: true, date: true },
    }),
    db.budget.findMany({ where: { userId, year } }),
  ]);

  const categories = allCategories.filter(isDreCategory);
  const transferIds = new Set(allCategories.filter((c) => !isDreCategory(c)).map((c) => c.id));
  const kindById = new Map(categories.map((c) => [c.id, c.kind]));
  const actual: Record<string, number[]> = {};
  const budget: Record<string, number[]> = {};
  let hasUncatIn = false;
  let hasUncatOut = false;

  for (const t of txs) {
    if (t.categoryId && transferIds.has(t.categoryId)) continue;
    const m = t.date.getUTCMonth();
    let key = t.categoryId;
    if (!key) {
      key = t.amount >= 0 ? UNCAT_IN : UNCAT_OUT;
      if (key === UNCAT_IN) hasUncatIn = true;
      else hasUncatOut = true;
    }
    const kind = kindById.get(key) ?? (key === UNCAT_IN ? "RECEITA" : "DESPESA");
    (actual[key] ??= zeros())[m] += kind === "RECEITA" ? t.amount : -t.amount;
  }
  for (const b of budgets) {
    if (transferIds.has(b.categoryId)) continue;
    (budget[b.categoryId] ??= zeros())[b.month - 1] += b.amount;
  }

  // Categorias arquivadas só aparecem se tiverem movimento ou orçamento no ano.
  const rows: CategoryRow[] = categories.filter((c) => !c.archived || actual[c.id] || budget[c.id]);
  if (hasUncatIn) rows.push({ id: UNCAT_IN, name: "Entradas sem categoria", kind: "RECEITA", group: "RECEITA", color: "#cbd5e1" });
  if (hasUncatOut) rows.push({ id: UNCAT_OUT, name: "Saídas sem categoria", kind: "DESPESA", group: "VARIAVEL", color: "#cbd5e1" });

  return {
    year,
    categories: rows,
    actual: (id: string) => actual[id] ?? zeros(),
    budget: (id: string) => budget[id] ?? zeros(),
  };
}

export type YearMatrix = Awaited<ReturnType<typeof getYearMatrix>>;

export function sumGroup(matrix: YearMatrix, group: DreGroup, source: "actual" | "budget") {
  const out = zeros();
  for (const c of matrix.categories) {
    if (c.group !== group) continue;
    const vals = matrix[source](c.id);
    for (let i = 0; i < 12; i++) out[i] += vals[i];
  }
  return out;
}

export type DreLine = { key: string; label: string; values: number[]; kind: "group" | "result"; group?: DreGroup };

/** Estrutura da DRE pessoal, mês a mês. */
export function buildDre(matrix: YearMatrix, source: "actual" | "budget"): DreLine[] {
  const g = Object.fromEntries(GROUP_ORDER.map((k) => [k, sumGroup(matrix, k, source)])) as Record<DreGroup, number[]>;
  const calc = (fn: (i: number) => number) => Array.from({ length: 12 }, (_, i) => fn(i));
  return [
    { key: "RECEITA", label: "Receitas", values: g.RECEITA, kind: "group", group: "RECEITA" },
    { key: "FIXA", label: "(−) Despesas fixas", values: g.FIXA, kind: "group", group: "FIXA" },
    { key: "M1", label: "= Margem após despesas fixas", values: calc((i) => g.RECEITA[i] - g.FIXA[i]), kind: "result" },
    { key: "VARIAVEL", label: "(−) Despesas variáveis", values: g.VARIAVEL, kind: "group", group: "VARIAVEL" },
    { key: "M2", label: "= Resultado operacional", values: calc((i) => g.RECEITA[i] - g.FIXA[i] - g.VARIAVEL[i]), kind: "result" },
    { key: "DIVIDA", label: "(−) Dívidas e financiamentos", values: g.DIVIDA, kind: "group", group: "DIVIDA" },
    { key: "M3", label: "= Sobra do mês", values: calc((i) => g.RECEITA[i] - g.FIXA[i] - g.VARIAVEL[i] - g.DIVIDA[i]), kind: "result" },
    { key: "INVESTIMENTO", label: "(−) Investimentos", values: g.INVESTIMENTO, kind: "group", group: "INVESTIMENTO" },
    {
      key: "M4",
      label: "= Saldo de caixa",
      values: calc((i) => g.RECEITA[i] - g.FIXA[i] - g.VARIAVEL[i] - g.DIVIDA[i] - g.INVESTIMENTO[i]),
      kind: "result",
    },
  ];
}

export async function getMonthTransactions(
  userId: string,
  year: number,
  month: number,
  filters: { accountId?: string; categoryId?: string; q?: string } = {},
) {
  return db.transaction.findMany({
    where: {
      userId,
      date: monthRange(year, month),
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.categoryId === "none"
        ? { categoryId: null }
        : filters.categoryId
          ? { categoryId: filters.categoryId }
          : {}),
      ...(filters.q ? { description: { contains: filters.q } } : {}),
    },
    include: { account: { select: { name: true, color: true } }, category: { select: { name: true, color: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

/** Receitas e despesas (sem investimentos) dos últimos `count` meses até o mês de referência. */
export async function getMonthlySeries(userId: string, year: number, month: number, count = 12) {
  const start = new Date(Date.UTC(year, month - count, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const txs = await db.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    select: { amount: true, date: true, category: { select: { kind: true, group: true } } },
  });
  const buckets = Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - count + i, 1));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, receitas: 0, despesas: 0, investimentos: 0 };
  });
  for (const t of txs) {
    if (t.category?.group === TRANSFER) continue;
    const idx = (t.date.getUTCFullYear() - start.getUTCFullYear()) * 12 + t.date.getUTCMonth() - start.getUTCMonth();
    const b = buckets[idx];
    if (!b) continue;
    const kind = t.category?.kind ?? (t.amount >= 0 ? "RECEITA" : "DESPESA");
    if (kind === "RECEITA") b.receitas += t.amount;
    else if (t.category?.group === "INVESTIMENTO") b.investimentos -= t.amount;
    else b.despesas -= t.amount;
  }
  return buckets;
}

export async function getGoals(userId: string) {
  const goals = await db.goal.findMany({
    where: { userId },
    include: { contributions: { orderBy: { date: "desc" } } },
    orderBy: { createdAt: "asc" },
  });
  return goals.map((g) => ({ ...g, saved: g.contributions.reduce((s, c) => s + c.amount, 0) }));
}

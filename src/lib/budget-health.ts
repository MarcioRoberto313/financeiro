import type { SpendingHistory, YearMatrix } from "./data";

export type HealthItem = {
  id: string;
  name: string;
  /** Categoria-mãe, quando a linha é uma subcategoria. */
  parent?: string;
  color: string;
  actual: number;
  budget: number;
  projected: number;
  /** Como a projeção foi feita: histórico dos últimos meses, ritmo atual ou só o lançado. */
  basis: "historico" | "ritmo" | "lancado";
};

export type BudgetHealth = {
  /** Realizado acima do orçado (inclui gasto em linha sem orçamento). */
  over: HealthItem[];
  /** Ainda dentro, mas a projeção passa do orçado. */
  atRisk: HealthItem[];
  /** Maior sobra prevista (orçado − projeção). */
  slack: HealthItem[];
  hasBudget: boolean;
};

/**
 * Linhas de despesa analisadas: as subcategorias (ou a própria categoria, se não tiver).
 * Investimentos ficam de fora: guardar acima do previsto não é problema.
 */
function leaves(matrix: YearMatrix) {
  return matrix.categories
    .filter((c) => c.kind === "DESPESA" && c.group !== "INVESTIMENTO")
    .flatMap((c) =>
      c.children?.length
        ? c.children.map((k) => ({ ...k, parent: c.name, color: c.color }))
        : [{ ...c, parent: undefined as string | undefined }],
    );
}

/** Diferença mínima para não alertar por centavos: 2% do orçado ou R$ 10. */
const relevant = (diff: number, budget: number) => diff > Math.max(1000, budget * 0.02);

function classify(items: HealthItem[]): BudgetHealth {
  items = items.filter((i) => i.actual || i.budget);
  const over = items
    .filter((i) => i.actual > i.budget && relevant(i.actual - i.budget, i.budget))
    .sort((a, b) => b.actual - b.budget - (a.actual - a.budget));
  const overIds = new Set(over.map((i) => i.id));
  const atRisk = items
    .filter((i) => !overIds.has(i.id) && i.budget > 0 && relevant(i.projected - i.budget, i.budget))
    .sort((a, b) => b.projected - b.budget - (a.projected - a.budget));
  const riskIds = new Set(atRisk.map((i) => i.id));
  const slack = items
    .filter((i) => !overIds.has(i.id) && !riskIds.has(i.id) && relevant(i.budget - i.projected, i.budget))
    .sort((a, b) => b.budget - b.projected - (a.budget - a.projected));
  return { over, atRisk, slack, hasBudget: items.some((i) => i.budget > 0) };
}

/** Comparação do período escolhido com o mês corrente: -1 passado, 0 atual, 1 futuro. */
const when = (year: number, month: number, now: Date) =>
  Math.sign(year * 12 + month - (now.getUTCFullYear() * 12 + now.getUTCMonth()));

/**
 * Situação do orçamento num mês (1–12). No mês corrente, a previsão soma ao realizado o
 * que costuma sair depois de hoje (média dos 3 meses anteriores); sem histórico, as
 * despesas variáveis seguem o ritmo do mês a partir da primeira semana.
 */
export function monthHealth(matrix: YearMatrix, month: number, history: SpendingHistory, now = new Date()): BudgetHealth {
  const m = month - 1;
  const period = when(matrix.year, m, now);
  const daysIn = new Date(Date.UTC(matrix.year, month, 0)).getUTCDate();
  const elapsed = now.getUTCDate() / daysIn;

  return classify(
    leaves(matrix).map((c): HealthItem => {
      const actual = matrix.actual(c.id)[m];
      const budget = matrix.budget(c.id)[m];
      const base = { id: c.id, name: c.name, parent: c.parent, color: c.color, actual, budget };
      const avg = history.monthly.get(c.id) ?? 0;
      if (period < 0) return { ...base, projected: actual, basis: "lancado" };
      if (period > 0) return { ...base, projected: Math.max(actual, Math.round(avg)), basis: "historico" };
      if (avg > 0) return { ...base, projected: Math.round(actual + (history.rest.get(c.id) ?? 0)), basis: "historico" };
      if (c.group === "VARIAVEL" && now.getUTCDate() >= 7)
        return { ...base, projected: Math.round(actual / elapsed), basis: "ritmo" };
      return { ...base, projected: actual, basis: "lancado" };
    }),
  );
}

/** Situação do orçamento no ano: realizado + o resto do mês atual + a média mensal nos meses que faltam. */
export function yearHealth(matrix: YearMatrix, history: SpendingHistory, now = new Date()): BudgetHealth {
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const period = Math.sign(matrix.year - now.getUTCFullYear());
  const monthsLeft = 11 - now.getUTCMonth();
  const monthsDone = now.getUTCMonth() + now.getUTCDate() / 31;

  return classify(
    leaves(matrix).map((c): HealthItem => {
      const actual = sum(matrix.actual(c.id));
      const budget = sum(matrix.budget(c.id));
      const base = { id: c.id, name: c.name, parent: c.parent, color: c.color, actual, budget };
      const avg = history.monthly.get(c.id) ?? 0;
      if (period < 0) return { ...base, projected: actual, basis: "lancado" };
      if (period > 0) return { ...base, projected: Math.max(actual, Math.round(avg * 12)), basis: "historico" };
      if (avg > 0)
        return { ...base, projected: Math.round(actual + (history.rest.get(c.id) ?? 0) + avg * monthsLeft), basis: "historico" };
      if (actual > 0 && monthsDone >= 1)
        return { ...base, projected: Math.round((actual / monthsDone) * 12), basis: "ritmo" };
      return { ...base, projected: actual, basis: "lancado" };
    }),
  );
}

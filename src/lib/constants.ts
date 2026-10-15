export type CategoryKind = "RECEITA" | "DESPESA" | "TRANSFERENCIA";
export type DreGroup = "RECEITA" | "FIXA" | "VARIAVEL" | "DIVIDA" | "INVESTIMENTO";

/**
 * Transferências entre contas (ex.: pagamento da fatura do cartão) não são receita
 * nem despesa: ficam fora da DRE e do orçamento para não contar o gasto duas vezes.
 */
export const TRANSFER = "TRANSFERENCIA";

export const GROUP_LABEL: Record<DreGroup, string> = {
  RECEITA: "Receitas",
  FIXA: "Despesas fixas",
  VARIAVEL: "Despesas variáveis",
  DIVIDA: "Dívidas e financiamentos",
  INVESTIMENTO: "Investimentos",
};

export const GROUP_ORDER: DreGroup[] = ["RECEITA", "FIXA", "VARIAVEL", "DIVIDA", "INVESTIMENTO"];

export const ACCOUNT_TYPES: Record<string, string> = {
  CORRENTE: "Conta corrente",
  POUPANCA: "Poupança",
  CARTAO: "Cartão de crédito",
  CARTEIRA: "Carteira",
  INVESTIMENTO: "Investimento",
};

export const DEFAULT_CATEGORIES: { name: string; kind: CategoryKind; group: DreGroup | typeof TRANSFER; color: string }[] = [
  { name: "Transferência entre contas", kind: TRANSFER, group: TRANSFER, color: "#94a3b8" },
  { name: "Salário", kind: "RECEITA", group: "RECEITA", color: "#10b981" },
  { name: "Renda extra", kind: "RECEITA", group: "RECEITA", color: "#34d399" },
  { name: "Rendimentos", kind: "RECEITA", group: "RECEITA", color: "#6ee7b7" },
  { name: "Moradia", kind: "DESPESA", group: "FIXA", color: "#6366f1" },
  { name: "Contas da casa", kind: "DESPESA", group: "FIXA", color: "#818cf8" },
  { name: "Saúde", kind: "DESPESA", group: "FIXA", color: "#0ea5e9" },
  { name: "Educação", kind: "DESPESA", group: "FIXA", color: "#38bdf8" },
  { name: "Assinaturas", kind: "DESPESA", group: "FIXA", color: "#a78bfa" },
  { name: "Alimentação", kind: "DESPESA", group: "VARIAVEL", color: "#f59e0b" },
  { name: "Transporte", kind: "DESPESA", group: "VARIAVEL", color: "#f97316" },
  { name: "Lazer", kind: "DESPESA", group: "VARIAVEL", color: "#ec4899" },
  { name: "Compras", kind: "DESPESA", group: "VARIAVEL", color: "#f43f5e" },
  { name: "Outros", kind: "DESPESA", group: "VARIAVEL", color: "#94a3b8" },
  { name: "Financiamentos", kind: "DESPESA", group: "DIVIDA", color: "#ef4444" },
  { name: "Aportes", kind: "DESPESA", group: "INVESTIMENTO", color: "#14b8a6" },
];

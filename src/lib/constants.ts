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

export type DefaultCategory = {
  name: string;
  kind: CategoryKind;
  group: DreGroup | typeof TRANSFER;
  color: string;
  children?: string[];
};

/** Categorias criadas para cada novo usuário; `children` viram subcategorias. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Transferência entre contas", kind: TRANSFER, group: TRANSFER, color: "#94a3b8" },
  { name: "Salário", kind: "RECEITA", group: "RECEITA", color: "#10b981" },
  { name: "Renda extra", kind: "RECEITA", group: "RECEITA", color: "#34d399" },
  { name: "Rendimentos", kind: "RECEITA", group: "RECEITA", color: "#6ee7b7" },
  {
    name: "Moradia",
    kind: "DESPESA",
    group: "FIXA",
    color: "#6366f1",
    children: ["Aluguel", "Prestação da casa própria", "Condomínio", "IPTU", "Água", "Luz", "Gás", "Internet", "Telefone"],
  },
  {
    name: "Alimentação",
    kind: "DESPESA",
    group: "VARIAVEL",
    color: "#f59e0b",
    children: ["Supermercado", "Feira", "Açougue", "Refeições fora de casa", "Delivery"],
  },
  {
    name: "Transporte",
    kind: "DESPESA",
    group: "VARIAVEL",
    color: "#f97316",
    children: [
      "Combustível",
      "Ônibus / Metrô",
      "Aplicativos de viagem",
      "Estacionamento",
      "IPVA",
      "Licenciamento",
      "Lava rápido",
      "Manutenção do veículo",
      "Seguro do veículo",
    ],
  },
  {
    name: "Saúde",
    kind: "DESPESA",
    group: "FIXA",
    color: "#0ea5e9",
    children: ["Plano de saúde", "Consultas médicas", "Exames", "Farmácia", "Medicamentos de uso contínuo"],
  },
  {
    name: "Educação",
    kind: "DESPESA",
    group: "FIXA",
    color: "#38bdf8",
    children: ["Mensalidade escolar", "Faculdade", "Cursos", "Material didático"],
  },
  {
    name: "Lazer e Estilo de Vida",
    kind: "DESPESA",
    group: "VARIAVEL",
    color: "#ec4899",
    children: ["Passeios", "Restaurantes", "Cinema", "Viagens", "Assinaturas de streaming", "Hobbies"],
  },
  {
    name: "Compromissos Financeiros",
    kind: "DESPESA",
    group: "DIVIDA",
    color: "#ef4444",
    children: ["Fatura do cartão de crédito", "Empréstimos", "Financiamentos", "Dívidas antigas"],
  },
  {
    name: "Reserva e Investimentos",
    kind: "DESPESA",
    group: "INVESTIMENTO",
    color: "#14b8a6",
    children: ["Reserva de emergência", "Investimentos de longo prazo"],
  },
];

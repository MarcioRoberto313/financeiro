export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function param(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Lê ?ano=2026&mes=10 com padrão no mês atual. */
export function getPeriod(sp: Record<string, string | string[] | undefined>) {
  const now = new Date();
  const year = Number(param(sp, "ano")) || now.getFullYear();
  const m = Number(param(sp, "mes"));
  const month = m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  return { year, month };
}

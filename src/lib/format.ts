// Utilitários puros (servidor e cliente).

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formata centavos como moeda. */
export function money(cents: number) {
  return brl.format(cents / 100);
}

export function moneyCompact(cents: number) {
  return brlCompact.format(cents / 100);
}

/** Converte "1.234,56", "1234.56" ou "-R$ 10,00" em centavos. Retorna null se inválido. */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  let s = input.trim().replace(/R\$|\s/g, "");
  if (!s) return null;
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    s = s.replace(/,/g, "");
  } else if (lastComma === -1 && (s.match(/\./g)?.length ?? 0) > 1) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) * (negative ? -1 : 1);
}

/** Centavos -> "1234,56" para preencher inputs. */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function pct(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits).replace(".", ",")}%`;
}

export const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Datas são guardadas ao meio-dia UTC para não "pular" de dia com fuso horário. */
export function dateFromISO(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Data de hoje no fuso local do usuário (yyyy-mm-dd), para valores padrão de formulários. */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function monthRange(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

export function yearRange(year: number) {
  return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
}

// Leitura de extratos (roda no navegador).
import { parseMoney } from "./format";

export type ParsedRow = { date: string; description: string; amount: number; fitId?: string };

/** Decodifica o arquivo tentando UTF-8 e caindo para Windows-1252 (comum em bancos brasileiros). */
export async function readFileText(file: File) {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1252").decode(buf);
}

// ---------- OFX ----------

export function parseOFX(text: string): ParsedRow[] {
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  const tag = (block: string, name: string) => {
    const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
    return m ? m[1].trim() : "";
  };
  const rows: ParsedRow[] = [];
  for (const b of blocks) {
    const dt = tag(b, "DTPOSTED");
    const amount = parseMoney(tag(b, "TRNAMT").replace(",", "."));
    if (dt.length < 8 || amount === null) continue;
    rows.push({
      date: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`,
      description: (tag(b, "MEMO") || tag(b, "NAME") || "(sem descrição)").replace(/\s+/g, " "),
      amount,
      fitId: tag(b, "FITID") || undefined,
    });
  }
  return rows;
}

// ---------- CSV ----------

export function splitCSV(text: string): string[][] {
  const firstLines = text.split(/\r?\n/).slice(0, 5).join("\n");
  const delim = [";", "\t", ","].map((d) => [d, firstLines.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

/** Aceita dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa e aaaa-mm-dd. */
export function parseDate(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

export type CsvMapping = { date: number; description: number; amount: number; debit: number; credit: number };

/** Adivinha as colunas pelo cabeçalho. -1 = não usada. */
export function guessMapping(header: string[]): CsvMapping {
  const h = header.map((x) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const find = (...keys: string[]) => h.findIndex((x) => keys.some((k) => x.includes(k)));
  return {
    date: find("data", "date"),
    description: find("descri", "historico", "lancamento", "estabelecimento", "memo", "title", "titulo"),
    amount: find("valor", "amount", "value", "quantia"),
    debit: find("debito", "saida"),
    credit: find("credito", "entrada"),
  };
}

export function rowsFromCSV(table: string[][], map: CsvMapping, hasHeader: boolean): ParsedRow[] {
  const body = hasHeader ? table.slice(1) : table;
  const out: ParsedRow[] = [];
  for (const r of body) {
    const date = map.date >= 0 ? parseDate(r[map.date] ?? "") : null;
    if (!date) continue;
    let amount: number | null = null;
    if (map.amount >= 0) amount = parseMoney(r[map.amount] ?? "");
    else {
      const c = map.credit >= 0 ? parseMoney(r[map.credit] ?? "") ?? 0 : 0;
      const d = map.debit >= 0 ? parseMoney(r[map.debit] ?? "") ?? 0 : 0;
      amount = Math.abs(c) - Math.abs(d);
    }
    if (amount === null || amount === 0) continue;
    out.push({ date, description: (map.description >= 0 ? r[map.description] : "") || "(sem descrição)", amount });
  }
  return out;
}

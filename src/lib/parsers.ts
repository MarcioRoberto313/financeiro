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

const normalize = (s: string) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Adivinha as colunas pelo cabeçalho. -1 = não usada. */
export function guessMapping(header: string[]): CsvMapping {
  const h = header.map(normalize);
  const used = new Set<number>();
  // Procura as chaves em ordem de prioridade, sem reaproveitar colunas
  // (ex.: "Data Lançamento" é a data, não a descrição).
  const find = (...keys: string[]) => {
    for (const k of keys) {
      const i = h.findIndex((x, idx) => !used.has(idx) && x.includes(k));
      if (i >= 0) {
        used.add(i);
        return i;
      }
    }
    return -1;
  };
  const date = find("data", "date", "dt.");
  const debit = find("debito", "saida");
  const credit = find("credito", "entrada");
  const amount = find("valor", "amount", "value", "quantia", "montante");
  const description = find("descri", "historico", "estabelecimento", "memo", "titulo", "title", "lancamento", "detalhe", "complemento");
  return { date, description, amount, debit, credit };
}

const isMapped = (m: CsvMapping) => m.date >= 0 && (m.amount >= 0 || m.debit >= 0 || m.credit >= 0);

/**
 * Extratos costumam ter linhas de título antes do cabeçalho (banco, agência, período).
 * Procura nas primeiras linhas a que tem colunas de data e valor. -1 = sem cabeçalho.
 */
export function findHeaderRow(table: string[][]) {
  for (let i = 0; i < Math.min(table.length, 30); i++) {
    if (isMapped(guessMapping(table[i]))) return i;
  }
  return -1;
}

/** Sem cabeçalho: deduz as colunas pelo conteúdo (datas, valores e o texto mais longo). */
export function guessMappingFromData(table: string[][]): CsvMapping {
  const sample = table.filter((r) => r.some((c) => parseDate(c ?? ""))).slice(0, 30);
  const cols = Math.max(0, ...sample.map((r) => r.length));
  const score = (fn: (v: string) => boolean) =>
    Array.from({ length: cols }, (_, c) => sample.filter((r) => fn(r[c] ?? "")).length);
  const dates = score((v) => !!parseDate(v));
  const date = dates.indexOf(Math.max(...dates));
  const nums = score((v) => !parseDate(v) && /\d/.test(v) && parseMoney(v) !== null);
  nums[date] = -1;
  const best = Math.max(...nums);
  // Entre colunas numéricas igualmente frequentes, a primeira costuma ser o valor (a última, o saldo).
  const amount = best > 0 ? nums.indexOf(best) : -1;
  const texts = Array.from({ length: cols }, (_, c) =>
    c === date || c === amount ? -1 : sample.reduce((s, r) => s + (parseMoney(r[c] ?? "") === null ? (r[c] ?? "").length : 0), 0),
  );
  const description = texts.indexOf(Math.max(...texts));
  return { date, description, amount, debit: -1, credit: -1 };
}

export function rowsFromCSV(table: string[][], map: CsvMapping, headerRow: number): ParsedRow[] {
  const body = table.slice(headerRow + 1);
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

// ---------- Excel ----------

/** Lê a primeira aba de um .xlsx/.xls como tabela de textos (datas em dd/mm/aaaa). */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellNF: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet?.["!ref"]) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const table: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === undefined || cell.v === null) {
        row.push("");
      } else if (cell.t === "n" && cell.z && XLSX.SSF.is_date(cell.z)) {
        // Converte o número de série do Excel sem passar por fuso horário
        const d = XLSX.SSF.parse_date_code(cell.v as number);
        row.push(`${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}`);
      } else if (cell.t === "d" && cell.v instanceof Date) {
        const d = cell.v;
        row.push(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`);
      } else if (cell.t === "n") {
        row.push(String(cell.v)); // número puro, com ponto decimal
      } else {
        row.push(String(cell.w ?? cell.v).trim());
      }
    }
    if (row.some((v) => v !== "")) table.push(row);
  }
  return table;
}

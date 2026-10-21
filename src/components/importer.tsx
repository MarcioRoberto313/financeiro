"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { importTransactions, suggestCategories } from "@/app/actions";
import { formatDate, money } from "@/lib/format";
import {
  findHeaderRow,
  guessMapping,
  guessMappingFromData,
  parseOFX,
  readFileText,
  readSpreadsheet,
  rowsFromCSV,
  splitCSV,
  type CsvMapping,
  type ParsedRow,
} from "@/lib/parsers";
import { CategorySelect, type CategoryOption, type Option } from "./transaction-form";

type Row = ParsedRow & { selected: boolean; categoryId: string | null };
type Sheet = { table: string[][]; map: CsvMapping; headerRow: number };

/** Monta o mapeamento inicial: cabeçalho encontrado, ou dedução pelo conteúdo. */
function prepareSheet(table: string[][]): Sheet {
  const headerRow = findHeaderRow(table);
  return headerRow >= 0
    ? { table, headerRow, map: guessMapping(table[headerRow]) }
    : { table, headerRow: -1, map: guessMappingFromData(table) };
}

export function Importer({ accounts, categories }: { accounts: Option[]; categories: CategoryOption[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState<Sheet | null>(null);
  const [ofxRows, setOfxRows] = useState<ParsedRow[] | null>(null);
  const [invert, setInvert] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, Partial<Row>>>({});
  const [suggested, setSuggested] = useState<(string | null)[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const parsed: ParsedRow[] = useMemo(() => {
    const base = ofxRows ?? (csv ? rowsFromCSV(csv.table, csv.map, csv.headerRow) : []);
    return invert ? base.map((r) => ({ ...r, amount: -r.amount })) : base;
  }, [csv, ofxRows, invert]);

  const rows: Row[] = parsed.map((r, i) => ({
    ...r,
    selected: true,
    categoryId: suggested[i] ?? null,
    ...overrides[i],
  }));

  const refreshSuggestions = (list: ParsedRow[]) =>
    start(async () => setSuggested(await suggestCategories(list.map((r) => r.description))));

  async function onFile(file: File) {
    setResult(null);
    setError(null);
    setOverrides({});
    setFileName(file.name);
    setCsv(null);
    setOfxRows(null);
    try {
      if (/\.xlsx?$/i.test(file.name)) {
        const table = await readSpreadsheet(file);
        if (!table.length) return setError("A planilha está vazia.");
        loadSheet(prepareSheet(table));
        return;
      }
      const text = await readFileText(file);
      if (/\.ofx$/i.test(file.name) || /<OFX>/i.test(text)) {
        const list = parseOFX(text);
        if (!list.length) return setError("Nenhum lançamento encontrado no OFX.");
        setOfxRows(list);
        refreshSuggestions(list);
      } else {
        const table = splitCSV(text);
        if (!table.length) return setError("Arquivo vazio.");
        loadSheet(prepareSheet(table));
      }
    } catch {
      setError("Não foi possível ler o arquivo. Use um extrato OFX, uma planilha do Excel (.xlsx) ou um CSV.");
    }
  }

  function loadSheet(next: Sheet) {
    setCsv(next);
    setOverrides({});
    refreshSuggestions(rowsFromCSV(next.table, next.map, next.headerRow));
  }

  const selected = rows.filter((r) => r.selected);
  const total = selected.reduce((s, r) => s + r.amount, 0);

  function doImport() {
    setError(null);
    start(async () => {
      const res = await importTransactions(
        accountId,
        selected.map((r) => ({ date: r.date, description: r.description, amount: r.amount, categoryId: r.categoryId, fitId: r.fitId })),
      );
      if ("error" in res && res.error) return setError(res.error);
      setResult(
        `${res.imported} lançamento(s) importado(s)` + (res.skipped ? `, ${res.skipped} ignorado(s) (duplicados ou inválidos).` : "."),
      );
      setCsv(null);
      setOfxRows(null);
      setFileName("");
    });
  }

  const width = csv ? Math.max(...csv.table.slice(0, 40).map((r) => r.length)) : 0;
  const header = csv
    ? Array.from({ length: width }, (_, i) => {
        const name = csv.headerRow >= 0 ? csv.table[csv.headerRow][i] : "";
        return name ? `${name} (col. ${i + 1})` : `Coluna ${i + 1}`;
      })
    : [];
  const colSelect = (key: keyof CsvMapping, label: string) =>
    csv && (
      <div>
        <label className="label">{label}</label>
        <select
          className="input"
          value={csv.map[key]}
          onChange={(e) => loadSheet({ ...csv, map: { ...csv.map, [key]: Number(e.target.value) } })}
        >
          <option value={-1}>—</option>
          {header.map((h, i) => (
            <option key={i} value={i}>
              {h}
            </option>
          ))}
        </select>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="card grid gap-4 md:grid-cols-[1fr_2fr]">
        <div>
          <label className="label">Conta de destino</label>
          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 hover:border-primary">
          <FileUp className="text-primary" />
          <div className="text-sm">
            <p className="font-medium">{fileName || "Escolha um arquivo: Excel, CSV ou OFX"}</p>
            <p className="text-muted">Planilha do Excel (.xlsx), extrato do banco (OFX) ou CSV.</p>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.ofx,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onFile(e.target.files[0]);
              e.target.value = ""; // permite escolher o mesmo arquivo de novo
            }}
          />
        </label>
      </div>

      {result && (
        <div className="card border-positive/40 bg-positive/5 text-sm">
          {result}{" "}
          <Link href="/lancamentos" className="font-medium text-primary">
            Ver lançamentos
          </Link>
        </div>
      )}
      {error && <div className="card border-negative/40 text-sm text-negative">{error}</div>}

      {csv && (
        <div className="card">
          <h2 className="mb-1 font-semibold">Colunas da planilha</h2>
          <p className="mb-3 text-sm text-muted">Confira se cada campo aponta para a coluna certa do arquivo.</p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="label">Linha do cabeçalho</label>
              <select
                className="input"
                value={csv.headerRow}
                onChange={(e) => {
                  const headerRow = Number(e.target.value);
                  loadSheet({
                    ...csv,
                    headerRow,
                    map: headerRow >= 0 ? guessMapping(csv.table[headerRow]) : guessMappingFromData(csv.table),
                  });
                }}
              >
                <option value={-1}>Sem cabeçalho</option>
                {csv.table.slice(0, 30).map((_, i) => (
                  <option key={i} value={i}>
                    Linha {i + 1}
                  </option>
                ))}
              </select>
            </div>
            {colSelect("date", "Data")}
            {colSelect("description", "Descrição")}
            {colSelect("amount", "Valor (com sinal)")}
            {colSelect("debit", "Débito (se separado)")}
            {colSelect("credit", "Crédito (se separado)")}
          </div>

          {rows.length === 0 && (
            <div className="mt-4 rounded-xl border border-warning/50 bg-warning/5 p-3 text-sm">
              <p className="font-medium text-warning">Nenhum lançamento reconhecido ainda.</p>
              <p className="text-muted">
                Ajuste a coluna de <b>Data</b> e a de <b>Valor</b> (ou Débito/Crédito) acima. Veja o início do arquivo:
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="table text-xs">
                  <tbody>
                    {csv.table.slice(0, 8).map((r, i) => (
                      <tr key={i} className={i === csv.headerRow ? "font-semibold" : ""}>
                        <td className="text-muted">{i + 1}</td>
                        {Array.from({ length: width }, (_, c) => (
                          <td key={c} className="whitespace-nowrap">
                            {r[c]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="card p-0">
          {/* Fica visível ao rolar a página (abaixo do cabeçalho fixo no celular) */}
          <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-border bg-surface p-4 lg:top-0">
            <div className="text-sm">
              <span className="font-medium">{selected.length}</span> de {rows.length} selecionados · saldo{" "}
              <span className={total >= 0 ? "text-positive" : "text-negative"}>{money(total)}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
                Inverter sinais (fatura de cartão)
              </label>
              <button className="btn btn-primary" disabled={pending || !selected.length || !accountId} onClick={doImport}>
                {pending ? "Processando…" : `Importar ${selected.length}`}
              </button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="table">
              <thead className="sticky top-0 bg-surface">
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.length === rows.length}
                      onChange={(e) =>
                        setOverrides((o) =>
                          Object.fromEntries(rows.map((_, i) => [i, { ...o[i], selected: e.target.checked }])),
                        )
                      }
                    />
                  </th>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th className="min-w-44">Categoria</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.selected ? "" : "opacity-40"}>
                    <td>
                      <input
                        type="checkbox"
                        checked={r.selected}
                        onChange={(e) => setOverrides((o) => ({ ...o, [i]: { ...o[i], selected: e.target.checked } }))}
                      />
                    </td>
                    <td className="whitespace-nowrap text-muted">{formatDate(`${r.date}T12:00:00Z`)}</td>
                    <td>{r.description}</td>
                    <td>
                      <CategorySelect
                        key={`${i}-${r.categoryId}-${r.amount > 0}`}
                        categories={categories}
                        kind={r.amount > 0 ? "RECEITA" : "DESPESA"}
                        defaultValue={r.categoryId ?? ""}
                        className="input py-1 text-xs"
                        onChange={(v) => setOverrides((o) => ({ ...o, [i]: { ...o[i], categoryId: v || null } }))}
                      />
                    </td>
                    <td className={`num ${r.amount > 0 ? "text-positive" : ""}`}>{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

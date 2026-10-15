"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { importTransactions, suggestCategories } from "@/app/actions";
import { formatDate, money } from "@/lib/format";
import {
  guessMapping,
  parseOFX,
  readFileText,
  rowsFromCSV,
  splitCSV,
  type CsvMapping,
  type ParsedRow,
} from "@/lib/parsers";
import { CategorySelect, type CategoryOption, type Option } from "./transaction-form";

type Row = ParsedRow & { selected: boolean; categoryId: string | null };

export function Importer({ accounts, categories }: { accounts: Option[]; categories: CategoryOption[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState<{ table: string[][]; map: CsvMapping; hasHeader: boolean } | null>(null);
  const [ofxRows, setOfxRows] = useState<ParsedRow[] | null>(null);
  const [invert, setInvert] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, Partial<Row>>>({});
  const [suggested, setSuggested] = useState<(string | null)[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const parsed: ParsedRow[] = useMemo(() => {
    const base = ofxRows ?? (csv ? rowsFromCSV(csv.table, csv.map, csv.hasHeader) : []);
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
    const text = await readFileText(file);
    if (/\.ofx$/i.test(file.name) || /<OFX>/i.test(text)) {
      const list = parseOFX(text);
      if (!list.length) return setError("Nenhum lançamento encontrado no OFX.");
      setCsv(null);
      setOfxRows(list);
      refreshSuggestions(list);
    } else {
      const table = splitCSV(text);
      if (table.length < 1) return setError("Arquivo vazio.");
      const map = guessMapping(table[0]);
      const next = { table, map, hasHeader: map.date >= 0 || map.amount >= 0 || map.description >= 0 };
      if (!next.hasHeader) next.map = { date: 0, description: 1, amount: 2, debit: -1, credit: -1 };
      setOfxRows(null);
      setCsv(next);
      refreshSuggestions(rowsFromCSV(next.table, next.map, next.hasHeader));
    }
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

  const header = csv ? (csv.hasHeader ? csv.table[0] : csv.table[0].map((_, i) => `Coluna ${i + 1}`)) : [];
  const colSelect = (key: keyof CsvMapping, label: string) =>
    csv && (
      <div>
        <label className="label">{label}</label>
        <select
          className="input"
          value={csv.map[key]}
          onChange={(e) => {
            const next = { ...csv, map: { ...csv.map, [key]: Number(e.target.value) } };
            setCsv(next);
            setOverrides({});
            refreshSuggestions(rowsFromCSV(next.table, next.map, next.hasHeader));
          }}
        >
          <option value={-1}>—</option>
          {header.map((h, i) => (
            <option key={i} value={i}>
              {h || `Coluna ${i + 1}`}
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
            <p className="font-medium">{fileName || "Escolha um arquivo CSV ou OFX"}</p>
            <p className="text-muted">Extrato do banco (OFX) ou planilha salva como CSV.</p>
          </div>
          <input
            type="file"
            accept=".csv,.ofx,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
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
          <h2 className="mb-3 font-semibold">Colunas do CSV</h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {colSelect("date", "Data")}
            {colSelect("description", "Descrição")}
            {colSelect("amount", "Valor (com sinal)")}
            {colSelect("debit", "Débito (se separado)")}
            {colSelect("credit", "Crédito (se separado)")}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={csv.hasHeader}
              onChange={(e) => setCsv({ ...csv, hasHeader: e.target.checked })}
            />
            A primeira linha é cabeçalho
          </label>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
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

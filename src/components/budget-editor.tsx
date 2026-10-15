"use client";

import { Copy } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { budgetFromPreviousYear, saveBudget } from "@/app/actions";
import { GROUP_LABEL, GROUP_ORDER, type DreGroup } from "@/lib/constants";
import { MONTHS_SHORT, centsToInput, money, parseMoney } from "@/lib/format";

type Cat = { id: string; name: string; group: DreGroup; color: string };

export function BudgetEditor({ year, categories, initial }: { year: number; categories: Cat[]; initial: Record<string, number[]> }) {
  const [values, setValues] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, (initial[c.id] ?? Array(12).fill(0)).map((v) => (v ? centsToInput(v) : ""))])),
  );
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const cents = (id: string, m: number) => parseMoney(values[id]?.[m] ?? "") ?? 0;
  const set = (id: string, m: number, v: string) => {
    setValues((s) => ({ ...s, [id]: s[id].map((x, i) => (i === m ? v : x)) }));
    setDirty(true);
    setMsg(null);
  };
  const fillRow = (id: string) => {
    const first = values[id].find((v) => v) ?? "";
    setValues((s) => ({ ...s, [id]: Array(12).fill(first) }));
    setDirty(true);
  };

  const groupTotals = useMemo(() => {
    const t: Partial<Record<DreGroup, number[]>> = {};
    for (const c of categories) {
      const arr = (t[c.group] ??= Array(12).fill(0));
      for (let m = 0; m < 12; m++) arr[m] += parseMoney(values[c.id]?.[m] ?? "") ?? 0;
    }
    return t;
  }, [values, categories]);

  const result = Array.from({ length: 12 }, (_, m) =>
    GROUP_ORDER.reduce((s, g) => s + (g === "RECEITA" ? 1 : -1) * (groupTotals[g]?.[m] ?? 0), 0),
  );

  const save = () =>
    start(async () => {
      const entries = categories.flatMap((c) => Array.from({ length: 12 }, (_, m) => ({ categoryId: c.id, month: m + 1, amount: cents(c.id, m) })));
      await saveBudget(year, entries);
      setDirty(false);
      setMsg("Orçamento salvo.");
    });

  const fromPrevious = () => {
    if (!confirm(`Substituir o orçamento de ${year} pela média mensal realizada em ${year - 1}?`)) return;
    start(async () => {
      const res = await budgetFromPreviousYear(year);
      if (res && "error" in res && res.error) setMsg(res.error);
      else window.location.reload();
    });
  };

  return (
    <div className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <p className="text-sm text-muted">
          Digite os valores mensais. Use <Copy size={12} className="inline" /> para repetir o primeiro valor da linha em todos os meses.
        </p>
        <div className="flex items-center gap-2">
          {msg && <span className="text-sm text-positive">{msg}</span>}
          <button className="btn btn-ghost" onClick={fromPrevious} disabled={pending}>
            Usar média de {year - 1}
          </button>
          <button className="btn btn-primary" onClick={save} disabled={pending || !dirty}>
            {pending ? "Salvando…" : "Salvar orçamento"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-48 bg-surface">Categoria</th>
              {MONTHS_SHORT.map((m) => (
                <th key={m} className="num min-w-24">
                  {m}
                </th>
              ))}
              <th className="num min-w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {GROUP_ORDER.map((g) => {
              const cats = categories.filter((c) => c.group === g);
              if (!cats.length) return null;
              const tot = groupTotals[g] ?? Array(12).fill(0);
              return [
                <tr key={g} className="bg-surface-2">
                  <td className="sticky left-0 z-10 bg-surface-2 font-semibold">{GROUP_LABEL[g]}</td>
                  {tot.map((v, m) => (
                    <td key={m} className="num font-semibold">
                      {money(v)}
                    </td>
                  ))}
                  <td className="num font-semibold">{money(tot.reduce((a, b) => a + b, 0))}</td>
                </tr>,
                ...cats.map((c) => {
                  const total = Array.from({ length: 12 }, (_, m) => cents(c.id, m)).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={c.id}>
                      <td className="sticky left-0 z-10 bg-surface">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                          <span className="flex-1">{c.name}</span>
                          <button className="text-muted hover:text-primary" title="Repetir em todos os meses" onClick={() => fillRow(c.id)}>
                            <Copy size={13} />
                          </button>
                        </div>
                      </td>
                      {values[c.id].map((v, m) => (
                        <td key={m} className="px-1 py-1">
                          <input
                            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-right tabular-nums outline-none hover:border-border focus:border-primary focus:bg-surface"
                            inputMode="decimal"
                            value={v}
                            placeholder="0"
                            onChange={(e) => set(c.id, m, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="num font-medium">{money(total)}</td>
                    </tr>
                  );
                }),
              ];
            })}
            <tr className="bg-primary-soft">
              <td className="sticky left-0 z-10 bg-primary-soft font-semibold">Saldo projetado</td>
              {result.map((v, m) => (
                <td key={m} className={`num font-semibold ${v < 0 ? "text-negative" : "text-positive"}`}>
                  {money(v)}
                </td>
              ))}
              <td className="num font-semibold">{money(result.reduce((a, b) => a + b, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

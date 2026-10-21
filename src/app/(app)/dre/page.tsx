import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { buildDre, getYearMatrix, type DreLine, type YearMatrix } from "@/lib/data";
import { getPeriod, param, type SearchParams } from "@/lib/period";
import { MONTHS_SHORT, money, pct } from "@/lib/format";
import { PageHeader, PageSkeleton, Signed } from "@/components/ui";
import { PeriodPicker } from "@/components/period-picker";
import { UrlTabs } from "@/components/url-filters";

export const metadata = { title: "DRE" };

export default function DrePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dre searchParams={searchParams} />
    </Suspense>
  );
}

type Mode = "realizado" | "orcado" | "comparativo";
const total = (v: number[], upto = 12) => v.slice(0, upto).reduce((a, b) => a + b, 0);

async function Dre({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { year, month } = getPeriod(sp);
  const mode = (["realizado", "orcado", "comparativo"].includes(param(sp, "modo") ?? "") ? param(sp, "modo") : "realizado") as Mode;
  const matrix = await getYearMatrix(user.id, year);
  const current = { ano: String(year), mes: String(month), modo: mode };

  return (
    <>
      <PageHeader
        title="DRE"
        subtitle="Demonstrativo de resultado: de onde veio e para onde foi o seu dinheiro."
        actions={
          <>
            <UrlTabs
              name="modo"
              value={mode}
              current={current}
              options={[
                { value: "realizado", label: "Realizado" },
                { value: "orcado", label: "Orçado" },
                { value: "comparativo", label: "Comparativo" },
              ]}
            />
            <PeriodPicker year={year} month={month} mode={mode === "comparativo" ? "month" : "year"} extra={{ modo: mode }} />
          </>
        }
      />
      {mode === "comparativo" ? (
        <Comparativo matrix={matrix} month={month} />
      ) : (
        <Mensal matrix={matrix} source={mode === "orcado" ? "budget" : "actual"} />
      )}
    </>
  );
}

/** Categorias do grupo, cada uma seguida das suas subcategorias (sub = true). */
function categoryRows(matrix: YearMatrix, line: DreLine) {
  return matrix.categories
    .filter((c) => c.group === line.group)
    .flatMap((c) => [{ ...c, sub: false }, ...(c.children ?? []).map((s) => ({ ...s, sub: true }))]);
}

function Mensal({ matrix, source }: { matrix: YearMatrix; source: "actual" | "budget" }) {
  const lines = buildDre(matrix, source);
  const receitaTotal = total(lines[0].values);
  return (
    <div className="card p-0">
      <div className="overflow-x-auto">
        <table className="table text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-56 bg-surface">Conta</th>
              {MONTHS_SHORT.map((m) => (
                <th key={m} className="num min-w-24">
                  {m}
                </th>
              ))}
              <th className="num min-w-28">Total</th>
              <th className="num">AV%</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const isResult = line.kind === "result";
              const t = total(line.values);
              return [
                <tr key={line.key} className={isResult ? "bg-primary-soft font-semibold" : "bg-surface-2 font-semibold"}>
                  <td className={`sticky left-0 z-10 ${isResult ? "bg-primary-soft" : "bg-surface-2"}`}>{line.label}</td>
                  {line.values.map((v, i) => (
                    <td key={i} className={`num ${isResult && v < 0 ? "text-negative" : ""}`}>
                      {money(v)}
                    </td>
                  ))}
                  <td className={`num ${isResult && t < 0 ? "text-negative" : ""}`}>{money(t)}</td>
                  <td className="num text-muted">{receitaTotal ? pct(t / receitaTotal, 1) : "—"}</td>
                </tr>,
                ...(line.kind === "group"
                  ? categoryRows(matrix, line).map((c) => {
                      const vals = matrix[source](c.id);
                      const ct = total(vals);
                      if (!ct) return null;
                      return (
                        <tr key={`${line.key}-${c.id}`} className={c.sub ? "text-muted/80 text-[11px]" : "text-muted"}>
                          <td className={`sticky left-0 z-10 bg-surface ${c.sub ? "pl-10" : "pl-6"}`}>{c.sub ? `↳ ${c.name}` : c.name}</td>
                          {vals.map((v, i) => (
                            <td key={i} className="num">
                              {v ? money(v) : "–"}
                            </td>
                          ))}
                          <td className="num">{money(ct)}</td>
                          <td className="num">{receitaTotal ? pct(ct / receitaTotal, 1) : "—"}</td>
                        </tr>
                      );
                    })
                  : []),
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border p-3 text-xs text-muted">AV% = participação de cada linha sobre o total de receitas do ano.</p>
    </div>
  );
}

function Comparativo({ matrix, month }: { matrix: YearMatrix; month: number }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ComparativoBlock matrix={matrix} upto={month} title={`Acumulado até ${MONTHS_SHORT[month - 1]}/${matrix.year}`} />
      <ComparativoBlock matrix={matrix} upto={12} title={`Ano completo ${matrix.year}`} />
    </div>
  );
}

// Linhas de despesa: realizar menos que o orçado é favorável.
const favorable = (line: DreLine, diff: number) => (line.kind === "result" || line.group === "RECEITA" ? diff >= 0 : diff <= 0);

function ComparativoBlock({ matrix, upto, title }: { matrix: YearMatrix; upto: number; title: string }) {
  const real = buildDre(matrix, "actual");
  const orc = buildDre(matrix, "budget");
  return (
    <div className="card p-0">
      <h2 className="border-b border-border p-4 font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Conta</th>
              <th className="num">Orçado</th>
              <th className="num">Realizado</th>
              <th className="num">Diferença</th>
              <th className="num">Execução</th>
            </tr>
          </thead>
          <tbody>
            {real.map((line, idx) => {
              const r = total(line.values, upto);
              const o = total(orc[idx].values, upto);
              const isResult = line.kind === "result";
              return [
                <tr key={line.key} className={isResult ? "bg-primary-soft font-semibold" : "bg-surface-2 font-semibold"}>
                  <td>{line.label}</td>
                  <td className="num">{money(o)}</td>
                  <td className="num">{money(r)}</td>
                  <td className="num">
                    <Signed cents={r - o} favorable={favorable(line, r - o)} />
                  </td>
                  <td className="num">{o ? pct(r / o) : "—"}</td>
                </tr>,
                ...(line.kind === "group"
                  ? categoryRows(matrix, line).map((c) => {
                      const cr = total(matrix.actual(c.id), upto);
                      const co = total(matrix.budget(c.id), upto);
                      if (!cr && !co) return null;
                      return (
                        <tr key={`${line.key}-${c.id}`} className={c.sub ? "text-xs" : "text-sm"}>
                          <td className={`text-muted ${c.sub ? "pl-10" : "pl-6"}`}>{c.sub ? `↳ ${c.name}` : c.name}</td>
                          <td className="num text-muted">{money(co)}</td>
                          <td className="num">{money(cr)}</td>
                          <td className="num">
                            <Signed cents={cr - co} favorable={favorable(line, cr - co)} />
                          </td>
                          <td className="num text-muted">{co ? pct(cr / co) : "—"}</td>
                        </tr>
                      );
                    })
                  : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

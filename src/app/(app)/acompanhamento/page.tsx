import { Suspense } from "react";
import { CircleAlert } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getYearMatrix, sumGroup } from "@/lib/data";
import { getPeriod, param, type SearchParams } from "@/lib/period";
import { GROUP_LABEL, GROUP_ORDER } from "@/lib/constants";
import { MONTHS_LONG, MONTHS_SHORT, money, pct } from "@/lib/format";
import { Dot, PageHeader, PageSkeleton, Progress, Signed, StatCard } from "@/components/ui";
import { PeriodPicker } from "@/components/period-picker";
import { UrlTabs } from "@/components/url-filters";
import { BudgetActualChart } from "@/components/charts";

export const metadata = { title: "Orçado x Realizado" };

export default function AcompanhamentoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Acompanhamento searchParams={searchParams} />
    </Suspense>
  );
}

type View = "mes" | "acumulado" | "ano";

async function Acompanhamento({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { year, month } = getPeriod(sp);
  const view = (["mes", "acumulado", "ano"].includes(param(sp, "visao") ?? "") ? param(sp, "visao") : "mes") as View;
  const matrix = await getYearMatrix(user.id, year);

  // Meses considerados conforme a visão escolhida.
  const months = view === "mes" ? [month - 1] : view === "acumulado" ? [...Array(month).keys()] : [...Array(12).keys()];
  const pick = (arr: number[]) => months.reduce((s, m) => s + arr[m], 0);
  const periodLabel =
    view === "mes" ? `${MONTHS_LONG[month - 1]} de ${year}` : view === "acumulado" ? `Jan a ${MONTHS_SHORT[month - 1]} de ${year}` : `Ano de ${year}`;

  const groups = GROUP_ORDER.map((g) => {
    const cats = matrix.categories
      .filter((c) => c.group === g)
      .map((c) => ({ ...c, orcado: pick(matrix.budget(c.id)), realizado: pick(matrix.actual(c.id)) }))
      .filter((c) => c.orcado || c.realizado);
    return {
      group: g,
      cats,
      orcado: cats.reduce((s, c) => s + c.orcado, 0),
      realizado: cats.reduce((s, c) => s + c.realizado, 0),
    };
  });
  const byGroup = Object.fromEntries(groups.map((g) => [g.group, g]));
  const rec = byGroup.RECEITA;
  const desp = groups.filter((g) => g.group !== "RECEITA");
  const despOrc = desp.reduce((s, g) => s + g.orcado, 0);
  const despReal = desp.reduce((s, g) => s + g.realizado, 0);
  const resOrc = rec.orcado - despOrc;
  const resReal = rec.realizado - despReal;

  const estouros = groups
    .filter((g) => g.group !== "RECEITA")
    .flatMap((g) => g.cats)
    .filter((c) => c.orcado > 0 && c.realizado > c.orcado)
    .sort((a, b) => b.realizado - b.orcado - (a.realizado - a.orcado));

  const despesasMes = (src: "actual" | "budget") => {
    const out = Array(12).fill(0) as number[];
    for (const g of GROUP_ORDER.filter((x) => x !== "RECEITA")) sumGroup(matrix, g, src).forEach((v, i) => (out[i] += v));
    return out;
  };
  const dOrc = despesasMes("budget");
  const dReal = despesasMes("actual");
  const chart = MONTHS_SHORT.map((label, i) => ({ label, orcado: dOrc[i], realizado: dReal[i] }));

  const current = { ano: String(year), mes: String(month), visao: view };

  return (
    <>
      <PageHeader
        title="Orçado x Realizado"
        subtitle={`Comparação do que foi projetado com o que aconteceu: ${periodLabel}.`}
        actions={
          <>
            <UrlTabs
              name="visao"
              value={view}
              current={current}
              options={[
                { value: "mes", label: "Mês" },
                { value: "acumulado", label: "Acumulado" },
                { value: "ano", label: "Ano" },
              ]}
            />
            <PeriodPicker year={year} month={month} extra={{ visao: view }} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receitas realizadas"
          value={money(rec.realizado)}
          hint={<>Orçado {money(rec.orcado)} · {rec.orcado ? pct(rec.realizado / rec.orcado) : "—"}</>}
          tone="positive"
        />
        <StatCard
          label="Despesas realizadas"
          value={money(despReal)}
          hint={<>Orçado {money(despOrc)} · {despOrc ? pct(despReal / despOrc) : "—"}</>}
          tone="negative"
        />
        <StatCard
          label="Resultado realizado"
          value={money(resReal)}
          tone={resReal >= 0 ? "positive" : "negative"}
          hint={<>Projetado {money(resOrc)}</>}
        />
        <StatCard
          label="Desvio do resultado"
          value={money(resReal - resOrc)}
          tone={resReal - resOrc >= 0 ? "positive" : "negative"}
          hint={resReal - resOrc >= 0 ? "Melhor que o projetado" : "Pior que o projetado"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <h2 className="mb-4 font-semibold">Despesas totais por mês — {year}</h2>
          <BudgetActualChart data={chart} />
        </section>
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <CircleAlert size={18} className="text-warning" /> Categorias acima do orçado
          </h2>
          {estouros.length ? (
            <ul className="space-y-3">
              {estouros.slice(0, 8).map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Dot color={c.color} />
                      {c.name}
                    </span>
                    <span className="font-medium text-negative tabular-nums">+{money(c.realizado - c.orcado)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {money(c.realizado)} de {money(c.orcado)} ({pct(c.realizado / c.orcado)})
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhuma categoria estourou o orçamento neste período.</p>
          )}
        </section>
      </div>

      <section className="card mt-4 p-0">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="num">Orçado</th>
                <th className="num">Realizado</th>
                <th className="num">Diferença</th>
                <th className="num">Execução</th>
                <th className="w-40" />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                if (!g.cats.length) return null;
                const isRec = g.group === "RECEITA";
                return [
                  <tr key={g.group} className="bg-surface-2 font-semibold">
                    <td>{GROUP_LABEL[g.group]}</td>
                    <td className="num">{money(g.orcado)}</td>
                    <td className="num">{money(g.realizado)}</td>
                    <td className="num">
                      <Signed cents={g.realizado - g.orcado} favorable={isRec ? g.realizado >= g.orcado : g.realizado <= g.orcado} />
                    </td>
                    <td className="num">{g.orcado ? pct(g.realizado / g.orcado) : "—"}</td>
                    <td />
                  </tr>,
                  ...g.cats.map((c) => {
                    const ratio = c.orcado ? c.realizado / c.orcado : c.realizado ? 2 : 0;
                    const over = !isRec && ratio > 1;
                    return (
                      <tr key={c.id}>
                        <td>
                          <span className="flex items-center gap-2 pl-3">
                            <Dot color={c.color} />
                            {c.name}
                          </span>
                        </td>
                        <td className="num text-muted">{money(c.orcado)}</td>
                        <td className="num">{money(c.realizado)}</td>
                        <td className="num">
                          <Signed cents={c.realizado - c.orcado} favorable={isRec ? c.realizado >= c.orcado : c.realizado <= c.orcado} />
                        </td>
                        <td className={`num ${over ? "font-medium text-negative" : ""}`}>{c.orcado ? pct(ratio) : "sem orçamento"}</td>
                        <td>
                          <Progress value={ratio} color={c.color} over={over} />
                        </td>
                      </tr>
                    );
                  }),
                ];
              })}
              <tr className="bg-primary-soft font-semibold">
                <td>Resultado</td>
                <td className="num">{money(resOrc)}</td>
                <td className="num">{money(resReal)}</td>
                <td className="num">
                  <Signed cents={resReal - resOrc} />
                </td>
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

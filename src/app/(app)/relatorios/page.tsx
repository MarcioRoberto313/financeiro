import { Suspense } from "react";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getYearMatrix } from "@/lib/data";
import { TRANSFER } from "@/lib/constants";
import { getPeriod, type SearchParams } from "@/lib/period";
import { MONTHS_SHORT, formatDate, money, pct, yearRange } from "@/lib/format";
import { Dot, PageHeader, PageSkeleton } from "@/components/ui";
import { PeriodPicker } from "@/components/period-picker";
import { BalanceChart, StackedCategoryChart } from "@/components/charts";

export const metadata = { title: "Relatórios" };

export default function RelatoriosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Relatorios searchParams={searchParams} />
    </Suspense>
  );
}

async function Relatorios({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { year, month } = getPeriod(await searchParams);
  const range = yearRange(year);
  const [matrix, accounts, before, yearTxs, top] = await Promise.all([
    getYearMatrix(user.id, year),
    db.account.aggregate({ where: { userId: user.id }, _sum: { initialBalance: true } }),
    db.transaction.aggregate({ where: { userId: user.id, date: { lt: range.gte } }, _sum: { amount: true } }),
    db.transaction.findMany({ where: { userId: user.id, date: range }, select: { amount: true, date: true } }),
    db.transaction.findMany({
      where: { userId: user.id, date: range, amount: { lt: 0 }, category: { group: { notIn: ["INVESTIMENTO", TRANSFER] } } },
      orderBy: { amount: "asc" },
      take: 10,
      include: { category: { select: { name: true, color: true } } },
    }),
  ]);

  // Saldo acumulado no fim de cada mês (todas as contas).
  const opening = (accounts._sum.initialBalance ?? 0) + (before._sum.amount ?? 0);
  const net = Array(12).fill(0) as number[];
  for (const t of yearTxs) net[t.date.getUTCMonth()] += t.amount;
  const balance = MONTHS_SHORT.map((label, i) => ({
    label,
    saldo: opening + net.slice(0, i + 1).reduce((a, b) => a + b, 0),
  }));

  const expenseCats = matrix.categories
    .filter((c) => c.kind === "DESPESA" && c.group !== "INVESTIMENTO")
    .map((c) => ({ ...c, values: matrix.actual(c.id) }))
    .map((c) => ({ ...c, total: c.values.reduce((a, b) => a + b, 0) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const grand = expenseCats.reduce((s, c) => s + c.total, 0);
  const activeMonths = Math.max(1, new Set(yearTxs.map((t) => t.date.getUTCMonth())).size);

  const stacked = MONTHS_SHORT.map((label, i) => ({
    label,
    ...Object.fromEntries(expenseCats.map((c) => [c.id, c.values[i]])),
  }));

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle={`Análises do ano de ${year}.`}
        actions={
          <>
            <PeriodPicker year={year} month={month} mode="year" />
            <a href={`/api/exportar?ano=${year}`} className="btn btn-ghost">
              <Download size={16} /> Exportar CSV
            </a>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold">Despesas por categoria, mês a mês</h2>
          <StackedCategoryChart data={stacked} series={expenseCats.map((c) => ({ key: c.id, name: c.name, color: c.color }))} />
        </section>
        <section className="card">
          <h2 className="mb-4 font-semibold">Evolução do saldo total</h2>
          <BalanceChart data={balance} />
          <p className="mt-2 text-xs text-muted">Soma de todas as contas no fim de cada mês, incluindo investimentos cadastrados como conta.</p>
        </section>
      </div>

      <section className="card mt-4 p-0">
        <h2 className="border-b border-border p-4 font-semibold">Despesas por categoria</h2>
        <div className="overflow-x-auto">
          <table className="table text-xs">
            <thead>
              <tr>
                <th className="min-w-40">Categoria</th>
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="num">
                    {m}
                  </th>
                ))}
                <th className="num">Total</th>
                <th className="num">Média/mês</th>
                <th className="num">%</th>
              </tr>
            </thead>
            <tbody>
              {expenseCats.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="flex items-center gap-2">
                      <Dot color={c.color} />
                      {c.name}
                    </span>
                  </td>
                  {c.values.map((v, i) => (
                    <td key={i} className="num text-muted">
                      {v ? money(v) : "–"}
                    </td>
                  ))}
                  <td className="num font-medium">{money(c.total)}</td>
                  <td className="num">{money(Math.round(c.total / activeMonths))}</td>
                  <td className="num text-muted">{pct(c.total / grand, 1)}</td>
                </tr>
              ))}
              <tr className="bg-surface-2 font-semibold">
                <td>Total</td>
                {MONTHS_SHORT.map((_, i) => (
                  <td key={i} className="num">
                    {money(expenseCats.reduce((s, c) => s + c.values[i], 0))}
                  </td>
                ))}
                <td className="num">{money(grand)}</td>
                <td className="num">{money(Math.round(grand / activeMonths))}</td>
                <td className="num">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-4">
        <h2 className="mb-2 font-semibold">Maiores despesas do ano</h2>
        <ul className="divide-y divide-border">
          {top.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
              <Dot color={t.category?.color ?? "#cbd5e1"} />
              <div className="flex-1">
                <p className="font-medium">{t.description}</p>
                <p className="text-xs text-muted">
                  {formatDate(t.date)} · {t.category?.name ?? "Sem categoria"}
                </p>
              </div>
              <span className="tabular-nums">{money(-t.amount)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

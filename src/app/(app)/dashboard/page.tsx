import { Suspense } from "react";
import Link from "next/link";
import { PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getAccountsWithBalance, getGoals, getMonthTransactions, getMonthlySeries, getRecentTransactions, getYearMatrix } from "@/lib/data";
import { getPeriod, param, type SearchParams } from "@/lib/period";
import { MONTHS_SHORT, formatDate, money, pct, yearRange } from "@/lib/format";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { Dot, PageHeader, PageSkeleton, Progress, StatCard } from "@/components/ui";
import { PeriodPicker } from "@/components/period-picker";
import { UrlTabs } from "@/components/url-filters";
import { CategoryDonut, IncomeExpenseChart } from "@/components/charts";

export const metadata = { title: "Dashboard" };

export default function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { year, month } = getPeriod(sp);
  // Visão mensal (padrão) ou anual (soma de janeiro a dezembro do ano escolhido)
  const anual = param(sp, "visao") === "ano";
  const [matrix, series, accounts, goals, recent] = await Promise.all([
    getYearMatrix(user.id, year),
    anual ? getMonthlySeries(user.id, year, 12) : getMonthlySeries(user.id, year, month),
    getAccountsWithBalance(user.id),
    getGoals(user.id),
    anual ? getRecentTransactions(user.id, yearRange(year)) : getMonthTransactions(user.id, year, month),
  ]);
  const months = anual ? [...Array(12).keys()] : [month - 1];
  const pick = (arr: number[]) => months.reduce((s, i) => s + arr[i], 0);
  const periodo = anual ? "ano" : "mês";

  const sum = (kind: "RECEITA" | "DESPESA", src: "actual" | "budget", skipInvest = false) =>
    matrix.categories
      .filter((c) => c.kind === kind && !(skipInvest && c.group === "INVESTIMENTO"))
      .reduce((s, c) => s + pick(matrix[src](c.id)), 0);

  const receitas = sum("RECEITA", "actual");
  const receitasOrc = sum("RECEITA", "budget");
  const despesas = sum("DESPESA", "actual", true);
  const despesasOrc = sum("DESPESA", "budget", true);
  const investido = matrix.categories
    .filter((c) => c.group === "INVESTIMENTO")
    .reduce((s, c) => s + pick(matrix.actual(c.id)), 0);
  const resultado = receitas - despesas;
  const saldoContas = accounts.filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0);

  const despesasPorCategoria = matrix.categories
    .filter((c) => c.kind === "DESPESA" && c.group !== "INVESTIMENTO")
    .map((c) => ({ name: c.name, value: pick(matrix.actual(c.id)), color: c.color, budget: pick(matrix.budget(c.id)) }))
    .filter((c) => c.value > 0 || c.budget > 0)
    .sort((a, b) => b.value - a.value);

  const chart = series.map((b) => ({
    label: `${MONTHS_SHORT[b.m - 1]}/${String(b.y).slice(2)}`,
    receitas: b.receitas,
    despesas: b.despesas,
    saldo: b.receitas - b.despesas,
  }));

  return (
    <>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        subtitle={anual ? `Resumo do ano de ${year} e evolução mês a mês.` : "Resumo do mês e evolução das suas finanças."}
        actions={
          <>
            <UrlTabs
              name="visao"
              value={anual ? "ano" : "mes"}
              current={{ ano: String(year), mes: String(month), visao: anual ? "ano" : "mes" }}
              options={[
                { value: "mes", label: "Mês" },
                { value: "ano", label: "Ano" },
              ]}
            />
            <PeriodPicker year={year} month={month} mode={anual ? "year" : "month"} extra={{ visao: anual ? "ano" : undefined }} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receitas"
          value={money(receitas)}
          tone="positive"
          icon={<TrendingUp size={18} className="text-positive" />}
          hint={receitasOrc ? `${pct(receitas / receitasOrc)} do orçado (${money(receitasOrc)})` : "Sem orçamento"}
        />
        <StatCard
          label="Despesas"
          value={money(despesas)}
          tone="negative"
          icon={<TrendingDown size={18} className="text-negative" />}
          hint={despesasOrc ? `${pct(despesas / despesasOrc)} do orçado (${money(despesasOrc)})` : "Sem orçamento"}
        />
        <StatCard
          label={`Resultado do ${periodo}`}
          value={money(resultado)}
          tone={resultado >= 0 ? "positive" : "negative"}
          icon={<PiggyBank size={18} className="text-muted" />}
          hint={`${money(investido)} investidos · taxa de poupança ${receitas ? pct((resultado) / receitas) : "—"}`}
        />
        <StatCard
          label="Saldo em contas"
          value={money(saldoContas)}
          icon={<Wallet size={18} className="text-muted" />}
          hint={`${accounts.filter((a) => !a.archived).length} contas`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <h2 className="mb-4 font-semibold">{anual ? `Receitas x despesas — ${year}` : "Receitas x despesas — últimos 12 meses"}</h2>
          <IncomeExpenseChart data={chart} />
        </section>
        <section className="card">
          <h2 className="mb-2 font-semibold">Despesas por categoria</h2>
          {despesasPorCategoria.some((c) => c.value > 0) ? (
            <>
              <CategoryDonut data={despesasPorCategoria.filter((c) => c.value > 0).slice(0, 8)} />
              <ul className="mt-2 space-y-1.5 text-sm">
                {despesasPorCategoria.slice(0, 5).map((c) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <Dot color={c.color} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums">{money(c.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted">Nenhuma despesa neste {periodo}.</p>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Orçado x realizado no {periodo}</h2>
            <Link href={`/acompanhamento?ano=${year}&mes=${month}${anual ? "&visao=ano" : ""}`} className="text-sm text-primary">
              Ver detalhes
            </Link>
          </div>
          <ul className="space-y-3">
            {despesasPorCategoria.filter((c) => c.budget > 0).slice(0, 7).map((c) => {
              const ratio = c.value / c.budget;
              return (
                <li key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Dot color={c.color} />
                      {c.name}
                    </span>
                    <span className="text-muted tabular-nums">
                      <span className={ratio > 1 ? "font-medium text-negative" : "text-foreground"}>{money(c.value)}</span>
                      {" / "}
                      {money(c.budget)}
                    </span>
                  </div>
                  <Progress value={ratio} color={c.color} over={ratio > 1} />
                </li>
              );
            })}
            {!despesasPorCategoria.some((c) => c.budget > 0) && (
              <p className="text-sm text-muted">
                Nenhum orçamento para este {periodo}. <Link href="/orcamento" className="text-primary">Criar orçamento</Link>
              </p>
            )}
          </ul>
        </section>

        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Metas</h2>
            <Link href="/metas" className="text-sm text-primary">Ver todas</Link>
          </div>
          <ul className="space-y-4">
            {goals.slice(0, 4).map((g) => (
              <li key={g.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-muted">{pct(g.saved / g.targetAmount)}</span>
                </div>
                <Progress value={g.saved / g.targetAmount} color={g.color} />
                <p className="mt-1 text-xs text-muted">
                  {money(g.saved)} de {money(g.targetAmount)}
                </p>
              </li>
            ))}
            {!goals.length && <p className="text-sm text-muted">Nenhuma meta cadastrada.</p>}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Últimos lançamentos</h2>
            <Link href={`/lancamentos?ano=${year}&mes=${month}`} className="text-sm text-primary">Ver todos</Link>
          </div>
          <ul className="divide-y divide-border">
            {recent.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Dot color={t.category?.color ?? "#cbd5e1"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.description}</p>
                  <p className="text-xs text-muted">
                    {formatDate(t.date)} · {t.category ? (t.category.parent ? `${t.category.parent.name} › ${t.category.name}` : t.category.name) : "Sem categoria"} · {t.account.name}
                  </p>
                </div>
                <span className={`tabular-nums ${t.amount >= 0 ? "text-positive" : ""}`}>{money(t.amount)}</span>
              </li>
            ))}
            {!recent.length && <p className="py-6 text-center text-sm text-muted">Nenhum lançamento neste {periodo}.</p>}
          </ul>
        </section>
        <section className="card">
          <h2 className="mb-2 font-semibold">Contas</h2>
          <ul className="divide-y divide-border">
            {accounts.filter((a) => !a.archived).map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Dot color={a.color} />
                <div className="flex-1">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted">{ACCOUNT_TYPES[a.type] ?? a.type}</p>
                </div>
                <span className={`tabular-nums ${a.balance < 0 ? "text-negative" : ""}`}>{money(a.balance)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

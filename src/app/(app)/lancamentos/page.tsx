import { Suspense } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getAccountsWithBalance, getCategories, getMonthTransactions } from "@/lib/data";
import { getPeriod, param, type SearchParams } from "@/lib/period";
import { formatDate, money, toISODate } from "@/lib/format";
import { Dot, PageHeader, PageSkeleton, StatCard } from "@/components/ui";
import { PeriodPicker } from "@/components/period-picker";
import { UrlSearch, UrlSelect } from "@/components/url-filters";
import {
  InlineCategory,
  NewTransactionButton,
  TransactionRowActions,
  categoryTreeOptions,
  type TxValue,
} from "@/components/transaction-form";

export const metadata = { title: "Lançamentos" };

export default function LancamentosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Lancamentos searchParams={searchParams} />
    </Suspense>
  );
}

async function Lancamentos({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { year, month } = getPeriod(sp);
  const filters = { conta: param(sp, "conta"), categoria: param(sp, "categoria"), q: param(sp, "q") };
  const [accounts, categories, txs] = await Promise.all([
    getAccountsWithBalance(user.id),
    getCategories(user.id),
    getMonthTransactions(user.id, year, month, { accountId: filters.conta, categoryId: filters.categoria, q: filters.q }),
  ]);

  const accountOpts = accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }));
  const catOpts = categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, group: c.group, parentId: c.parentId }));
  const entradas = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const saidas = txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const semCategoria = txs.filter((t) => !t.categoryId).length;
  const current = { ano: String(year), mes: String(month), ...filters };

  return (
    <>
      <PageHeader
        title="Lançamentos"
        subtitle="Receitas e despesas realizadas."
        actions={
          <>
            <PeriodPicker year={year} month={month} extra={filters} />
            <Link href="/importar" className="btn btn-ghost">
              <Upload size={16} /> Importar
            </Link>
            <NewTransactionButton accounts={accountOpts} categories={catOpts} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Entradas" value={money(entradas)} tone="positive" />
        <StatCard label="Saídas" value={money(-saidas)} tone="negative" />
        <StatCard
          label="Saldo do período"
          value={money(entradas + saidas)}
          tone={entradas + saidas >= 0 ? "positive" : "negative"}
          hint={semCategoria ? <span className="text-warning">{semCategoria} lançamento(s) sem categoria</span> : `${txs.length} lançamentos`}
        />
      </div>

      <div className="card mt-4 p-0">
        <div className="flex flex-wrap gap-2 border-b border-border p-4">
          <UrlSearch value={filters.q} current={current} />
          <UrlSelect
            name="conta"
            value={filters.conta}
            current={current}
            placeholder="Todas as contas"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
          <UrlSelect
            name="categoria"
            value={filters.categoria}
            current={current}
            placeholder="Todas as categorias"
            options={[{ value: "none", label: "— Sem categoria —" }, ...categoryTreeOptions(catOpts).map((c) => ({ value: c.id, label: c.label }))]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th className="min-w-44">Categoria</th>
                <th>Conta</th>
                <th className="num">Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => {
                const tx: TxValue = {
                  id: t.id,
                  date: toISODate(t.date),
                  description: t.description,
                  amount: t.amount,
                  accountId: t.accountId,
                  categoryId: t.categoryId,
                  notes: t.notes,
                };
                return (
                  <tr key={t.id} className="hover:bg-surface-2/60">
                    <td className="whitespace-nowrap text-muted">{formatDate(t.date)}</td>
                    <td>
                      <p className="font-medium">{t.description}</p>
                      {t.notes && <p className="text-xs text-muted">{t.notes}</p>}
                    </td>
                    <td>
                      <InlineCategory key={`${t.id}-${t.categoryId}`} tx={tx} categories={catOpts} />
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <Dot color={t.account.color} />
                        {t.account.name}
                      </span>
                    </td>
                    <td className={`num font-medium ${t.amount > 0 ? "text-positive" : ""}`}>{money(t.amount)}</td>
                    <td>
                      <TransactionRowActions tx={tx} accounts={accountOpts} categories={catOpts} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!txs.length && <p className="py-12 text-center text-sm text-muted">Nenhum lançamento encontrado.</p>}
        </div>
      </div>
    </>
  );
}

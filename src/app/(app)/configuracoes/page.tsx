import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { getAccountsWithBalance, getCategories } from "@/lib/data";
import { ACCOUNT_TYPES, GROUP_LABEL, GROUP_ORDER, TRANSFER } from "@/lib/constants";
import { money } from "@/lib/format";
import { Dot, PageHeader, PageSkeleton } from "@/components/ui";
import { AccountActions, CategoryActions, NewAccountButton, NewCategoryButton } from "@/components/settings-forms";

export const metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <>
      <PageHeader title="Configurações" subtitle="Contas, cartões e categorias usadas nos lançamentos, no orçamento e na DRE." />
      <Suspense fallback={<PageSkeleton />}>
        <Configuracoes />
      </Suspense>
    </>
  );
}

async function Configuracoes() {
  const user = await requireUser();
  const [accounts, categories] = await Promise.all([getAccountsWithBalance(user.id), getCategories(user.id, true)]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Contas</h2>
          <NewAccountButton />
        </div>
        <ul className="divide-y divide-border">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
              <Dot color={a.color} />
              <div className="flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted">
                  {ACCOUNT_TYPES[a.type] ?? a.type} · saldo inicial {money(a.initialBalance)}
                </p>
              </div>
              <span className="tabular-nums">{money(a.balance)}</span>
              <AccountActions
                account={{ id: a.id, name: a.name, type: a.type, color: a.color, initialBalance: a.initialBalance }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Categorias</h2>
          <NewCategoryButton />
        </div>
        {[...GROUP_ORDER, TRANSFER].map((g) => {
          const cats = categories.filter((c) => c.group === g);
          if (!cats.length) return null;
          return (
            <div key={g} className="mb-4">
              <h3 className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">
                {g === TRANSFER ? "Transferências (fora da DRE)" : GROUP_LABEL[g as keyof typeof GROUP_LABEL]}
              </h3>
              <ul className="divide-y divide-border">
                {cats.map((c) => (
                  <li key={c.id} className={`flex items-center gap-3 py-2 text-sm ${c.archived ? "opacity-50" : ""}`}>
                    <Dot color={c.color} />
                    <span className="flex-1">
                      {c.name}
                      {c.archived && <span className="ml-2 text-xs text-muted">(arquivada)</span>}
                    </span>
                    <CategoryActions
                      category={{ id: c.id, name: c.name, group: c.group, color: c.color, archived: !!c.archived }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

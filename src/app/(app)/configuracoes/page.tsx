import { Suspense } from "react";
import Link from "next/link";
import { DeleteAccountSection } from "@/components/delete-account";
import { requireUser } from "@/lib/session";
import { getAccountsWithBalance, getCategories } from "@/lib/data";
import { ACCOUNT_TYPES, GROUP_LABEL, GROUP_ORDER, TRANSFER } from "@/lib/constants";
import { money } from "@/lib/format";
import { Dot, PageHeader, PageSkeleton } from "@/components/ui";
import {
  AccountActions,
  CategoryActions,
  NewAccountButton,
  NewCategoryButton,
  NewSubcategoryButton,
} from "@/components/settings-forms";

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
        <p className="mb-4 text-sm text-muted">
          Use <b>+ Subcategoria</b> para detalhar uma categoria (ex.: Moradia → Condomínio, IPTU, Conta de gás). O
          orçamento e os lançamentos vão nas subcategorias, e a categoria mostra o total.
        </p>
        {[...GROUP_ORDER, TRANSFER].map((g) => {
          const parents = categories.filter((c) => c.group === g && !c.parentId);
          if (!parents.length) return null;
          const value = (c: (typeof categories)[number]) => ({
            id: c.id,
            name: c.name,
            group: c.group,
            color: c.color,
            archived: !!c.archived,
            parentId: c.parentId,
          });
          return (
            <div key={g} className="mb-4">
              <h3 className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">
                {g === TRANSFER ? "Transferências (fora da DRE)" : GROUP_LABEL[g as keyof typeof GROUP_LABEL]}
              </h3>
              <ul className="divide-y divide-border">
                {parents.map((p) => {
                  const kids = categories.filter((c) => c.parentId === p.id);
                  const ref = { id: p.id, name: p.name, color: p.color };
                  return (
                    <li key={p.id} className="py-1">
                      <div className={`flex items-center gap-3 py-1.5 text-sm ${p.archived ? "opacity-50" : ""}`}>
                        <Dot color={p.color} />
                        <span className="flex-1 font-medium">
                          {p.name}
                          {kids.length > 0 && <span className="ml-2 text-xs font-normal text-muted">{kids.length} subcategorias</span>}
                          {p.archived && <span className="ml-2 text-xs text-muted">(arquivada)</span>}
                        </span>
                        {g !== TRANSFER && <NewSubcategoryButton parent={ref} />}
                        <CategoryActions category={value(p)} />
                      </div>
                      {kids.length > 0 && (
                        <ul className="mb-1 ml-5 border-l border-border pl-4">
                          {kids.map((c) => (
                            <li key={c.id} className={`flex items-center gap-3 py-1 text-sm ${c.archived ? "opacity-50" : ""}`}>
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                              <span className="flex-1">
                                {c.name}
                                {c.archived && <span className="ml-2 text-xs text-muted">(arquivada)</span>}
                              </span>
                              <CategoryActions category={value(c)} parent={ref} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <div className="xl:col-span-2">
        <DeleteAccountSection />
        <p className="mt-3 text-center text-xs text-muted">
          <Link href="/privacidade" className="underline">Política de privacidade</Link>
        </p>
      </div>
    </div>
  );
}

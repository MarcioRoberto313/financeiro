import { Suspense } from "react";
import { Link2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getAccountsWithBalance, getCategories, getGoals } from "@/lib/data";
import { formatDate, money, pct, toISODate } from "@/lib/format";
import { Empty, PageHeader, PageSkeleton, Progress } from "@/components/ui";
import { GoalActions, NewGoalButton, type GoalSources, type LinkType } from "@/components/goal-forms";

export const metadata = { title: "Metas" };

export default function MetasPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Metas />
    </Suspense>
  );
}

function monthsBetween(a: Date, b: Date) {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

async function Metas() {
  const user = await requireUser();
  const [goals, accounts, categories] = await Promise.all([
    getGoals(user.id),
    getAccountsWithBalance(user.id),
    getCategories(user.id),
  ]);
  const sources: GoalSources = {
    accounts: accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, group: c.group, parentId: c.parentId })),
  };
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Metas"
        subtitle="Objetivos de poupança, alimentados pelos seus lançamentos, e o ritmo necessário para alcançá-los."
        actions={<NewGoalButton sources={sources} />}
      />
      {!goals.length ? (
        <Empty title="Nenhuma meta ainda">Crie uma meta para acompanhar quanto falta e quanto guardar por mês.</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((g) => {
            const remaining = Math.max(0, g.targetAmount - g.saved);
            const done = remaining === 0;
            const monthsLeft = g.deadline ? Math.max(1, monthsBetween(now, g.deadline)) : null;
            const needed = monthsLeft ? Math.ceil(remaining / monthsLeft) : null;
            const recentAvg = g.recentAvg;
            const eta = recentAvg > 0 ? Math.ceil(remaining / recentAvg) : null;
            const onTrack = needed !== null && recentAvg >= needed;

            return (
              <section key={g.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 font-semibold">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
                      {g.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted">{g.deadline ? `Prazo: ${formatDate(g.deadline)}` : "Sem prazo definido"}</p>
                    <p className="mt-1 inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-0.5 text-xs text-muted">
                      <Link2 size={12} />
                      {g.source ?? "Aportes manuais"}
                    </p>
                  </div>
                  <GoalActions
                    sources={sources}
                    goal={{
                      id: g.id,
                      name: g.name,
                      targetAmount: g.targetAmount,
                      color: g.color,
                      deadline: g.deadline ? toISODate(g.deadline) : null,
                      linkType: (g.source ? g.linkType : "MANUAL") as LinkType,
                      accountId: g.accountId,
                      categoryId: g.categoryId,
                      startDate: g.startDate ? toISODate(g.startDate) : null,
                    }}
                  />
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <p className="text-2xl font-semibold tabular-nums">{money(g.saved)}</p>
                  <p className="text-sm text-muted">
                    de {money(g.targetAmount)} · {pct(Math.max(0, g.saved) / g.targetAmount)}
                  </p>
                </div>
                <div className="mt-2">
                  <Progress value={g.saved / g.targetAmount} color={g.color} />
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-surface-2 p-3">
                    <dt className="text-xs text-muted">Falta</dt>
                    <dd className="font-medium tabular-nums">{money(remaining)}</dd>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-3">
                    <dt className="text-xs text-muted">Necessário/mês</dt>
                    <dd className="font-medium tabular-nums">{done ? "—" : needed !== null ? money(needed) : "—"}</dd>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-3">
                    <dt className="text-xs text-muted">Média 3 meses</dt>
                    <dd className="font-medium tabular-nums">{money(recentAvg)}</dd>
                  </div>
                </dl>
                <p className={`mt-3 text-sm ${done ? "text-positive" : needed === null ? "text-muted" : onTrack ? "text-positive" : "text-warning"}`}>
                  {done
                    ? "Meta atingida!"
                    : needed === null
                      ? eta
                        ? `No ritmo atual, você chega lá em cerca de ${eta} meses.`
                        : "Ainda não há movimentos para calcular a projeção."
                      : onTrack
                        ? "No ritmo atual, você atinge a meta dentro do prazo."
                        : `Abaixo do ritmo: aumente os aportes em ${money(needed - recentAvg)} por mês.`}
                </p>

                {g.movements.length > 0 && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-muted">Histórico ({g.movements.length})</summary>
                    <ul className="mt-2 divide-y divide-border">
                      {g.movements.slice(0, 12).map((m) => (
                        <li key={m.id} className="flex justify-between gap-3 py-1.5">
                          <span className="min-w-0 truncate text-muted">
                            {formatDate(m.date)}
                            {m.note ? ` · ${m.note}` : ""}
                            {!m.auto && g.linkType === "CATEGORY" && " (ajuste manual)"}
                          </span>
                          <span className={`shrink-0 tabular-nums ${m.amount < 0 ? "text-negative" : ""}`}>{money(m.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

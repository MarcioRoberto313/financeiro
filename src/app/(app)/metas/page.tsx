import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { getGoals } from "@/lib/data";
import { formatDate, money, pct, toISODate } from "@/lib/format";
import { Empty, PageHeader, PageSkeleton, Progress } from "@/components/ui";
import { GoalActions, NewGoalButton } from "@/components/goal-forms";

export const metadata = { title: "Metas" };

export default function MetasPage() {
  return (
    <>
      <PageHeader title="Metas" subtitle="Objetivos de poupança e o ritmo necessário para alcançá-los." actions={<NewGoalButton />} />
      <Suspense fallback={<PageSkeleton />}>
        <Metas />
      </Suspense>
    </>
  );
}

function monthsBetween(a: Date, b: Date) {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

async function Metas() {
  const user = await requireUser();
  const goals = await getGoals(user.id);
  const now = new Date();
  if (!goals.length) return <Empty title="Nenhuma meta ainda">Crie uma meta para acompanhar quanto falta e quanto guardar por mês.</Empty>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {goals.map((g) => {
        const remaining = Math.max(0, g.targetAmount - g.saved);
        const done = remaining === 0;
        const monthsLeft = g.deadline ? Math.max(1, monthsBetween(now, g.deadline)) : null;
        const needed = monthsLeft ? Math.ceil(remaining / monthsLeft) : null;
        // Mês atual + 2 anteriores
        const threeMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
        const recentAvg = Math.round(
          g.contributions.filter((c) => c.date >= threeMonthsAgo).reduce((s, c) => s + c.amount, 0) / 3,
        );
        const eta = recentAvg > 0 ? Math.ceil(remaining / recentAvg) : null;
        const onTrack = needed !== null && recentAvg >= needed;

        return (
          <section key={g.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <span className="h-3 w-3 rounded-full" style={{ background: g.color }} />
                  {g.name}
                </h2>
                <p className="mt-0.5 text-sm text-muted">{g.deadline ? `Prazo: ${formatDate(g.deadline)}` : "Sem prazo definido"}</p>
              </div>
              <GoalActions
                goal={{ id: g.id, name: g.name, targetAmount: g.targetAmount, color: g.color, deadline: g.deadline ? toISODate(g.deadline) : null }}
              />
            </div>

            <div className="mt-4 flex items-end justify-between">
              <p className="text-2xl font-semibold tabular-nums">{money(g.saved)}</p>
              <p className="text-sm text-muted">de {money(g.targetAmount)} · {pct(g.saved / g.targetAmount)}</p>
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
                    : "Registre aportes para ver a projeção."
                  : onTrack
                    ? "No ritmo atual, você atinge a meta dentro do prazo."
                    : `Abaixo do ritmo: aumente os aportes em ${money(needed - recentAvg)} por mês.`}
            </p>

            {g.contributions.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted">Histórico ({g.contributions.length})</summary>
                <ul className="mt-2 divide-y divide-border">
                  {g.contributions.slice(0, 12).map((c) => (
                    <li key={c.id} className="flex justify-between py-1.5">
                      <span className="text-muted">
                        {formatDate(c.date)}
                        {c.note ? ` · ${c.note}` : ""}
                      </span>
                      <span className={`tabular-nums ${c.amount < 0 ? "text-negative" : ""}`}>{money(c.amount)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}

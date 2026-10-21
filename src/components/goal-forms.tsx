"use client";

import { Pencil, Plus, Trash } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { addContribution, deleteGoal, saveGoal } from "@/app/actions";
import { centsToInput, todayISO } from "@/lib/format";
import { categoryTreeOptions, type CategoryOption } from "@/lib/category-tree";
import { Modal } from "./modal";

export type LinkType = "MANUAL" | "ACCOUNT" | "CATEGORY";
export type GoalValue = {
  id: string;
  name: string;
  targetAmount: number;
  deadline: string | null;
  color: string;
  linkType: LinkType;
  accountId: string | null;
  categoryId: string | null;
  startDate: string | null;
};
/** Contas e categorias que podem alimentar uma meta. */
export type GoalSources = { accounts: { id: string; name: string }[]; categories: CategoryOption[] };

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#0ea5e9", "#ef4444", "#8b5cf6", "#14b8a6"];
const LINKS: { value: LinkType; label: string; help: string }[] = [
  {
    value: "ACCOUNT",
    label: "Saldo de uma conta",
    help: "O valor guardado é o saldo da conta escolhida. Transferências para ela fazem a meta subir sozinha.",
  },
  {
    value: "CATEGORY",
    label: "Lançamentos de uma categoria",
    help: "Soma os lançamentos feitos na categoria (e subcategorias) a partir da data escolhida.",
  },
  { value: "MANUAL", label: "Manual", help: "Você registra os aportes na própria meta." },
];

function GoalForm({ initial, sources, onDone }: { initial?: GoalValue; sources: GoalSources; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveGoal, undefined);
  const [link, setLink] = useState<LinkType>(initial?.linkType ?? (sources.accounts.length ? "ACCOUNT" : "MANUAL"));
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  // Para metas, só faz sentido categoria de despesa/investimento (é para onde o dinheiro vai)
  const tree = categoryTreeOptions(sources.categories.filter((c) => c.kind === "DESPESA"));

  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="linkType" value={link} />
      <div>
        <label className="label">Nome da meta</label>
        <input className="input" name="name" defaultValue={initial?.name} placeholder="Ex.: Reserva de emergência" required autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor alvo (R$)</label>
          <input className="input" name="targetAmount" inputMode="decimal" defaultValue={initial ? centsToInput(initial.targetAmount) : ""} required />
        </div>
        <div>
          <label className="label">Prazo</label>
          <input className="input" type="date" name="deadline" defaultValue={initial?.deadline ?? ""} />
        </div>
      </div>

      <div>
        <label className="label">Como a meta é alimentada</label>
        <div className="grid gap-2">
          {LINKS.map((l) => (
            <label
              key={l.value}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${link === l.value ? "border-primary bg-primary-soft" : "border-border"}`}
            >
              <input type="radio" name="_link" checked={link === l.value} onChange={() => setLink(l.value)} className="mt-0.5" />
              <span>
                <span className="font-medium">{l.label}</span>
                <span className="block text-xs text-muted">{l.help}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {link === "ACCOUNT" &&
        (sources.accounts.length ? (
          <div>
            <label className="label">Conta</label>
            <select className="input" name="accountId" defaultValue={initial?.accountId ?? sources.accounts[0].id}>
              {sources.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">Dica: crie em Configurações uma conta só para a meta (ex.: “Reserva – CDB”).</p>
          </div>
        ) : (
          <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">Cadastre uma conta em Configurações para usar esta opção.</p>
        ))}

      {link === "CATEGORY" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoria</label>
            <select className="input" name="categoryId" defaultValue={initial?.categoryId ?? ""} required>
              <option value="" disabled>
                Escolha…
              </option>
              {tree.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Contar a partir de</label>
            <input className="input" type="date" name="startDate" defaultValue={initial?.startDate ?? todayISO()} />
          </div>
        </div>
      )}

      <div>
        <label className="label">Cor</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={(initial?.color ?? COLORS[0]) === c} className="peer hidden" />
              <span className="block h-7 w-7 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-foreground" style={{ background: c }} />
            </label>
          ))}
        </div>
      </div>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}

export function NewGoalButton({ sources }: { sources: GoalSources }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} /> Nova meta
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova meta">
        {open && <GoalForm sources={sources} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

function ContributionForm({ goalId, onDone }: { goalId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(addContribution, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="goalId" value={goalId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor (R$)</label>
          <input className="input" name="amount" inputMode="decimal" required autoFocus />
        </div>
        <div>
          <label className="label">Data</label>
          <input className="input" type="date" name="date" defaultValue={todayISO()} />
        </div>
      </div>
      <div>
        <label className="label">Observação</label>
        <input className="input" name="note" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="withdraw" /> É um resgate (retirada)
      </label>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Salvando…" : "Registrar"}</button>
      </div>
    </form>
  );
}

export function GoalActions({ goal, sources }: { goal: GoalValue; sources: GoalSources }) {
  const [modal, setModal] = useState<"edit" | "contrib" | null>(null);
  const [pending, start] = useTransition();
  const close = () => setModal(null);
  return (
    <div className="flex items-center gap-1">
      {/* Meta pelo saldo de uma conta não tem aporte manual: o saldo é a fonte */}
      {goal.linkType !== "ACCOUNT" && (
        <button className="btn btn-ghost px-3 py-1.5" onClick={() => setModal("contrib")}>
          <Plus size={14} /> {goal.linkType === "CATEGORY" ? "Ajuste" : "Aporte"}
        </button>
      )}
      <button className="rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => setModal("edit")} aria-label="Editar">
        <Pencil size={15} />
      </button>
      <button
        className="rounded-lg p-1.5 text-muted hover:bg-negative/10 hover:text-negative"
        aria-label="Excluir"
        disabled={pending}
        onClick={() => confirm(`Excluir a meta "${goal.name}"? Os lançamentos e contas não são afetados.`) && start(() => deleteGoal(goal.id))}
      >
        <Trash size={15} />
      </button>
      <Modal open={modal === "edit"} onClose={close} title="Editar meta">
        {modal === "edit" && <GoalForm initial={goal} sources={sources} onDone={close} />}
      </Modal>
      <Modal
        open={modal === "contrib"}
        onClose={close}
        title={goal.linkType === "CATEGORY" ? `Ajuste manual — ${goal.name}` : `Aporte — ${goal.name}`}
      >
        {modal === "contrib" && <ContributionForm goalId={goal.id} onDone={close} />}
      </Modal>
    </div>
  );
}

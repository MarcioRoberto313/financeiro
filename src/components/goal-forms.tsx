"use client";

import { Pencil, Plus, Trash } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { addContribution, deleteGoal, saveGoal } from "@/app/actions";
import { centsToInput, todayISO } from "@/lib/format";
import { Modal } from "./modal";

type GoalValue = { id: string; name: string; targetAmount: number; deadline: string | null; color: string };
const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#0ea5e9", "#ef4444", "#8b5cf6", "#14b8a6"];

function GoalForm({ initial, onDone }: { initial?: GoalValue; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveGoal, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
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

export function NewGoalButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} /> Nova meta
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova meta">
        {open && <GoalForm onDone={() => setOpen(false)} />}
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

export function GoalActions({ goal }: { goal: GoalValue }) {
  const [modal, setModal] = useState<"edit" | "contrib" | null>(null);
  const [pending, start] = useTransition();
  const close = () => setModal(null);
  return (
    <div className="flex items-center gap-1">
      <button className="btn btn-ghost px-3 py-1.5" onClick={() => setModal("contrib")}>
        <Plus size={14} /> Aporte
      </button>
      <button className="rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => setModal("edit")} aria-label="Editar">
        <Pencil size={15} />
      </button>
      <button
        className="rounded-lg p-1.5 text-muted hover:bg-negative/10 hover:text-negative"
        aria-label="Excluir"
        disabled={pending}
        onClick={() => confirm(`Excluir a meta "${goal.name}" e todo o histórico?`) && start(() => deleteGoal(goal.id))}
      >
        <Trash size={15} />
      </button>
      <Modal open={modal === "edit"} onClose={close} title="Editar meta">
        {modal === "edit" && <GoalForm initial={goal} onDone={close} />}
      </Modal>
      <Modal open={modal === "contrib"} onClose={close} title={`Aporte — ${goal.name}`}>
        {modal === "contrib" && <ContributionForm goalId={goal.id} onDone={close} />}
      </Modal>
    </div>
  );
}

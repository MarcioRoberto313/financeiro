"use client";

import { Pencil, Plus, Trash } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteTransaction, saveTransaction, setTransactionCategory } from "@/app/actions";
import { centsToInput, todayISO } from "@/lib/format";
import { GROUP_LABEL, GROUP_ORDER, TRANSFER, type CategoryKind, type DreGroup } from "@/lib/constants";
import { Modal } from "./modal";

export type Option = { id: string; name: string };
export type CategoryOption = Option & { kind: CategoryKind; group: DreGroup | typeof TRANSFER; parentId: string | null };

/** Categoria seguida das suas subcategorias, com o nome das filhas recuado. */
export function categoryTreeOptions(categories: CategoryOption[]) {
  const ids = new Set(categories.map((c) => c.id));
  return categories
    .filter((c) => !c.parentId || !ids.has(c.parentId))
    .flatMap((p) => [
      { ...p, label: p.name },
      ...categories.filter((c) => c.parentId === p.id).map((c) => ({ ...c, label: `   ↳ ${c.name}` })),
    ]);
}
export type TxValue = {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountId: string;
  categoryId: string | null;
  notes: string | null;
};

function CategorySelect({
  categories,
  kind,
  defaultValue,
  name,
  onChange,
  className = "input",
}: {
  categories: CategoryOption[];
  kind?: "RECEITA" | "DESPESA";
  defaultValue?: string;
  name?: string;
  onChange?: (v: string) => void;
  className?: string;
}) {
  // Transferências servem para entradas e saídas, então aparecem sempre.
  const groups = [
    ...GROUP_ORDER.filter((g) => (kind ? (kind === "RECEITA" ? g === "RECEITA" : g !== "RECEITA") : true)),
    TRANSFER,
  ] as const;
  const label = (g: (typeof groups)[number]) => (g === TRANSFER ? "Transferências (fora da DRE)" : GROUP_LABEL[g]);
  const tree = categoryTreeOptions(categories);
  return (
    <select
      name={name}
      className={className}
      defaultValue={defaultValue ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">Sem categoria</option>
      {groups.map((g) => (
        <optgroup key={g} label={label(g)}>
          {tree
            .filter((c) => c.group === g)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

function TransactionForm({
  accounts,
  categories,
  initial,
  onDone,
}: {
  accounts: Option[];
  categories: CategoryOption[];
  initial?: TxValue;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveTransaction, undefined);
  const [type, setType] = useState<"RECEITA" | "DESPESA">(initial && initial.amount > 0 ? "RECEITA" : "DESPESA");

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1">
        {(["DESPESA", "RECEITA"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg py-2 text-sm font-medium ${
              type === t ? (t === "RECEITA" ? "bg-positive text-white" : "bg-negative text-white") : "text-muted"
            }`}
          >
            {t === "RECEITA" ? "Receita" : "Despesa"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor (R$)</label>
          <input
            className="input"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={initial ? centsToInput(Math.abs(initial.amount)) : ""}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label">Data</label>
          <input className="input" type="date" name="date" defaultValue={initial?.date ?? todayISO()} required />
        </div>
      </div>
      <div>
        <label className="label">Descrição</label>
        <input className="input" name="description" defaultValue={initial?.description} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Categoria</label>
          <CategorySelect key={type} name="categoryId" categories={categories} kind={type} defaultValue={initial?.categoryId ?? ""} />
        </div>
        <div>
          <label className="label">Conta</label>
          <select className="input" name="accountId" defaultValue={initial?.accountId ?? accounts[0]?.id}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Observações</label>
        <input className="input" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

export function NewTransactionButton(props: { accounts: Option[]; categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} /> Novo lançamento
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo lançamento">
        {open && <TransactionForm {...props} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

export function TransactionRowActions(props: { accounts: Option[]; categories: CategoryOption[]; tx: TxValue }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <button className="rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => setOpen(true)} aria-label="Editar">
        <Pencil size={15} />
      </button>
      <button
        className="rounded-lg p-1.5 text-muted hover:bg-negative/10 hover:text-negative"
        disabled={pending}
        aria-label="Excluir"
        onClick={() => confirm(`Excluir "${props.tx.description}"?`) && start(() => deleteTransaction(props.tx.id))}
      >
        <Trash size={15} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar lançamento">
        {open && (
          <TransactionForm accounts={props.accounts} categories={props.categories} initial={props.tx} onDone={() => setOpen(false)} />
        )}
      </Modal>
    </div>
  );
}

/** Seletor rápido de categoria direto na tabela. */
export function InlineCategory({ tx, categories }: { tx: TxValue; categories: CategoryOption[] }) {
  const [pending, start] = useTransition();
  return (
    <CategorySelect
      categories={categories}
      kind={tx.amount > 0 ? "RECEITA" : "DESPESA"}
      defaultValue={tx.categoryId ?? ""}
      className={`input py-1 text-xs ${pending ? "opacity-50" : ""} ${tx.categoryId ? "" : "border-warning"}`}
      onChange={(v) => start(() => setTransactionCategory(tx.id, v || null))}
    />
  );
}

export { CategorySelect };

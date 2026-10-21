"use client";

import { ArrowLeftRight, Pencil, Plus, Trash } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteTransaction, saveTransaction, saveTransfer, setTransactionCategory } from "@/app/actions";
import { centsToInput, todayISO } from "@/lib/format";
import { GROUP_LABEL, GROUP_ORDER, TRANSFER } from "@/lib/constants";
import { categoryTreeOptions, type CategoryOption } from "@/lib/category-tree";
import { Modal } from "./modal";

export type Option = { id: string; name: string };
export type { CategoryOption };
export type TxValue = {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountId: string;
  categoryId: string | null;
  notes: string | null;
  /** Preenchido quando o lançamento é um dos lados de uma transferência. */
  transfer?: { groupId: string; fromAccountId: string; toAccountId: string } | null;
};

type Mode = "DESPESA" | "RECEITA" | "TRANSFERENCIA";
const MODE_LABEL: Record<Mode, string> = { DESPESA: "Despesa", RECEITA: "Receita", TRANSFERENCIA: "Transferência" };
const MODE_ACTIVE: Record<Mode, string> = {
  DESPESA: "bg-negative text-white",
  RECEITA: "bg-positive text-white",
  TRANSFERENCIA: "bg-primary text-white",
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

/**
 * Formulário de lançamento com três tipos. Despesa/Receita gravam um lançamento;
 * Transferência grava os dois lados (saída e entrada) de uma vez.
 */
function EntryForm({
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
  const [mode, setMode] = useState<Mode>(
    initial?.transfer ? "TRANSFERENCIA" : initial && initial.amount > 0 ? "RECEITA" : "DESPESA",
  );
  // Uma transferência existente só é editada como transferência (os dois lados juntos)
  const modes: Mode[] = initial?.transfer ? ["TRANSFERENCIA"] : ["DESPESA", "RECEITA", "TRANSFERENCIA"];

  return (
    <div className="space-y-4">
      {modes.length > 1 && (
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-1">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg py-2 text-sm font-medium ${mode === m ? MODE_ACTIVE[m] : "text-muted"}`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      )}
      {mode === "TRANSFERENCIA" ? (
        <TransferForm accounts={accounts} initial={initial} onDone={onDone} />
      ) : (
        <TransactionForm accounts={accounts} categories={categories} initial={initial} type={mode} onDone={onDone} />
      )}
    </div>
  );
}

function TransferForm({ accounts, initial, onDone }: { accounts: Option[]; initial?: TxValue; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveTransfer, undefined);
  const [from, setFrom] = useState(initial?.transfer?.fromAccountId ?? (initial && initial.amount < 0 ? initial.accountId : accounts[0]?.id ?? ""));
  const [to, setTo] = useState(
    initial?.transfer?.toAccountId ??
      (initial && initial.amount > 0 ? initial.accountId : accounts.find((a) => a.id !== from)?.id ?? ""),
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  if (accounts.length < 2) {
    return (
      <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
        Para transferir, cadastre pelo menos duas contas em Configurações (ex.: conta corrente e cartão).
      </p>
    );
  }

  const accountSelect = (name: string, value: string, onChange: (v: string) => void) => (
    <select className="input" name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );

  return (
    <form action={action} className="space-y-4">
      {initial?.transfer && <input type="hidden" name="groupId" value={initial.transfer.groupId} />}
      {/* Lançamento comum sendo convertido em transferência: o original é substituído */}
      {initial && !initial.transfer && <input type="hidden" name="replaceId" value={initial.id} />}
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div>
          <label className="label">Sai de (débito)</label>
          {accountSelect("fromAccountId", from, setFrom)}
        </div>
        <button
          type="button"
          className="mb-1 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-primary"
          title="Inverter contas"
          aria-label="Inverter contas"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          <ArrowLeftRight size={16} />
        </button>
        <div>
          <label className="label">Entra em (crédito)</label>
          {accountSelect("toAccountId", to, setTo)}
        </div>
      </div>
      {from === to && <p className="text-xs text-warning">Escolha contas diferentes para origem e destino.</p>}
      <div>
        <label className="label">Descrição</label>
        <input className="input" name="description" defaultValue={initial?.description ?? "Transferência entre contas"} required />
      </div>
      <div>
        <label className="label">Observações</label>
        <input className="input" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>
      <p className="text-xs text-muted">
        São gravados os dois lados: a saída na conta de origem e a entrada na de destino, com o mesmo valor. Transferências
        não entram na DRE nem no orçamento.
      </p>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={pending || from === to}>
          {pending ? "Salvando…" : "Salvar transferência"}
        </button>
      </div>
    </form>
  );
}

function TransactionForm({
  accounts,
  categories,
  initial,
  type,
  onDone,
}: {
  accounts: Option[];
  categories: CategoryOption[];
  initial?: TxValue;
  type: "RECEITA" | "DESPESA";
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveTransaction, undefined);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="type" value={type} />
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
        {open && <EntryForm {...props} onDone={() => setOpen(false)} />}
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
        onClick={() =>
          confirm(
            props.tx.transfer
              ? `Excluir a transferência "${props.tx.description}"? Os dois lados (saída e entrada) serão excluídos.`
              : `Excluir "${props.tx.description}"?`,
          ) && start(() => deleteTransaction(props.tx.id))
        }
      >
        <Trash size={15} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={props.tx.transfer ? "Editar transferência" : "Editar lançamento"}>
        {open && <EntryForm accounts={props.accounts} categories={props.categories} initial={props.tx} onDone={() => setOpen(false)} />}
      </Modal>
    </div>
  );
}

/** Seletor rápido de categoria direto na tabela. */
export function InlineCategory({ tx, categories }: { tx: TxValue; categories: CategoryOption[] }) {
  const [pending, start] = useTransition();
  if (tx.transfer) {
    // Categoria fixa: os dois lados da transferência ficam fora da DRE
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2 py-1 text-xs font-medium text-primary">
        <ArrowLeftRight size={12} /> Transferência
      </span>
    );
  }
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

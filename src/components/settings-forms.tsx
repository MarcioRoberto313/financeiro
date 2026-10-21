"use client";

import { Archive, ArchiveRestore, Pencil, Plus, Trash } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteAccount, saveAccount, saveCategory, toggleCategoryArchived } from "@/app/actions";
import { ACCOUNT_TYPES, GROUP_LABEL, GROUP_ORDER, TRANSFER } from "@/lib/constants";
import { centsToInput } from "@/lib/format";
import { Modal } from "./modal";

type AccountValue = { id: string; name: string; type: string; color: string; initialBalance: number };
type CategoryValue = { id: string; name: string; group: string; color: string; archived: boolean; parentId: string | null };
type ParentRef = { id: string; name: string; color: string };

function AccountForm({ initial, onDone }: { initial?: AccountValue; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveAccount, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div>
        <label className="label">Nome</label>
        <input className="input" name="name" defaultValue={initial?.name} required autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tipo</label>
          <select className="input" name="type" defaultValue={initial?.type ?? "CORRENTE"}>
            {Object.entries(ACCOUNT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Saldo inicial (R$)</label>
          <input className="input" name="initialBalance" inputMode="decimal" defaultValue={initial ? centsToInput(initial.initialBalance) : "0,00"} />
        </div>
      </div>
      <div>
        <label className="label">Cor</label>
        <input type="color" name="color" defaultValue={initial?.color ?? "#6366f1"} className="h-10 w-16 rounded-lg border border-border bg-surface" />
      </div>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}

function CategoryForm({ initial, parent, onDone }: { initial?: CategoryValue; parent?: ParentRef; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveCategory, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {parent && <input type="hidden" name="parentId" value={parent.id} />}
      {parent && (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
          Subcategoria de <b>{parent.name}</b>. O grupo na DRE é o mesmo da categoria.
        </p>
      )}
      <div>
        <label className="label">Nome</label>
        <input
          className="input"
          name="name"
          defaultValue={initial?.name}
          placeholder={parent ? "Ex.: Condomínio, IPTU, Conta de gás" : "Ex.: Moradia"}
          required
          autoFocus
        />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        {parent ? (
          <div />
        ) : (
          <div>
            <label className="label">Grupo na DRE</label>
            <select className="input" name="group" defaultValue={initial?.group ?? "VARIAVEL"}>
              {GROUP_ORDER.map((g) => (
                <option key={g} value={g}>{GROUP_LABEL[g]}</option>
              ))}
              <option value={TRANSFER}>Transferência (fora da DRE)</option>
            </select>
          </div>
        )}
        <div>
          <label className="label">Cor</label>
          <input
            type="color"
            name="color"
            defaultValue={initial?.color ?? parent?.color ?? "#64748b"}
            className="h-10 w-16 rounded-lg border border-border bg-surface"
          />
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

export function NewAccountButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-ghost px-3 py-1.5" onClick={() => setOpen(true)}>
        <Plus size={14} /> Conta
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova conta">
        {open && <AccountForm onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

export function AccountActions({ account }: { account: AccountValue }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <button className="rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => setOpen(true)} aria-label="Editar">
        <Pencil size={15} />
      </button>
      <button
        className="rounded-lg p-1.5 text-muted hover:bg-negative/10 hover:text-negative"
        aria-label="Excluir"
        disabled={pending}
        onClick={() =>
          confirm(`Excluir a conta "${account.name}"?`) &&
          start(async () => {
            const res = await deleteAccount(account.id);
            if (res?.error) alert(res.error);
          })
        }
      >
        <Trash size={15} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar conta">
        {open && <AccountForm initial={account} onDone={() => setOpen(false)} />}
      </Modal>
    </div>
  );
}

export function NewCategoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-ghost px-3 py-1.5" onClick={() => setOpen(true)}>
        <Plus size={14} /> Categoria
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova categoria">
        {open && <CategoryForm onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

export function NewSubcategoryButton({ parent }: { parent: ParentRef }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
        onClick={() => setOpen(true)}
        title={`Nova subcategoria em ${parent.name}`}
      >
        + Subcategoria
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Nova subcategoria em ${parent.name}`}>
        {open && <CategoryForm parent={parent} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

export function CategoryActions({ category, parent }: { category: CategoryValue; parent?: ParentRef }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <button className="rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => setOpen(true)} aria-label="Editar">
        <Pencil size={15} />
      </button>
      <button
        className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
        title={category.archived ? "Reativar" : "Arquivar"}
        disabled={pending}
        onClick={() => start(() => toggleCategoryArchived(category.id))}
      >
        {category.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={parent ? "Editar subcategoria" : "Editar categoria"}>
        {open && <CategoryForm initial={category} parent={parent} onDone={() => setOpen(false)} />}
      </Modal>
    </div>
  );
}

"use client";

import { Trash } from "lucide-react";
import { useActionState, useState } from "react";
import { deleteMyAccount } from "@/app/actions";
import { Modal } from "./modal";

/** Zona de perigo em Configurações: excluir a conta e todos os dados. */
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  return (
    <section className="card border-negative/30">
      <h2 className="font-semibold text-negative">Excluir minha conta</h2>
      <p className="mt-1 text-sm text-muted">
        Apaga de forma definitiva a sua conta e todos os dados: contas, categorias, lançamentos, orçamentos e metas. Não
        é possível desfazer. Se quiser guardar uma cópia, use “Exportar CSV” em Relatórios antes.
      </p>
      <button className="btn btn-danger mt-3 border border-negative/40" onClick={() => setOpen(true)}>
        <Trash size={16} /> Excluir minha conta
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Excluir minha conta">
        {open && <DeleteAccountForm onCancel={() => setOpen(false)} />}
      </Modal>
    </section>
  );
}

function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const [state, action, pending] = useActionState(deleteMyAccount, undefined);
  return (
    <form action={action} className="space-y-4">
      <p className="rounded-xl bg-negative/10 p-3 text-sm text-negative">
        Esta ação é <b>definitiva</b>. Todos os seus dados serão apagados e não poderão ser recuperados.
      </p>
      <div>
        <label className="label" htmlFor="del-password">Sua senha</label>
        <input className="input" id="del-password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="del-confirm">Digite EXCLUIR para confirmar</label>
        <input className="input" id="del-confirm" name="confirmation" autoComplete="off" required />
      </div>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn bg-negative text-white hover:opacity-90" disabled={pending}>
          {pending ? "Excluindo…" : "Excluir definitivamente"}
        </button>
      </div>
    </form>
  );
}

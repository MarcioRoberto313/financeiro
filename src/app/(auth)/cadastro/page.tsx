"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/app/actions";

export default function CadastroPage() {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Criar conta</h1>
        <p className="text-sm text-muted">As categorias padrão e uma conta inicial são criadas para você.</p>
      </div>
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input className="input" id="name" name="name" autoComplete="name" required />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha (mínimo 8 caracteres)</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Criando…" : "Criar conta"}
      </button>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary">
          Entrar
        </Link>
      </p>
    </form>
  );
}

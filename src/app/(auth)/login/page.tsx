"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="text-sm text-muted">Acompanhe seu orçamento, DRE e metas.</p>
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">Senha</label>
          <Link href="/esqueci-senha" className="mb-1 text-xs font-medium text-primary">
            Esqueci minha senha
          </Link>
        </div>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="remember" className="mt-0.5" />
        <span>
          Manter conectado neste dispositivo
          <span className="block text-xs text-muted">Use só no seu computador ou celular pessoal. Sem marcar, a sessão termina ao fechar o navegador.</span>
        </span>
      </label>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-muted">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-primary">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

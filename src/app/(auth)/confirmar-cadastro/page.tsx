import { Suspense } from "react";
import Link from "next/link";
import { param, type SearchParams } from "@/lib/period";
import { ConfirmSignupForm } from "./confirm-form";

export const metadata = { title: "Confirmar cadastro" };

export default function ConfirmarCadastroPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="card h-56 animate-pulse" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const token = param(await searchParams, "token") ?? "";
  if (!token) {
    return (
      <div className="card space-y-3 text-sm">
        <h1 className="text-xl font-semibold">Link inválido</h1>
        <p className="text-muted">Abra o link exatamente como veio no e-mail, ou faça o cadastro novamente.</p>
        <Link href="/cadastro" className="btn btn-primary w-full">
          Fazer cadastro
        </Link>
      </div>
    );
  }
  return <ConfirmSignupForm token={token} />;
}

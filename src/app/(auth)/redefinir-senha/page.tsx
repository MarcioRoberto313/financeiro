import { Suspense } from "react";
import Link from "next/link";
import { param, type SearchParams } from "@/lib/period";
import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Criar nova senha" };

export default function RedefinirSenhaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="card h-72 animate-pulse" />}>
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
        <p className="text-muted">Abra o link exatamente como veio no e-mail, ou peça um novo.</p>
        <Link href="/esqueci-senha" className="btn btn-primary w-full">
          Pedir novo link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}

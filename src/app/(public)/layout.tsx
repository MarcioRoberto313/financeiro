import Link from "next/link";
import { Logo } from "@/components/logo";

/** Páginas institucionais, abertas sem login (privacidade, exclusão de conta). */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/login" className="mb-8 inline-block">
          <Logo />
        </Link>
        <article className="card space-y-4 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc">
          {children}
        </article>
        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/privacidade" className="underline">Privacidade</Link>
          {" · "}
          <Link href="/excluir-conta" className="underline">Excluir conta</Link>
          {" · "}
          <Link href="/login" className="underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

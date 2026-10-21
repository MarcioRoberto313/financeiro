import Link from "next/link";
import { APP_NAME, contactEmail } from "@/lib/site";

export const metadata = { title: "Como excluir sua conta" };

/** Página pública exigida pela Google Play: explica como pedir a exclusão da conta. */
export default function ExcluirContaPage() {
  const email = contactEmail();
  return (
    <>
      <h1>Como excluir sua conta</h1>
      <p>Você pode excluir a sua conta do {APP_NAME} e todos os seus dados a qualquer momento, pelo próprio aplicativo:</p>
      <ol className="ml-5 list-decimal space-y-1">
        <li>
          <Link href="/login" className="text-primary underline">Entre na sua conta</Link>.
        </li>
        <li>Abra <b>Configurações</b> no menu.</li>
        <li>No final da página, clique em <b>Excluir minha conta</b>.</li>
        <li>Digite a sua senha e a palavra <b>EXCLUIR</b> para confirmar.</li>
      </ol>

      <h2>O que é apagado</h2>
      <p>
        Tudo: nome, e-mail, senha e todos os dados financeiros (contas, categorias, lançamentos, orçamentos e metas). A
        exclusão é imediata e definitiva. Cópias de segurança mantidas pelos provedores de infraestrutura podem levar
        alguns dias para serem eliminadas.
      </p>

      <h2>Não consegue entrar?</h2>
      <p>
        Use <Link href="/esqueci-senha" className="text-primary underline">Esqueci minha senha</Link> para recuperar o
        acesso e depois siga os passos acima.
        {email && (
          <>
            {" "}Se não for possível, peça a exclusão pelo e-mail{" "}
            <a href={`mailto:${email}?subject=Excluir%20minha%20conta`} className="text-primary underline">{email}</a>,
            enviando a mensagem a partir do e-mail cadastrado.
          </>
        )}
      </p>
    </>
  );
}

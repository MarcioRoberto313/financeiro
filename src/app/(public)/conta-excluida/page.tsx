import Link from "next/link";

export const metadata = { title: "Conta excluída" };

export default function ContaExcluidaPage() {
  return (
    <>
      <h1>Conta excluída</h1>
      <p>A sua conta e todos os seus dados foram apagados. Obrigado por ter usado o Finanças.</p>
      <p>
        Se quiser voltar algum dia, é só{" "}
        <Link href="/cadastro" className="text-primary underline">criar uma conta nova</Link>.
      </p>
    </>
  );
}

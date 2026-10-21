import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { getAccountsWithBalance, getCategories } from "@/lib/data";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { Importer } from "@/components/importer";

export const metadata = { title: "Importar" };

export default function ImportarPage() {
  return (
    <>
      <PageHeader
        title="Importar lançamentos"
        subtitle="Envie um extrato OFX ou uma planilha CSV. As categorias são sugeridas a partir do seu histórico, e lançamentos repetidos do OFX são ignorados."
      />
      <Suspense fallback={<PageSkeleton />}>
        <ImportContent />
      </Suspense>
    </>
  );
}

async function ImportContent() {
  const user = await requireUser();
  const [accounts, categories] = await Promise.all([getAccountsWithBalance(user.id), getCategories(user.id)]);
  return (
    <Importer
      accounts={accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, group: c.group, parentId: c.parentId }))}
    />
  );
}

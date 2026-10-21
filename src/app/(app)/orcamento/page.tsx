import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { getYearMatrix, type CategoryRow } from "@/lib/data";
import { getPeriod, type SearchParams } from "@/lib/period";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { PeriodPicker } from "@/components/period-picker";
import { BudgetEditor, type BudgetCat } from "@/components/budget-editor";

export const metadata = { title: "Orçamento" };

export default function OrcamentoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Orcamento searchParams={searchParams} />
    </Suspense>
  );
}

async function Orcamento({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { year, month } = getPeriod(await searchParams);
  const matrix = await getYearMatrix(user.id, year);
  // Só dados simples vão para o componente do navegador (sem as funções da matriz)
  const toCat = (c: CategoryRow): BudgetCat => ({
    id: c.id,
    name: c.name,
    group: c.group,
    color: c.color,
    children: (c.children ?? []).map(toCat),
  });
  const categories = matrix.categories.filter((c) => !c.id.startsWith("__")).map(toCat);
  const initial = Object.fromEntries(
    categories.flatMap((c) => [c, ...c.children]).map((c) => [c.id, matrix.budget(c.id)]),
  );

  return (
    <>
      <PageHeader
        title="Orçamento"
        subtitle="Projete receitas e despesas mês a mês. O realizado é comparado com estes valores em Orçado x Realizado e na DRE."
        actions={<PeriodPicker year={year} month={month} mode="year" />}
      />
      {/* key força remontar o editor ao trocar de ano */}
      <BudgetEditor key={year} year={year} categories={categories} initial={initial} />
    </>
  );
}

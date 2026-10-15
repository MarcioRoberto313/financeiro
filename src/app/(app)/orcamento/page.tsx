import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { getYearMatrix } from "@/lib/data";
import { getPeriod, type SearchParams } from "@/lib/period";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { PeriodPicker } from "@/components/period-picker";
import { BudgetEditor } from "@/components/budget-editor";

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
  const categories = matrix.categories.filter((c) => !c.id.startsWith("__"));
  const initial = Object.fromEntries(categories.map((c) => [c.id, matrix.budget(c.id)]));

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

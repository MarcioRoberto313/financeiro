"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { MONTHS_LONG } from "@/lib/format";

/** Navega entre meses (ou anos, com mode="year") mantendo os demais filtros da URL. */
export function PeriodPicker({
  year,
  month,
  mode = "month",
  extra = {},
}: {
  year: number;
  month: number;
  mode?: "month" | "year";
  extra?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (y: number, m: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
    params.set("ano", String(y));
    if (mode === "month") params.set("mes", String(m));
    router.push(`${pathname}?${params}`);
  };
  const shift = (delta: number) => {
    if (mode === "year") return go(year + delta, month);
    const d = new Date(year, month - 1 + delta, 1);
    go(d.getFullYear(), d.getMonth() + 1);
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
      <button className="rounded-lg p-1.5 hover:bg-surface-2" onClick={() => shift(-1)} aria-label="Anterior">
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-36 text-center text-sm font-medium">
        {mode === "year" ? year : `${MONTHS_LONG[month - 1]} ${year}`}
      </span>
      <button className="rounded-lg p-1.5 hover:bg-surface-2" onClick={() => shift(1)} aria-label="Próximo">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, moneyCompact } from "@/lib/format";

const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    fontSize: 12,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted)", marginBottom: 4 },
  formatter: (v: unknown) => money(Number(v)),
};

/** Receitas x despesas por mês, com linha de resultado. */
export function IncomeExpenseChart({ data }: { data: { label: string; receitas: number; despesas: number; saldo: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={70} tickFormatter={(v) => moneyCompact(v)} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Line dataKey="saldo" name="Resultado" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Rosca de despesas por categoria. */
export function CategoryDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted">Total</span>
        <span className="text-sm font-semibold tabular-nums">{money(total)}</span>
      </div>
    </div>
  );
}

/** Orçado x realizado (barras lado a lado). */
export function BudgetActualChart({
  data,
  height = 300,
}: {
  data: { label: string; orcado: number; realizado: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} interval={0} tick={{ fontSize: 11 }} />
        <YAxis {...axis} width={70} tickFormatter={(v) => moneyCompact(v)} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="orcado" name="Orçado" fill="#c7d2fe" radius={[6, 6, 0, 0]} maxBarSize={26} />
        <Bar dataKey="realizado" name="Realizado" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barras empilhadas por categoria ao longo dos meses. */
export function StackedCategoryChart({
  data,
  series,
}: {
  data: Record<string, number | string>[];
  series: { key: string; name: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={70} tickFormatter={(v) => moneyCompact(v)} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Evolução do patrimônio (saldo acumulado). */
export function BalanceChart({ data }: { data: { label: string; saldo: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={70} tickFormatter={(v) => moneyCompact(v)} />
        <Tooltip {...tooltipStyle} />
        <Line dataKey="saldo" name="Saldo" stroke="#4f46e5" strokeWidth={2.5} dot={false} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

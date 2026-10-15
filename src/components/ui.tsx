import type { ReactNode } from "react";
import { money } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "default" | "positive" | "negative";
  icon?: ReactNode;
}) {
  const color = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="card">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{label}</span>
        {icon}
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${color}`}>{value}</p>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Progress({ value, color, over }: { value: number; color?: string; over?: boolean }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={`h-full rounded-full ${over ? "bg-negative" : color ? "" : "bg-primary"}`}
        style={{ width: `${w}%`, ...(color && !over ? { background: color } : {}) }}
      />
    </div>
  );
}

/** Valor colorido: verde se favorável, vermelho se desfavorável. */
export function Signed({ cents, favorable }: { cents: number; favorable?: boolean }) {
  const good = favorable ?? cents >= 0;
  return <span className={cents === 0 ? "text-muted" : good ? "text-positive" : "text-negative"}>{money(cents)}</span>;
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-56 rounded-lg bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-surface-2" />
    </div>
  );
}

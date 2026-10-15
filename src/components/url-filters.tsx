"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/** Atualiza um parâmetro da URL preservando os demais (recebidos via `current`). */
function useSetParam(current: Record<string, string | undefined>) {
  const router = useRouter();
  const pathname = usePathname();
  return (key: string, value: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, [key]: value })) if (v) params.set(k, v);
    router.push(`${pathname}?${params}`);
  };
}

export function UrlSelect({
  name,
  value,
  current,
  options,
  placeholder,
}: {
  name: string;
  value?: string;
  current: Record<string, string | undefined>;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const set = useSetParam(current);
  return (
    <select className="input w-auto" value={value ?? ""} onChange={(e) => set(name, e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function UrlSearch({ value, current }: { value?: string; current: Record<string, string | undefined> }) {
  const set = useSetParam(current);
  const [q, setQ] = useState(value ?? "");
  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        set("q", q.trim());
      }}
    >
      <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input className="input w-56 pl-9" placeholder="Buscar descrição" value={q} onChange={(e) => setQ(e.target.value)} />
    </form>
  );
}

export function UrlTabs({
  name,
  value,
  current,
  options,
}: {
  name: string;
  value: string;
  current: Record<string, string | undefined>;
  options: { value: string; label: string }[];
}) {
  const set = useSetParam(current);
  return (
    <div className="flex rounded-xl border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => set(name, o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm ${value === o.value ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

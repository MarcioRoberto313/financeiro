"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Calculator,
  ChartColumn,
  LayoutDashboard,
  Menu,
  Scale,
  Settings,
  Table2,
  Target,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/orcamento", label: "Orçamento", icon: Calculator },
  { href: "/acompanhamento", label: "Orçado x Realizado", icon: Scale },
  { href: "/dre", label: "DRE", icon: Table2 },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/relatorios", label: "Relatórios", icon: ChartColumn },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const MOBILE = ["/dashboard", "/lancamentos", "/acompanhamento", "/metas"];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
              active ? "bg-white/10 font-medium text-white" : "text-sidebar-fg hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ footer }: { footer: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar p-4 lg:flex">
      <div className="mb-8 px-2 pt-2">
        <Logo light />
      </div>
      <NavLinks />
      <div className="mt-auto">{footer}</div>
    </aside>
  );
}

export function MobileNav({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button className="btn btn-ghost px-2" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu size={18} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar p-4">
            <div className="mb-6 flex items-center justify-between px-2 pt-2">
              <Logo light />
              <button className="text-sidebar-fg" onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto">{footer}</div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.filter((n) => MOBILE.includes(n.href)).map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] ${active ? "text-primary" : "text-muted"}`}
            >
              <Icon size={20} />
              {label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

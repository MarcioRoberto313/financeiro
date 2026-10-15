import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { MobileNav, Sidebar } from "@/components/nav";
import { requireUser } from "@/lib/session";
import { logout } from "@/app/actions";

async function UserBox() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
        {user.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-sidebar-fg">{user.email}</p>
      </div>
      <form action={logout}>
        <button className="text-sidebar-fg hover:text-white" aria-label="Sair" title="Sair">
          <LogOut size={16} />
        </button>
      </form>
    </div>
  );
}

const footer = (
  <Suspense fallback={<div className="h-14 rounded-xl bg-white/5" />}>
    <UserBox />
  </Suspense>
);

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <Sidebar footer={footer} />
      <div className="min-w-0 flex-1">
        <MobileNav footer={footer} />
        <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-24 lg:px-8 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}

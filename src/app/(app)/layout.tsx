import { Suspense } from "react";
import { LogOut, Mail, MessageCircle } from "lucide-react";
import { MobileNav, Sidebar } from "@/components/nav";
import { requireUser } from "@/lib/session";
import { APP_NAME, contactEmail, contactWhatsapp } from "@/lib/site";
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

/** Bloco "Ajuda" do menu lateral: WhatsApp e e-mail de contato (CONTACT_WHATSAPP / CONTACT_EMAIL). */
function HelpBox() {
  const whatsapp = contactWhatsapp(`Olá! Preciso de ajuda com o ${APP_NAME}.`);
  const email = contactEmail();
  if (!whatsapp && !email) return null;
  const item = "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-sidebar-fg transition hover:bg-white/5 hover:text-white";
  return (
    <div className="mb-3 border-t border-white/10 pt-3">
      <p className="mb-1 px-2 text-[11px] font-medium tracking-wide text-sidebar-fg/70 uppercase">Ajuda</p>
      {whatsapp && (
        <a href={whatsapp.url} target="_blank" rel="noopener noreferrer" className={item} title={`WhatsApp ${whatsapp.label}`}>
          <MessageCircle size={15} className="shrink-0 text-emerald-400" />
          {/* Sem o "+55 " para caber no menu; o link já leva o código do país */}
          <span className="truncate">{whatsapp.label.replace(/^\+55 /, "")}</span>
        </a>
      )}
      {email && (
        <a href={`mailto:${email}?subject=${encodeURIComponent(`Ajuda – ${APP_NAME}`)}`} className={item}>
          <Mail size={15} className="shrink-0 text-indigo-300" />
          <span className="truncate">{email}</span>
        </a>
      )}
    </div>
  );
}

const footer = (
  <>
    <HelpBox />
    <Suspense fallback={<div className="h-14 rounded-xl bg-white/5" />}>
      <UserBox />
    </Suspense>
  </>
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

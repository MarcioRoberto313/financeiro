import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}

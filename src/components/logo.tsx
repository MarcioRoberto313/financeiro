export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-end justify-center gap-[3px] rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 pb-2">
        <span className="h-2 w-1.5 rounded-sm bg-indigo-200" />
        <span className="h-3 w-1.5 rounded-sm bg-indigo-100" />
        <span className="h-4 w-1.5 rounded-sm bg-white" />
      </div>
      <span className={`text-lg font-semibold tracking-tight ${light ? "text-white" : "text-foreground"}`}>Finanças</span>
    </div>
  );
}

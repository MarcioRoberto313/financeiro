import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { toISODate, yearRange } from "@/lib/format";

const esc = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export async function GET(request: Request) {
  const user = await requireUser();
  const year = Number(new URL(request.url).searchParams.get("ano")) || new Date().getFullYear();
  const txs = await db.transaction.findMany({
    where: { userId: user.id, date: yearRange(year) },
    include: { account: { select: { name: true } }, category: { select: { name: true, group: true } } },
    orderBy: { date: "asc" },
  });
  const lines = [
    "Data;Descrição;Categoria;Grupo;Conta;Valor;Observações",
    ...txs.map((t) =>
      [
        toISODate(t.date).split("-").reverse().join("/"),
        esc(t.description),
        esc(t.category?.name ?? ""),
        t.category?.group ?? "",
        esc(t.account.name),
        (t.amount / 100).toFixed(2).replace(".", ","),
        esc(t.notes ?? ""),
      ].join(";"),
    ),
  ];
  // BOM para o Excel abrir com acentuação correta.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lancamentos-${year}.csv"`,
    },
  });
}

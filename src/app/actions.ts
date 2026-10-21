"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession, requireUserId } from "@/lib/session";
import { GROUP_ORDER, TRANSFER, type DreGroup } from "@/lib/constants";
import { createDefaultCategories } from "@/lib/default-categories";
import { dateFromISO, parseMoney } from "@/lib/format";

export type FormState = { error?: string; ok?: boolean; message?: string } | undefined;

const refreshAll = () => revalidatePath("/", "layout");

// ---------- Autenticação ----------

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "E-mail ou senha inválidos." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.email("E-mail inválido.").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "Já existe uma conta com este e-mail." };

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      accounts: { create: [{ name: "Conta principal", type: "CORRENTE" }] },
    },
  });
  await createDefaultCategories(db, user.id);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

// ---------- Lançamentos ----------

const txSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  description: z.string().trim().min(1, "Informe a descrição."),
  amount: z.string(),
  type: z.enum(["RECEITA", "DESPESA"]),
  accountId: z.string().min(1, "Escolha a conta."),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

export async function saveTransaction(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = txSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const cents = parseMoney(d.amount);
  if (cents === null || cents === 0) return { error: "Valor inválido." };

  const account = await db.account.findFirst({ where: { id: d.accountId, userId } });
  if (!account) return { error: "Conta não encontrada." };
  const categoryId = d.categoryId || null;
  if (categoryId && !(await db.category.findFirst({ where: { id: categoryId, userId } }))) {
    return { error: "Categoria não encontrada." };
  }

  const data = {
    date: dateFromISO(d.date),
    description: d.description,
    amount: Math.abs(cents) * (d.type === "RECEITA" ? 1 : -1),
    accountId: account.id,
    categoryId,
    notes: d.notes?.trim() || null,
  };
  if (d.id) {
    const res = await db.transaction.updateMany({ where: { id: d.id, userId }, data });
    if (res.count === 0) return { error: "Lançamento não encontrado." };
  } else {
    await db.transaction.create({ data: { ...data, userId } });
  }
  refreshAll();
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const userId = await requireUserId();
  await db.transaction.deleteMany({ where: { id, userId } });
  refreshAll();
}

export async function setTransactionCategory(id: string, categoryId: string | null) {
  const userId = await requireUserId();
  if (categoryId && !(await db.category.findFirst({ where: { id: categoryId, userId } }))) return;
  await db.transaction.updateMany({ where: { id, userId }, data: { categoryId } });
  refreshAll();
}

// ---------- Importação ----------

export type ImportRow = {
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // centavos, com sinal
  categoryId?: string | null;
  fitId?: string | null;
};

export async function importTransactions(accountId: string, rows: ImportRow[]) {
  const userId = await requireUserId();
  const account = await db.account.findFirst({ where: { id: accountId, userId } });
  if (!account) return { error: "Conta não encontrada.", imported: 0, skipped: 0 };

  const validCats = new Set((await db.category.findMany({ where: { userId }, select: { id: true } })).map((c) => c.id));
  const fitIds = rows.map((r) => r.fitId).filter((x): x is string => !!x);
  const existing = new Set(
    (
      await db.transaction.findMany({
        where: { accountId, fitId: { in: fitIds } },
        select: { fitId: true },
      })
    ).map((t) => t.fitId),
  );

  const batch = `imp_${Date.now()}`;
  const data = rows
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isInteger(r.amount) && r.amount !== 0)
    .filter((r) => {
      if (!r.fitId) return true;
      if (existing.has(r.fitId)) return false;
      existing.add(r.fitId); // também evita FITID repetido dentro do mesmo arquivo
      return true;
    })
    .map((r) => ({
      userId,
      accountId,
      date: dateFromISO(r.date),
      description: r.description.slice(0, 200) || "(sem descrição)",
      amount: r.amount,
      categoryId: r.categoryId && validCats.has(r.categoryId) ? r.categoryId : null,
      fitId: r.fitId || null,
      importBatch: batch,
    }));

  if (data.length) await db.transaction.createMany({ data });
  refreshAll();
  return { imported: data.length, skipped: rows.length - data.length };
}

/** Sugere categorias com base em lançamentos anteriores com a mesma descrição. */
export async function suggestCategories(descriptions: string[]) {
  const userId = await requireUserId();
  const past = await db.transaction.findMany({
    where: { userId, categoryId: { not: null } },
    select: { description: true, categoryId: true },
    orderBy: { date: "desc" },
    take: 3000,
  });
  const norm = (s: string) => s.toLowerCase().replace(/\d+/g, "").replace(/\s+/g, " ").trim();
  const map = new Map<string, string>();
  for (const p of past) {
    const k = norm(p.description);
    if (!map.has(k)) map.set(k, p.categoryId!);
  }
  return descriptions.map((d) => {
    const k = norm(d);
    if (map.has(k)) return map.get(k)!;
    for (const [key, cat] of map) if (key.length >= 4 && (k.includes(key) || key.includes(k))) return cat;
    return null;
  });
}

// ---------- Orçamento ----------

export async function saveBudget(year: number, entries: { categoryId: string; month: number; amount: number }[]) {
  const userId = await requireUserId();
  const validCats = new Set((await db.category.findMany({ where: { userId }, select: { id: true } })).map((c) => c.id));
  const ops = entries
    .filter((e) => validCats.has(e.categoryId) && e.month >= 1 && e.month <= 12 && Number.isInteger(e.amount))
    .map((e) =>
      e.amount > 0
        ? db.budget.upsert({
            where: { userId_categoryId_year_month: { userId, categoryId: e.categoryId, year, month: e.month } },
            create: { userId, categoryId: e.categoryId, year, month: e.month, amount: e.amount },
            update: { amount: e.amount },
          })
        : db.budget.deleteMany({ where: { userId, categoryId: e.categoryId, year, month: e.month } }),
    );
  await db.$transaction(ops);
  refreshAll();
  return { saved: ops.length };
}

/** Preenche o orçamento do ano com a média mensal realizada no ano anterior. */
export async function budgetFromPreviousYear(year: number) {
  const userId = await requireUserId();
  const txs = await db.transaction.findMany({
    where: {
      userId,
      categoryId: { not: null },
      date: { gte: new Date(Date.UTC(year - 1, 0, 1)), lt: new Date(Date.UTC(year, 0, 1)) },
    },
    select: { categoryId: true, amount: true, date: true },
  });
  if (!txs.length) return { error: `Não há lançamentos em ${year - 1}.` };
  const months = new Set(txs.map((t) => t.date.getUTCMonth())).size;
  const totals = new Map<string, number>();
  for (const t of txs) totals.set(t.categoryId!, (totals.get(t.categoryId!) ?? 0) + Math.abs(t.amount));
  const entries = [...totals].flatMap(([categoryId, total]) =>
    Array.from({ length: 12 }, (_, i) => ({ categoryId, month: i + 1, amount: Math.round(total / months / 100) * 100 })),
  );
  return saveBudget(year, entries);
}

// ---------- Metas ----------

export async function saveGoal(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const target = parseMoney(String(formData.get("targetAmount") ?? ""));
  const deadline = String(formData.get("deadline") ?? "");
  const color = String(formData.get("color") ?? "#10b981");
  const id = String(formData.get("id") ?? "");
  if (!name) return { error: "Informe o nome da meta." };
  if (!target || target <= 0) return { error: "Informe o valor da meta." };
  const data = { name, targetAmount: target, color, deadline: deadline ? dateFromISO(deadline) : null };
  if (id) await db.goal.updateMany({ where: { id, userId }, data });
  else await db.goal.create({ data: { ...data, userId } });
  refreshAll();
  return { ok: true };
}

export async function deleteGoal(id: string) {
  const userId = await requireUserId();
  await db.goal.deleteMany({ where: { id, userId } });
  refreshAll();
}

export async function addContribution(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const goalId = String(formData.get("goalId") ?? "");
  const amount = parseMoney(String(formData.get("amount") ?? ""));
  const withdraw = formData.get("withdraw") === "on";
  const date = String(formData.get("date") ?? "");
  if (!(await db.goal.findFirst({ where: { id: goalId, userId } }))) return { error: "Meta não encontrada." };
  if (!amount) return { error: "Informe o valor." };
  await db.goalContribution.create({
    data: {
      goalId,
      amount: Math.abs(amount) * (withdraw ? -1 : 1),
      date: date ? dateFromISO(date) : new Date(),
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });
  refreshAll();
  return { ok: true };
}

// ---------- Contas e categorias ----------

export async function saveAccount(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "CORRENTE");
  const color = String(formData.get("color") ?? "#6366f1");
  const initialBalance = parseMoney(String(formData.get("initialBalance") ?? "0")) ?? 0;
  if (!name) return { error: "Informe o nome da conta." };
  const data = { name, type, color, initialBalance };
  if (id) await db.account.updateMany({ where: { id, userId }, data });
  else await db.account.create({ data: { ...data, userId } });
  refreshAll();
  return { ok: true };
}

export async function deleteAccount(id: string) {
  const userId = await requireUserId();
  const count = await db.transaction.count({ where: { accountId: id, userId } });
  if (count > 0) return { error: `A conta tem ${count} lançamentos. Exclua ou mova os lançamentos antes.` };
  await db.account.deleteMany({ where: { id, userId } });
  refreshAll();
  return { ok: true };
}

export async function saveCategory(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  let group = String(formData.get("group") ?? "VARIAVEL");
  let color = String(formData.get("color") ?? "#64748b");
  if (!name) return { error: "Informe o nome." };

  if (parentId) {
    // Subcategoria: herda grupo da DRE da categoria pai (só existem dois níveis)
    const parent = await db.category.findFirst({ where: { id: parentId, userId, parentId: null } });
    if (!parent) return { error: "Categoria principal não encontrada." };
    if (id && (await db.category.count({ where: { parentId: id } })) > 0) {
      return { error: "Esta categoria tem subcategorias e não pode virar subcategoria." };
    }
    group = parent.group;
    if (!formData.get("color")) color = parent.color;
  }
  if (![...GROUP_ORDER, TRANSFER].includes(group as DreGroup)) return { error: "Grupo inválido." };
  const kind = group === "RECEITA" ? "RECEITA" : group === TRANSFER ? TRANSFER : "DESPESA";

  const duplicate = await db.category.findFirst({
    where: { userId, parentId, name: { equals: name, mode: "insensitive" }, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) return { error: parentId ? "Já existe uma subcategoria com esse nome aqui." : "Já existe uma categoria com esse nome." };

  const data = { name, group, color, kind, parentId };
  if (id) {
    const res = await db.category.updateMany({ where: { id, userId }, data });
    if (res.count === 0) return { error: "Categoria não encontrada." };
    // Mudou o grupo da categoria: as subcategorias acompanham
    await db.category.updateMany({ where: { parentId: id, userId }, data: { group, kind } });
  } else {
    await db.category.create({ data: { ...data, userId } });
  }
  refreshAll();
  return { ok: true };
}

export async function toggleCategoryArchived(id: string) {
  const userId = await requireUserId();
  const cat = await db.category.findFirst({ where: { id, userId } });
  if (!cat) return;
  await db.category.update({ where: { id }, data: { archived: !cat.archived } });
  refreshAll();
}

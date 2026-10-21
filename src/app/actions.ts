"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession, requireUserId } from "@/lib/session";
import { GROUP_ORDER, TRANSFER, type DreGroup } from "@/lib/constants";
import { createDefaultCategories } from "@/lib/default-categories";
import { passwordResetEmail, sendEmail, signupConfirmationEmail } from "@/lib/email";
import { dateFromISO, parseMoney } from "@/lib/format";

export type FormState = { error?: string; ok?: boolean; message?: string } | undefined;

const refreshAll = () => revalidatePath("/", "layout");

// ---------- Autenticação ----------

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    // Cadastro feito mas ainda não confirmado: explica em vez de dizer "senha inválida"
    if (!user && (await db.pendingSignup.findUnique({ where: { email } }))) {
      return { error: "Seu cadastro ainda não foi confirmado. Abra o link que enviamos para o seu e-mail." };
    }
    return { error: "E-mail ou senha inválidos." };
  }
  await createSession(user.id, user.sessionVersion, remember);
  redirect("/dashboard");
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome."),
    email: z.email("E-mail inválido.").transform((e) => e.trim().toLowerCase()),
    emailConfirm: z.string().transform((e) => e.trim().toLowerCase()),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  })
  .refine((d) => d.email === d.emailConfirm, { message: "Os e-mails não conferem. Digite o mesmo e-mail nos dois campos." });

const SIGNUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Cadastro em duas etapas: aqui só guarda os dados como pendentes e envia o link de
 * confirmação. A conta é criada em `confirmSignup`, quando a pessoa prova que o e-mail é dela.
 */
export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) {
    return { error: "Já existe uma conta com este e-mail. Use “Esqueci minha senha” se não lembrar a senha." };
  }

  // Evita disparos repetidos para o mesmo e-mail
  const recent = await db.pendingSignup.findUnique({ where: { email } });
  if (recent && recent.createdAt > new Date(Date.now() - 2 * 60 * 1000)) {
    return { error: "Acabamos de enviar um link para este e-mail. Aguarde 2 minutos para pedir outro." };
  }

  const token = randomBytes(32).toString("base64url");
  await db.pendingSignup.deleteMany({ where: { OR: [{ email }, { expiresAt: { lt: new Date() } }] } });
  const pending = await db.pendingSignup.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + SIGNUP_TTL_MS),
    },
  });
  const mail = signupConfirmationEmail(name, `${await appUrl()}/confirmar-cadastro?token=${token}`);
  const sent = await sendEmail({ to: email, ...mail });
  if (!sent.ok) {
    await db.pendingSignup.delete({ where: { id: pending.id } });
    return { error: "Não foi possível enviar o e-mail de confirmação agora. Confira o endereço e tente de novo." };
  }
  return { ok: true, message: email };
}

/** Segunda etapa do cadastro: cria a conta a partir do link enviado por e-mail. */
export async function confirmSignup(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const pending = token ? await db.pendingSignup.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  if (!pending || pending.expiresAt < new Date()) {
    return { error: "Este link expirou ou já foi usado. Faça o cadastro novamente." };
  }
  if (await db.user.findUnique({ where: { email: pending.email } })) {
    await db.pendingSignup.delete({ where: { id: pending.id } });
    return { ok: true, message: "Esta conta já estava confirmada." };
  }
  const user = await db.user.create({
    data: {
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      accounts: { create: [{ name: "Conta principal", type: "CORRENTE" }] },
    },
  });
  await createDefaultCategories(db, user.id);
  await db.pendingSignup.delete({ where: { id: pending.id } });
  // Sem login automático: a pessoa entra com e-mail e senha
  return { ok: true, message: "Conta criada!" };
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

/**
 * Exclusão definitiva da conta do usuário e de todos os dados (exigida pela Google Play
 * e pela App Store para apps com cadastro). Pede a senha e a palavra EXCLUIR.
 */
export async function deleteMyAccount(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "EXCLUIR") return { error: "Digite EXCLUIR para confirmar." };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Senha incorreta." };

  // Contas, categorias, lançamentos, orçamentos, metas e links de senha caem em cascata
  await db.$transaction([
    db.pendingSignup.deleteMany({ where: { email: user.email } }),
    db.user.delete({ where: { id: user.id } }),
  ]);
  await deleteSession();
  redirect("/conta-excluida");
}

// ---------- Recuperação de senha ----------

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Endereço público do app, usado no link do e-mail (nunca vem da requisição em produção). */
async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { error: "Informe um e-mail válido." };
  // A resposta é sempre a mesma, exista a conta ou não, para não revelar quem está cadastrado
  const done: FormState = {
    ok: true,
    message: "Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.",
  };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return done;

  // Evita disparos repetidos: no máximo um e-mail a cada 2 minutos por conta
  const recent = await db.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) } },
  });
  if (recent) return done;

  const token = randomBytes(32).toString("base64url");
  const [, created] = await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    }),
  ]);
  const mail = passwordResetEmail(user.name, `${await appUrl()}/redefinir-senha?token=${token}`);
  const sent = await sendEmail({ to: user.email, ...mail });
  if (!sent.ok) {
    // Falhou: descarta o link para não travar a próxima tentativa com a mensagem de sucesso
    await db.passwordResetToken.delete({ where: { id: created.id } });
    return { error: "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos." };
  }
  return done;
}

const resetSchema = z
  .object({
    token: z.string().min(20, "Link inválido."),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem." });

export async function resetPassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { token, password } = parsed.data;

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Este link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”." };
  }
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      // sessionVersion + 1 derruba as sessões abertas em todos os aparelhos
      data: { passwordHash: await bcrypt.hash(password, 10), sessionVersion: { increment: 1 } },
    }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: record.userId, NOT: { id: record.id } } }),
  ]);
  // Sem login automático: a pessoa entra de novo com a senha nova
  await deleteSession();
  return { ok: true };
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
    // Os lados de uma transferência só são editados juntos, pelo formulário de transferência
    const current = await db.transaction.findFirst({ where: { id: d.id, userId }, select: { transferGroupId: true } });
    if (!current) return { error: "Lançamento não encontrado." };
    if (current.transferGroupId) return { error: "Este lançamento é uma transferência. Edite-o como transferência." };
    await db.transaction.update({ where: { id: d.id }, data });
  } else {
    await db.transaction.create({ data: { ...data, userId } });
  }
  refreshAll();
  return { ok: true };
}

/** Categoria de transferências do usuário (fora da DRE); cria se ainda não existir. */
async function transferCategoryId(userId: string) {
  const existing = await db.category.findFirst({
    where: { userId, group: TRANSFER, parentId: null },
    orderBy: { archived: "asc" },
  });
  if (existing) return existing.id;
  const created = await db.category.create({
    data: { userId, name: "Transferência entre contas", kind: TRANSFER, group: TRANSFER, color: "#94a3b8" },
  });
  return created.id;
}

const transferSchema = z
  .object({
    groupId: z.string().optional(),
    replaceId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    description: z.string().trim().min(1, "Informe a descrição."),
    amount: z.string(),
    fromAccountId: z.string().min(1, "Escolha a conta de origem."),
    toAccountId: z.string().min(1, "Escolha a conta de destino."),
    notes: z.string().optional(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, { message: "A conta de origem e a de destino precisam ser diferentes." });

/**
 * Transferência entre contas: grava os dois lados juntos (saída na origem, entrada no
 * destino), ligados pelo mesmo transferGroupId, para o saldo nunca ficar com "perna aberta".
 */
export async function saveTransfer(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = transferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const cents = parseMoney(d.amount);
  if (cents === null || cents === 0) return { error: "Valor inválido." };
  const value = Math.abs(cents);

  const accounts = await db.account.findMany({ where: { userId, id: { in: [d.fromAccountId, d.toAccountId] } } });
  if (accounts.length !== 2) return { error: "Conta não encontrada." };

  const categoryId = await transferCategoryId(userId);
  const common = { userId, date: dateFromISO(d.date), description: d.description, notes: d.notes?.trim() || null, categoryId };
  const groupId = d.groupId || randomBytes(12).toString("base64url");

  await db.$transaction([
    // Editando: substitui os dois lados antigos pelos novos
    ...(d.groupId ? [db.transaction.deleteMany({ where: { userId, transferGroupId: d.groupId } })] : []),
    // Lançamento comum convertido em transferência: o original dá lugar ao par
    ...(d.replaceId ? [db.transaction.deleteMany({ where: { id: d.replaceId, userId, transferGroupId: null } })] : []),
    db.transaction.create({ data: { ...common, accountId: d.fromAccountId, amount: -value, transferGroupId: groupId } }),
    db.transaction.create({ data: { ...common, accountId: d.toAccountId, amount: value, transferGroupId: groupId } }),
  ]);
  refreshAll();
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const userId = await requireUserId();
  const tx = await db.transaction.findFirst({ where: { id, userId }, select: { transferGroupId: true } });
  if (!tx) return;
  // Transferência: exclui os dois lados juntos
  await db.transaction.deleteMany({
    where: tx.transferGroupId ? { userId, transferGroupId: tx.transferGroupId } : { id, userId },
  });
  refreshAll();
}

export async function setTransactionCategory(id: string, categoryId: string | null) {
  const userId = await requireUserId();
  if (categoryId && !(await db.category.findFirst({ where: { id: categoryId, userId } }))) return;
  // A categoria dos lados de uma transferência é fixa
  await db.transaction.updateMany({ where: { id, userId, transferGroupId: null }, data: { categoryId } });
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
  const valid = entries.filter(
    (e) => validCats.has(e.categoryId) && e.month >= 1 && e.month <= 12 && Number.isInteger(e.amount),
  );
  // Duas operações em vez de uma por célula: apaga o orçamento dessas categorias/meses
  // e grava de novo só os valores positivos (muito mais rápido com o banco distante)
  const categoryIds = [...new Set(valid.map((e) => e.categoryId))];
  const months = [...new Set(valid.map((e) => e.month))];
  await db.$transaction([
    db.budget.deleteMany({ where: { userId, year, categoryId: { in: categoryIds }, month: { in: months } } }),
    db.budget.createMany({
      data: valid.filter((e) => e.amount > 0).map((e) => ({ userId, categoryId: e.categoryId, year, month: e.month, amount: e.amount })),
    }),
  ]);
  refreshAll();
  return { saved: valid.length };
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

  // Origem do valor guardado: manual, saldo de uma conta ou lançamentos de uma categoria
  const linkType = String(formData.get("linkType") ?? "MANUAL");
  if (!["MANUAL", "ACCOUNT", "CATEGORY"].includes(linkType)) return { error: "Forma de alimentação inválida." };
  const accountId = linkType === "ACCOUNT" ? String(formData.get("accountId") ?? "") : "";
  const categoryId = linkType === "CATEGORY" ? String(formData.get("categoryId") ?? "") : "";
  const startDate = String(formData.get("startDate") ?? "");
  if (linkType === "ACCOUNT" && !(await db.account.findFirst({ where: { id: accountId, userId } }))) {
    return { error: "Escolha a conta que alimenta a meta." };
  }
  if (linkType === "CATEGORY" && !(await db.category.findFirst({ where: { id: categoryId, userId } }))) {
    return { error: "Escolha a categoria que alimenta a meta." };
  }

  const data = {
    name,
    targetAmount: target,
    color,
    deadline: deadline ? dateFromISO(deadline) : null,
    linkType,
    accountId: accountId || null,
    categoryId: categoryId || null,
    startDate: linkType === "CATEGORY" && startDate ? dateFromISO(startDate) : null,
  };
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

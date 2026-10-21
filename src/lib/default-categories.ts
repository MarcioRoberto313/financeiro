import type { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "./constants";

/** Cria as categorias e subcategorias padrão do usuário. Retorna nome → id. */
export async function createDefaultCategories(db: PrismaClient, userId: string) {
  const ids: Record<string, string> = {};
  for (const { children, ...cat } of DEFAULT_CATEGORIES) {
    const parent = await db.category.create({ data: { ...cat, userId } });
    ids[cat.name] = parent.id;
    for (const name of children ?? []) {
      const child = await db.category.create({
        data: { name, userId, parentId: parent.id, kind: cat.kind, group: cat.group, color: cat.color },
      });
      ids[name] = child.id;
    }
  }
  return ids;
}

// Utilitário puro, usado tanto no servidor quanto no navegador.
import type { CategoryKind, DreGroup, TRANSFER } from "./constants";

export type CategoryOption = {
  id: string;
  name: string;
  kind: CategoryKind;
  group: DreGroup | typeof TRANSFER;
  parentId: string | null;
};

/** Categoria seguida das suas subcategorias, com o nome das filhas recuado. */
export function categoryTreeOptions(categories: CategoryOption[]) {
  const ids = new Set(categories.map((c) => c.id));
  return categories
    .filter((c) => !c.parentId || !ids.has(c.parentId))
    .flatMap((p) => [
      { ...p, label: p.name },
      ...categories.filter((c) => c.parentId === p.id).map((c) => ({ ...c, label: `   ↳ ${c.name}` })),
    ]);
}

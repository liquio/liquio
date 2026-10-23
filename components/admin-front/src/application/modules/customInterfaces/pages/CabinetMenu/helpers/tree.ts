import type { CabinetMenuItem } from './actions';

export const getItemRoute = (item: CabinetMenuItem): string => (
  (item?.options?.route as string) ||
  (item?.options?.endpoint as string) ||
  (item?.options?.path as string) ||
  ''
);

interface TreeRow extends CabinetMenuItem {
  depth: number;
  hasChildren: boolean;
  childrenCount: number;
}

export const buildTreeMeta = (items: CabinetMenuItem[] = []) => {
  const childrenByParent = new Map<string | null, CabinetMenuItem[]>();

  items.forEach((item) => {
    const parentId = item?.parentId || null;
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    (childrenByParent.get(parentId) as CabinetMenuItem[]).push(item);
  });

  childrenByParent.forEach((list) => {
    list.sort((a, b) => {
      if ((a?.order ?? 0) !== (b?.order ?? 0)) {
        return (a?.order ?? 0) - (b?.order ?? 0);
      }

      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
  });

  const countDescendants = (parentId: string | null): number => {
    const children = childrenByParent.get(parentId) || [];
    return children.reduce((acc, child) => {
      return acc + 1 + countDescendants(child.id as string);
    }, 0);
  };

  const flatten = (
    parentId: string | null = null,
    depth = 0,
    expanded: Record<string, boolean> = {}
  ): TreeRow[] => {
    const children = childrenByParent.get(parentId) || [];

    return children.flatMap((item) => {
      const childItems = childrenByParent.get(item.id as string) || [];
      const row: TreeRow = {
        ...item,
        depth,
        hasChildren: childItems.length > 0,
        childrenCount: countDescendants(item.id as string),
      };

      if (!row.hasChildren || expanded[item.id as string] !== false) {
        return [row, ...flatten(item.id as string, depth + 1, expanded)];
      }

      return [row];
    });
  };

  return {
    flatten,
    childrenByParent,
  };
};

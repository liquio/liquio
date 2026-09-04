export const getItemRoute = (item) => (
  item?.options?.route ||
  item?.options?.endpoint ||
  item?.options?.path ||
  ''
);

export const buildTreeMeta = (items = []) => {
  const childrenByParent = new Map();

  items.forEach((item) => {
    const parentId = item?.parentId || null;
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(item);
  });

  childrenByParent.forEach((list) => {
    list.sort((a, b) => {
      if ((a?.order ?? 0) !== (b?.order ?? 0)) {
        return (a?.order ?? 0) - (b?.order ?? 0);
      }

      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
  });

  const countDescendants = (parentId) => {
    const children = childrenByParent.get(parentId) || [];
    return children.reduce((acc, child) => {
      return acc + 1 + countDescendants(child.id);
    }, 0);
  };

  const flatten = (parentId = null, depth = 0, expanded = {}) => {
    const children = childrenByParent.get(parentId) || [];

    return children.flatMap((item) => {
      const childItems = childrenByParent.get(item.id) || [];
      const row = {
        ...item,
        depth,
        hasChildren: childItems.length > 0,
        childrenCount: countDescendants(item.id),
      };

      if (!row.hasChildren || expanded[item.id] !== false) {
        return [row, ...flatten(item.id, depth + 1, expanded)];
      }

      return [row];
    });
  };

  return {
    flatten,
    childrenByParent,
  };
};

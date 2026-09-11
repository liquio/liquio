import downloadFile from 'helpers/downloadFile';
import { readFileAsync } from 'helpers/parseFile';
import { createCabinetMenuItem, type CabinetMenuItem } from './actions';

type Dispatch = (action: unknown) => unknown;

const EXPORT_VERSION = 1;

const stripRuntimeFields = (item: CabinetMenuItem): Record<string, unknown> => {
  const {
    childrenCount,
    depth,
    hasChildren,
    history,
    createdAt,
    updatedAt,
    ...rest
  } = item || {};

  return rest;
};

const getExportFilename = (): string => {
  const date = new Date().toISOString().slice(0, 10);
  return `cabinet-menu-items-${date}.json`;
};

export const exportCabinetMenuItems = (items: CabinetMenuItem[]): void => {
  downloadFile(
    getExportFilename(),
    JSON.stringify({
      version: EXPORT_VERSION,
      type: 'cabinet-menu-items',
      exportedAt: new Date().toISOString(),
      items: (items || []).map(stripRuntimeFields),
    }, null, 2),
  );
};

const normalizeImportedItems = (parsed: unknown): CabinetMenuItem[] => {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray((parsed as { items?: unknown })?.items)) {
    return (parsed as { items: CabinetMenuItem[] }).items;
  }

  return [];
};

const sanitizeImportedItem = (item: CabinetMenuItem): Record<string, unknown> => {
  const {
    id,
    childrenCount,
    depth,
    hasChildren,
    history,
    createdAt,
    updatedAt,
    ...rest
  } = item || {};

  const { system, ...options } = rest.options || {};

  return {
    ...rest,
    options,
  };
};

const getNextImportItem = (
  remainingItems: CabinetMenuItem[],
  importedIdMap: Map<string, string>,
  exportedIds: Set<string>
): number => {
  const readyIndex = remainingItems.findIndex((item) => {
    const parentId = item?.parentId || null;
    return !parentId || !exportedIds.has(parentId) || importedIdMap.has(parentId);
  });

  return readyIndex === -1 ? 0 : readyIndex;
};

export const importCabinetMenuItems = async (
  file: Blob,
  existingItems: CabinetMenuItem[],
  dispatch: Dispatch
): Promise<CabinetMenuItem[]> => {
  const parsed = await readFileAsync(file);
  const importedItems = normalizeImportedItems(parsed)
    .filter((item) => item && typeof item === 'object');

  if (parsed instanceof Error || importedItems.length === 0) {
    throw new Error('InvalidFile');
  }

  const existingIds = new Set((existingItems || []).map((item) => item.id as string));
  const exportedIds = new Set(importedItems.map((item) => item.id).filter(Boolean) as string[]);
  const importedIdMap = new Map<string, string>();
  const createdItems: CabinetMenuItem[] = [];
  const remainingItems = importedItems.slice();

  while (remainingItems.length) {
    const nextIndex = getNextImportItem(remainingItems, importedIdMap, exportedIds);
    const [sourceItem] = remainingItems.splice(nextIndex, 1);
    const sourceParentId = sourceItem?.parentId || null;
    const parentId = importedIdMap.get(sourceParentId as string) || (
      existingIds.has(sourceParentId as string) ? sourceParentId : null
    );
    const payload = {
      ...sanitizeImportedItem(sourceItem),
      parentId,
    } as CabinetMenuItem;
    const createdItem = await createCabinetMenuItem(payload, dispatch);

    if (sourceItem.id && createdItem?.id) {
      importedIdMap.set(sourceItem.id, createdItem.id);
    }

    createdItems.push(createdItem);
  }

  return createdItems;
};

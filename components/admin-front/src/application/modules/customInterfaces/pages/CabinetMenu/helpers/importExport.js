import downloadFile from "helpers/downloadFile";
import { readFileAsync } from "helpers/parseFile";
import { createCabinetMenuItem } from "./actions";

const EXPORT_VERSION = 1;

const stripRuntimeFields = (item) => {
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

const getExportFilename = () => {
  const date = new Date().toISOString().slice(0, 10);
  return `cabinet-menu-items-${date}.json`;
};

export const exportCabinetMenuItems = (items) => {
  downloadFile(
    getExportFilename(),
    JSON.stringify({
      version: EXPORT_VERSION,
      type: "cabinet-menu-items",
      exportedAt: new Date().toISOString(),
      items: (items || []).map(stripRuntimeFields),
    }, null, 2),
  );
};

const normalizeImportedItems = (parsed) => {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed?.items)) {
    return parsed.items;
  }

  return [];
};

const sanitizeImportedItem = (item) => {
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

const getNextImportItem = (remainingItems, importedIdMap, exportedIds) => {
  const readyIndex = remainingItems.findIndex((item) => {
    const parentId = item?.parentId || null;
    return !parentId || !exportedIds.has(parentId) || importedIdMap.has(parentId);
  });

  return readyIndex === -1 ? 0 : readyIndex;
};

export const importCabinetMenuItems = async (file, existingItems, dispatch) => {
  const parsed = await readFileAsync(file);
  const importedItems = normalizeImportedItems(parsed)
    .filter((item) => item && typeof item === "object");

  if (parsed instanceof Error || importedItems.length === 0) {
    throw new Error("InvalidFile");
  }

  const existingIds = new Set((existingItems || []).map((item) => item.id));
  const exportedIds = new Set(importedItems.map((item) => item.id).filter(Boolean));
  const importedIdMap = new Map();
  const createdItems = [];
  const remainingItems = importedItems.slice();

  while (remainingItems.length) {
    const nextIndex = getNextImportItem(remainingItems, importedIdMap, exportedIds);
    const [sourceItem] = remainingItems.splice(nextIndex, 1);
    const sourceParentId = sourceItem?.parentId || null;
    const parentId = importedIdMap.get(sourceParentId) || (
      existingIds.has(sourceParentId) ? sourceParentId : null
    );
    const payload = {
      ...sanitizeImportedItem(sourceItem),
      parentId,
    };
    const createdItem = await createCabinetMenuItem(payload, dispatch);

    if (sourceItem.id && createdItem?.id) {
      importedIdMap.set(sourceItem.id, createdItem.id);
    }

    createdItems.push(createdItem);
  }

  return createdItems;
};

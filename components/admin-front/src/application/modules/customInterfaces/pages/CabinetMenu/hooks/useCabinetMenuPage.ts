import React from 'react';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import { useAuth } from 'hooks/useAuth';
import checkAccess from 'helpers/checkAccess';
import useTable from 'services/dataTable/useTable';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import { sortCabinetMenuItems } from '../helpers/actions';
import {
  exportCabinetMenuItems,
  importCabinetMenuItems,
} from '../helpers/importExport';
import { buildTreeMeta } from '../helpers/tree';
import type { CabinetMenuItem } from '../helpers/actions';

const writeAccess = { userHasUnit: [1000002] };

const useCabinetMenuPage = () => {
  const t = useTranslate('CabinetMenuPage');
  const dispatch = useDispatch();
  const { info: userInfo, userUnits } = useAuth();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [localItems, setLocalItems] = React.useState<CabinetMenuItem[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const tableProps = useTable({
    dataURL: 'cabinet-menu',
    sourceName: 'cabinet-menu',
    autoLoad: true,
  } as never);

  const items = (tableProps.data as CabinetMenuItem[]) || [];
  const canEdit = Boolean(checkAccess(writeAccess, userInfo as never, userUnits as never));

  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  React.useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => localItems.some((item) => item.id === id)));
  }, [localItems]);

  React.useEffect(() => {
    if (!localItems.length) {
      return;
    }

    setExpanded((prev) => {
      const nextExpanded = { ...prev };
      let changed = false;
      const { childrenByParent } = buildTreeMeta(localItems);

      childrenByParent.forEach((children, key) => {
        if (key !== null && children.length && !(key in nextExpanded)) {
          nextExpanded[key] = true;
          changed = true;
        }
      });

      return changed ? nextExpanded : prev;
    });
  }, [localItems]);

  const flattenedData = React.useMemo(() => {
    const { flatten } = buildTreeMeta(localItems);
    return flatten(null, 0, expanded);
  }, [localItems, expanded]);

  const toggleExpanded = React.useCallback((id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));
  }, []);

  const handleOpenCreate = React.useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handleCloseCreate = React.useCallback(() => {
    setCreateOpen(false);
  }, []);

  const handleRowsSelect = React.useCallback((nextSelectedIds: string[]) => {
    setSelectedIds(nextSelectedIds || []);
  }, []);

  const handleExportSelected = React.useCallback(() => {
    const selectedIdSet = new Set(selectedIds);
    const selectedItems = flattenedData.filter((item) => selectedIdSet.has(item.id as string));

    if (!selectedItems.length) {
      dispatch(addMessage(new Message(t('SelectItemsToExport'), 'warning')));
      return;
    }

    exportCabinetMenuItems(selectedItems);
    dispatch(addMessage(new Message(t('ExportSelectedSuccess'), 'success')));
  }, [dispatch, flattenedData, selectedIds, t]);

  const handleReload = React.useCallback(() => {
    (tableProps.actions as { load: () => void }).load();
  }, [tableProps.actions]);

  const handleImportFile = React.useCallback(async (file: File) => {
    if (!file) {
      return;
    }

    try {
      const importedItems = await importCabinetMenuItems(file, localItems, dispatch as never);

      dispatch(addMessage(new Message(t('ImportSelectedSuccess', { count: importedItems.length }), 'success')));
      setSelectedIds([]);
      handleReload();
    } catch (error) {
      dispatch(addMessage(new Message(t((error as { message?: string })?.message === 'InvalidFile' ? 'ImportInvalidFile' : 'ImportSelectedError'), 'error')));
    }
  }, [dispatch, handleReload, localItems, t]);

  const handleItemAction = React.useCallback((action: {
    type: string;
    reorderedItems?: CabinetMenuItem[];
    item?: CabinetMenuItem;
    id?: string;
  }) => {
    if (!action?.type) {
      return;
    }

    if (action.type === 'create') {
      setLocalItems((prev) => {
        const updatesById = new Map(
          (action.reorderedItems || []).map((item) => [item.id, item]),
        );
        const nextItems = prev.map((item) => updatesById.get(item.id) || item);
        const createdItem = action.item;

        if (createdItem?.id && !nextItems.some((item) => item.id === createdItem.id)) {
          nextItems.push(createdItem);
        }

        return nextItems;
      });

      if (action.item?.parentId) {
        setExpanded((prev) => ({
          ...prev,
          [action.item?.parentId as string]: true,
        }));
      }
      return;
    }

    if (action.type === 'update') {
      if (!action.item?.id) {
        return;
      }

      setLocalItems((prev) => prev.map((item) => (
        item.id === action.item?.id ? (action.item as CabinetMenuItem) : item
      )));
      return;
    }

    if (action.type === 'delete') {
      if (!action.id) {
        return;
      }

      setLocalItems((prev) => prev
        .filter((item) => item.id !== action.id)
        .map((item) => (
          item.parentId === action.id
            ? { ...item, parentId: null }
            : item
        )));
      setSelectedIds((prev) => prev.filter((id) => id !== action.id));
    }
  }, []);

  const selectedTableProps = React.useMemo(() => ({
    ...tableProps,
    rowsSelected: selectedIds,
    actions: {
      ...(tableProps.actions as Record<string, unknown>),
      onRowsSelect: handleRowsSelect,
    },
  }), [handleRowsSelect, selectedIds, tableProps]);

  const handleRowSortEnd = React.useCallback(async ({
    activeRow,
    overRow,
  }: {
    activeRow: CabinetMenuItem;
    overRow: CabinetMenuItem;
  }) => {
    if (!activeRow || !overRow) {
      return;
    }

    const sourceParentId = activeRow.parentId || null;
    const targetParentId = overRow.parentId || null;
    const activeHasChildren = activeRow.hasChildren ||
      localItems.some((item) => (item.parentId || null) === activeRow.id);

    if (activeHasChildren && sourceParentId !== targetParentId) {
      return;
    }

    const sortSiblings = (list: CabinetMenuItem[]) => list
      .slice()
      .sort((a, b) => {
        if (((a.order as number) ?? 0) !== ((b.order as number) ?? 0)) {
          return ((a.order as number) ?? 0) - ((b.order as number) ?? 0);
        }

        return String(a.name || '').localeCompare(String(b.name || ''));
      });

    const sourceSiblings = sortSiblings(
      localItems.filter((item) => (item.parentId || null) === sourceParentId),
    );

    const targetSiblings = sourceParentId === targetParentId
      ? sourceSiblings
      : sortSiblings(
          localItems.filter((item) => (item.parentId || null) === targetParentId),
        );

    const activeIndex = sourceSiblings.findIndex((item) => item.id === activeRow.id);
    const overIndex = targetSiblings.findIndex((item) => item.id === overRow.id);

    if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
      return;
    }

    const nextSourceSiblings = sourceSiblings.slice();
    const [movedRaw] = nextSourceSiblings.splice(activeIndex, 1);
    const moved = {
      ...movedRaw,
      parentId: targetParentId,
    };

    const nextTargetSiblings = sourceParentId === targetParentId
      ? nextSourceSiblings
      : targetSiblings.slice();

    nextTargetSiblings.splice(overIndex, 0, moved);

    const reorderedById = new Map<string, CabinetMenuItem>();

    nextSourceSiblings.forEach((item, index) => {
      reorderedById.set(item.id as string, {
        ...item,
        order: index,
        parentId: sourceParentId,
      });
    });

    nextTargetSiblings.forEach((item, index) => {
      reorderedById.set(item.id as string, {
        ...item,
        order: index,
        parentId: targetParentId,
      });
    });

    setLocalItems((prev) =>
      prev.map((item) => reorderedById.get(item.id as string) || item),
    );

    try {
      await sortCabinetMenuItems(Array.from(reorderedById.values()).map((item) => ({
        id: item.id,
        parentId: item.parentId || null,
        order: item.order,
      })), dispatch as never);
    } catch (error) {
      setLocalItems(items);
      dispatch(addMessage(new Message((error as { message?: string })?.message || t('ReorderError'), 'error')));
      handleReload();
    }
  }, [dispatch, handleReload, items, localItems, t]);

  return {
    t,
    canEdit,
    createOpen,
    expanded,
    localItems,
    flattenedData,
    tableProps: selectedTableProps,
    selectedIds,
    toggleExpanded,
    handleOpenCreate,
    handleCloseCreate,
    handleRowsSelect,
    handleExportSelected,
    handleImportFile,
    handleItemAction,
    handleRowSortEnd,
  };
};

export default useCabinetMenuPage;

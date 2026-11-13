import React from 'react';

import { getFolderIdsFromPath } from '../helpers/navigation';
import * as fileLibraryActions from '../actions/fileLibrary';

type FileItem = fileLibraryActions.FileItem;

type Dispatch = (action: unknown) => unknown;

interface UseFileLibraryParams {
  dispatch: Dispatch;
  folderPath?: string;
  history: { replace: (path: string) => void };
}

export const useFileLibrary = ({ dispatch, folderPath, history }: UseFileLibraryParams) => {
  const [items, setItems] = React.useState<FileItem[]>([]);
  const [folderStack, setFolderStack] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const folderIds = React.useMemo(() => getFolderIdsFromPath(folderPath), [folderPath]);
  const currentParentId = folderIds[folderIds.length - 1] || null;

  const loadFolderStack = React.useCallback(async () => {
    if (!folderIds.length) {
      setFolderStack([]);
      return;
    }

    const folders: FileItem[] = [];
    for (const id of folderIds) {
      const folder = (await fileLibraryActions.getItem({ dispatch, id })) as FileItem | undefined;
      if (!folder || folder.type !== 'folder') {
        history.replace('/file-library');
        return;
      }
      folders.push(folder);
    }
    setFolderStack(folders);
  }, [dispatch, folderIds, history]);

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fileLibraryActions.getItems({ dispatch, parentId: currentParentId });
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [currentParentId, dispatch]);

  React.useEffect(() => {
    loadFolderStack();
  }, [loadFolderStack]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    folderStack,
    currentParentId,
    loading,
    loadItems
  };
};

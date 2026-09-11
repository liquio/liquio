import React from 'react';

import { getFolderIdsFromPath } from '../helpers/navigation';
import * as fileLibraryActions from '../actions/fileLibrary';

export const useFileLibrary = ({ dispatch, folderPath, history }) => {
  const [items, setItems] = React.useState([]);
  const [folderStack, setFolderStack] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const folderIds = React.useMemo(() => getFolderIdsFromPath(folderPath), [folderPath]);
  const currentParentId = folderIds[folderIds.length - 1] || null;

  const loadFolderStack = React.useCallback(async () => {
    if (!folderIds.length) {
      setFolderStack([]);
      return;
    }

    const folders = [];
    for (const id of folderIds) {
      const folder = await fileLibraryActions.getItem({ dispatch, id });
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

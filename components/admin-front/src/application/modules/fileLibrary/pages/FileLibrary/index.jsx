import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import ConfirmDialog from 'components/ConfirmDialog';
import DataTable from 'components/DataTable';
import asModulePage from 'hooks/asModulePage';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import { searchUsers } from 'actions/users';

import * as fileLibraryActions from './actions/fileLibrary';
import AccessDialog from './components/AccessDialog';
import FileLibraryBreadcrumbs from './components/FileLibraryBreadcrumbs';
import FileLibraryToolbar from './components/FileLibraryToolbar';
import FolderDialog from './components/FolderDialog';
import PublicLinkDialog from './components/PublicLinkDialog';
import SelectedActions from './components/SelectedActions';
import UploadProgressDialog from './components/UploadProgressDialog';
import { getFolderPath } from './helpers/navigation';
import { useFileLibrary } from './hooks/useFileLibrary';
import dataTableSettings from './variables/dataTableSettings';
import { DEFAULT_GRANT } from './variables/defaultGrant';

const DEFAULT_SORT = { type: 'asc' };
const TYPE_RANK = {
  folder: 0,
  file: 1
};

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

const compareValues = (left, right, direction) => {
  const result = collator.compare(String(left || ''), String(right || ''));
  return direction === 'asc' ? result : -result;
};

const compareTypes = (left, right, direction) => {
  const leftRank = TYPE_RANK[left.type] ?? 99;
  const rightRank = TYPE_RANK[right.type] ?? 99;
  const result = leftRank - rightRank;
  return direction === 'asc' ? result : -result;
};

const getSortedItems = (items, sort) => {
  const [[columnId, direction] = []] = Object.entries(sort || {});

  return [...items].sort((left, right) => {
    if (columnId === 'type') {
      return compareTypes(left, right, direction) || compareValues(left.name, right.name, 'asc');
    }

    if (columnId === 'name') {
      return compareValues(left.name, right.name, direction) || compareTypes(left, right, 'asc');
    }

    return 0;
  });
};

const getFilteredItems = (items, search) => {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return items;
  }

  return items.filter((item) =>
    [item.name, item.type].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(normalizedSearch)
    )
  );
};

const FileLibrary = ({ t, title, location, history, dispatch, folderPath, units }) => {
  const { items, folderStack, currentParentId, loading, loadItems } = useFileLibrary({
    dispatch,
    folderPath,
    history
  });

  const [folderDialogOpen, setFolderDialogOpen] = React.useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = React.useState(false);
  const [folderName, setFolderName] = React.useState('');
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [grants, setGrants] = React.useState([DEFAULT_GRANT]);
  const [publicLink, setPublicLink] = React.useState('');
  const [publicLinkCopied, setPublicLinkCopied] = React.useState(false);
  const [rowsSelected, setRowsSelected] = React.useState([]);
  const [sort, setSort] = React.useState(DEFAULT_SORT);
  const [search, setSearch] = React.useState('');
  const [deleteIds, setDeleteIds] = React.useState([]);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [uploadState, setUploadState] = React.useState({
    open: false,
    currentFileName: '',
    completed: 0,
    total: 0
  });

  React.useEffect(() => {
    setRowsSelected([]);
  }, [folderPath]);

  const tableItems = React.useMemo(() => {
    const preparedItems = items.map((item) =>
      item.type === 'folder'
        ? item
        : {
            ...item,
            meta: {
              ...item.meta,
              isClickable: false
            }
          }
    );

    return getSortedItems(getFilteredItems(preparedItems, search), sort);
  }, [items, search, sort]);

  const createFolder = async () => {
    await fileLibraryActions.createFolder({
      dispatch,
      name: folderName,
      parentId: currentParentId
    });
    setFolderName('');
    setFolderDialogOpen(false);
    loadItems();
  };

  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) {
      return;
    }

    setUploadState({
      open: true,
      currentFileName: files[0].name,
      completed: 0,
      total: files.length
    });
    try {
      for (const [index, file] of files.entries()) {
        setUploadState({
          open: true,
          currentFileName: file.name,
          completed: index,
          total: files.length
        });
        await fileLibraryActions.uploadFile({ dispatch, file, parentId: currentParentId });
      }
      setUploadState({
        open: true,
        currentFileName: '',
        completed: files.length,
        total: files.length
      });
      loadItems();
    } finally {
      setUploadState((value) => ({ ...value, open: false }));
    }
  };

  const copyPublicLink = async (url) => {
    setPublicLinkCopied(false);
    if (!navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setPublicLinkCopied(true);
    } catch (error) {
      setPublicLinkCopied(false);
    }
  };

  const createPublicLink = async (item) => {
    const url = await fileLibraryActions.createPublicLink({ dispatch, id: item.id });
    setPublicLink(url);
    copyPublicLink(url);
    loadItems();
  };

  const openAccess = async (item) => {
    const data = await fileLibraryActions.getItem({ dispatch, id: item.id });
    setSelectedItem(data);
    setGrants(data.grants?.length ? data.grants : [DEFAULT_GRANT]);
    setAccessDialogOpen(true);
  };

  const saveAccess = async () => {
    await fileLibraryActions.saveAccess({ dispatch, itemId: selectedItem.id, grants });
    setAccessDialogOpen(false);
  };

  const updateGrant = (index, patch) => {
    setGrants((value) =>
      value.map((grant, currentIndex) => (currentIndex === index ? { ...grant, ...patch } : grant))
    );
  };

  const findUsers = React.useCallback((...args) => searchUsers(...args)(dispatch), [dispatch]);

  const closeDeletePrompt = () => {
    if (!deleteLoading) {
      setDeleteIds([]);
    }
  };

  const deleteItems = async () => {
    setDeleteLoading(true);
    try {
      for (const id of deleteIds) {
        await fileLibraryActions.removeItem({ dispatch, id });
      }
      setRowsSelected([]);
      setDeleteIds([]);
      loadItems();
    } finally {
      setDeleteLoading(false);
    }
  };

  const tableActions = {
    load: loadItems,
    onRowsSelect: setRowsSelected,
    onRowsSelectAll: setRowsSelected,
    onColumnSortChange: (columnId, direction) => setSort({ [columnId]: direction }),
    onSearchChange: setSearch,
    openFolderDialog: () => setFolderDialogOpen(true),
    uploadFiles,
    downloadItem: (item) => fileLibraryActions.downloadItem({ dispatch, item }),
    confirmDelete: (ids) => setDeleteIds([].concat(ids)),
    createPublicLink,
    openAccess
  };

  const openFolderRow = (item) => {
    if (item.type !== 'folder') {
      return;
    }

    history.push(getFolderPath([...folderStack.map(({ id }) => id), item.id]));
  };

  return (
    <LeftSidebarLayout location={location} title={t(title)} loading={loading}>
      <FileLibraryBreadcrumbs t={t} folderStack={folderStack} />
      <DataTable
        {...dataTableSettings({ t, dispatch, folderStack, actions: tableActions, sort })}
        data={tableItems}
        count={tableItems.length}
        page={1}
        rowsPerPage={tableItems.length || 10}
        loading={loading}
        search={search}
        updateOnChangeSearch={false}
        rowsSelected={rowsSelected}
        onRowClick={openFolderRow}
        CustomToolbar={FileLibraryToolbar}
        toolbarPosition="start"
        OnSelectActions={SelectedActions}
      />

      <FolderDialog
        t={t}
        open={folderDialogOpen}
        name={folderName}
        onNameChange={setFolderName}
        onClose={() => setFolderDialogOpen(false)}
        onCreate={createFolder}
      />
      <AccessDialog
        t={t}
        open={accessDialogOpen}
        grants={grants}
        units={units}
        onClose={() => setAccessDialogOpen(false)}
        onSave={saveAccess}
        onAddGrant={() => setGrants((value) => [...value, DEFAULT_GRANT])}
        onUpdateGrant={updateGrant}
        searchUsers={findUsers}
      />
      <PublicLinkDialog
        t={t}
        publicLink={publicLink}
        copied={publicLinkCopied}
        onClose={() => setPublicLink('')}
        onCopy={copyPublicLink}
      />
      <ConfirmDialog
        open={Boolean(deleteIds.length)}
        title={t('DeletePrompt')}
        description={t(
          deleteIds.length > 1 ? 'DeleteSelectedDescription' : 'DeleteItemDescription',
          {
            count: deleteIds.length
          }
        )}
        handleClose={closeDeletePrompt}
        handleConfirm={deleteItems}
        acceptButtonText={t('Delete')}
        loading={deleteLoading}
        disabled={deleteLoading}
        darkTheme={true}
      />
      <UploadProgressDialog t={t} {...uploadState} />
    </LeftSidebarLayout>
  );
};

const mapStateToProps = ({ auth: { units } }) => ({ units });

const ConnectedFileLibrary = connect(mapStateToProps)(asModulePage(FileLibrary));

export default translate('FileLibrary')(ConnectedFileLibrary);

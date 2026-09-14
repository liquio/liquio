import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import DataTableRaw from 'components/DataTable';
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
import { DEFAULT_GRANT, Grant } from './variables/defaultGrant';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

type Dispatch = (action: unknown) => unknown;
type FileItem = fileLibraryActions.FileItem;

const DEFAULT_SORT = { type: 'asc' };
const TYPE_RANK: Record<string, number> = {
  folder: 0,
  file: 1
};

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

const compareValues = (left: unknown, right: unknown, direction: string) => {
  const result = collator.compare(String(left || ''), String(right || ''));
  return direction === 'asc' ? result : -result;
};

const compareTypes = (left: FileItem, right: FileItem, direction: string) => {
  const leftRank = TYPE_RANK[left.type] ?? 99;
  const rightRank = TYPE_RANK[right.type] ?? 99;
  const result = leftRank - rightRank;
  return direction === 'asc' ? result : -result;
};

const getSortedItems = (items: FileItem[], sort: Record<string, string>) => {
  const [[columnId, direction] = []] = Object.entries(sort || {});

  return [...items].sort((left, right) => {
    if (columnId === 'type') {
      return compareTypes(left, right, direction as string) || compareValues(left.name, right.name, 'asc');
    }

    if (columnId === 'name') {
      return compareValues(left.name, right.name, direction as string) || compareTypes(left, right, 'asc');
    }

    return 0;
  });
};

const getFilteredItems = (items: FileItem[], search: string) => {
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

interface FileLibraryProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  title: string;
  location: unknown;
  history: { push: (path: string) => void; replace: (path: string) => void };
  dispatch: Dispatch;
  folderPath?: string;
  units?: { id: string | number; name?: string }[];
}

const FileLibrary = ({ t, title, location, history, dispatch, folderPath, units }: FileLibraryProps) => {
  const { items, folderStack, currentParentId, loading, loadItems } = useFileLibrary({
    dispatch,
    folderPath,
    history
  });

  const [folderDialogOpen, setFolderDialogOpen] = React.useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = React.useState(false);
  const [folderName, setFolderName] = React.useState('');
  const [selectedItem, setSelectedItem] = React.useState<FileItem | null>(null);
  const [grants, setGrants] = React.useState<Grant[]>([DEFAULT_GRANT]);
  const [publicLink, setPublicLink] = React.useState('');
  const [publicLinkCopied, setPublicLinkCopied] = React.useState(false);
  const [rowsSelected, setRowsSelected] = React.useState<unknown[]>([]);
  const [sort, setSort] = React.useState<Record<string, string>>(DEFAULT_SORT);
  const [search, setSearch] = React.useState('');
  const [deleteIds, setDeleteIds] = React.useState<string[]>([]);
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
              ...(item.meta as Record<string, unknown> | undefined),
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

  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const copyPublicLink = async (url: string) => {
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

  const createPublicLink = async (item: FileItem) => {
    const url = await fileLibraryActions.createPublicLink({ dispatch, id: item.id });
    setPublicLink(url);
    copyPublicLink(url);
    loadItems();
  };

  const openAccess = async (item: FileItem) => {
    const data = (await fileLibraryActions.getItem({ dispatch, id: item.id })) as FileItem;
    setSelectedItem(data);
    setGrants(data.grants?.length ? data.grants : [DEFAULT_GRANT]);
    setAccessDialogOpen(true);
  };

  const saveAccess = async () => {
    await fileLibraryActions.saveAccess({ dispatch, itemId: (selectedItem as FileItem).id, grants });
    setAccessDialogOpen(false);
  };

  const updateGrant = (index: number, patch: Partial<Grant>) => {
    setGrants((value) =>
      value.map((grant, currentIndex) => (currentIndex === index ? { ...grant, ...patch } : grant))
    );
  };

  const findUsers = React.useCallback(
    (...args: Parameters<typeof searchUsers>) => (searchUsers(...args) as unknown as (dispatch: Dispatch) => Promise<unknown>)(dispatch),
    [dispatch]
  );

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
    onColumnSortChange: (columnId: string, direction: string) => setSort({ [columnId]: direction }),
    onSearchChange: setSearch,
    openFolderDialog: () => setFolderDialogOpen(true),
    uploadFiles,
    downloadItem: (item: FileItem) => fileLibraryActions.downloadItem({ dispatch, item }),
    confirmDelete: (ids: string | string[]) => setDeleteIds(([] as string[]).concat(ids)),
    createPublicLink,
    openAccess
  };

  const openFolderRow = (item: FileItem) => {
    if (item.type !== 'folder') {
      return;
    }

    history.push(getFolderPath([...folderStack.map(({ id }) => id), item.id]));
  };

  return (
    <LeftSidebarLayout location={location} title={t(title)} loading={loading}>
      <FileLibraryBreadcrumbs t={t} folderStack={folderStack} />
      <DataTable
        {...dataTableSettings({ t, dispatch, actions: tableActions as never, sort })}
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
        searchUsers={findUsers as never}
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

const mapStateToProps = ({ auth: { units } }: { auth: { units?: { id: string | number; name?: string }[] } }) => ({
  units
});

const ConnectedFileLibrary = connect(mapStateToProps)(asModulePage(FileLibrary as never));

export default translate('FileLibrary')(ConnectedFileLibrary as never);

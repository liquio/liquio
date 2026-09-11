import React from 'react';
import cleenDeep from 'clean-deep';
import { translate } from 'react-translate';

import themeRaw from 'theme';
import DataTableRaw from 'components/DataTable';
import DataGridRaw from 'components/DataGridPremium';
import dataTableSettings from './dataTableSettings';
import fileTableSettings from './fileTableSettings';
import FileDataTableToolbarRaw from './components/Toolbar';
import controls from 'components/DataGridPremium/components/defaultProps';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataGrid = DataGridRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FileDataTableToolbar = FileDataTableToolbarRaw as unknown as React.ComponentType<Record<string, unknown>>;
// `theme` resolves per-app; see the CodeEditDialog batch notes in TYPESCRIPT.md.
const theme = themeRaw as unknown as { fileDataTableTypePremium?: boolean };

interface FileItem {
  id?: string;
  fileLink?: string;
  url?: string;
  path?: string;
  link?: string;
  name?: string;
  [key: string]: unknown;
}

interface Column {
  id?: string;
  name?: string;
  type?: string;
  minWidth?: number | string;
  width?: number | string;
  render?: (value: unknown, row: FileItem) => React.ReactNode;
}

interface FileDataTableProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  CustomToolbar?: React.ComponentType<Record<string, unknown>>;
  data?: FileItem[] | Record<string, unknown>;
  actions?: Record<string, unknown>;
  fileStorage?: Record<string, unknown>;
  fileControl?: boolean;
  handleDownload?: (() => void) | null;
  printAction?: boolean;
  darkTheme?: boolean;
  defaultView?: string;
  pagination?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  previewAttach?: boolean;
  hiddenMenu?: boolean;
  fieldBorder?: boolean;
  directDownload?: boolean;
  handleDeleteFile?: (file: FileItem) => void;
  admin?: boolean;
  showCreatedDate?: boolean;
  isArrayOfFiles?: boolean;
  isMobile?: boolean;
  withPrint?: boolean;
  [key: string]: unknown;
}

const FileDataTable = (props: FileDataTableProps) => {
  const {
    CustomToolbar,
    data,
    printAction,
    darkTheme,
    defaultView,
    pagination,
    loading,
    readOnly,
    previewAttach,
    hiddenMenu,
    fieldBorder
  } = props;
  const [rowsSelected, setRowsSelected] = React.useState<unknown[]>([]);

  const onRowsSelect = React.useCallback((rowsSelected: unknown[]) => {
    setRowsSelected(rowsSelected);
  }, []);

  const getSettings = React.useCallback(() => {
    const {
      fileControl,
      t,
      printAction,
      actions,
      fileStorage,
      directDownload,
      handleDownload,
      handleDeleteFile,
      darkTheme,
      admin,
      showCreatedDate,
      isArrayOfFiles,
      isMobile,
      withPrint
    } = props;

    if (fileControl) {
      return fileTableSettings({
        t,
        fileStorage,
        directDownload,
        handleDownload,
        handleDeleteFile,
        isArrayOfFiles,
        actions: {
          ...actions,
          onRowsSelect
        },
        isDataGrid: theme?.fileDataTableTypePremium
      });
    }

    return dataTableSettings({
      t,
      fileStorage,
      printAction,
      admin,
      showCreatedDate,
      actions: {
        ...actions,
        onRowsSelect
      },
      darkTheme,
      previewAttach,
      isDataGrid: theme?.fileDataTableTypePremium,
      hiddenMenu,
      isMobile,
      withPrint
    } as never);
  }, [props, onRowsSelect, previewAttach, hiddenMenu]);

  const settings = React.useMemo(() => getSettings(), [getSettings]) as {
    columns?: Column[];
    actions?: Record<string, unknown>;
    [key: string]: unknown;
  };

  const tableData = React.useMemo(() => {
    return Array.isArray(data)
      ? data.map((file) => {
          if (file instanceof File) {
            return file;
          }
          return {
            ...file,
            id: file?.id || file?.fileLink || file?.url
          };
        })
      : data;
  }, [data]);

  const renderToolbar = React.useCallback(() => {
    return (
      <>
        <FileDataTableToolbar
          {...props}
          {...settings}
          data={tableData}
          rowsSelected={rowsSelected}
        />
        {CustomToolbar ? (
          <CustomToolbar {...props} {...settings} data={tableData} rowsSelected={rowsSelected} />
        ) : null}
      </>
    );
  }, [CustomToolbar, props, rowsSelected, settings, tableData]);

  const getRowId = React.useCallback(
    (row: FileItem) => row?.id || row?.path || row?.link || row?.name,
    []
  );

  const mapColumns = React.useMemo(
    () =>
      (settings?.columns || []).map((column) => {
        return cleenDeep({
          field: column?.id,
          headerName: column?.name,
          type: column?.type,
          sortable: false,
          width: column?.minWidth || column?.width,
          headerAlign: 'left',
          align: 'left',
          renderCell: ({ row, row: { [column?.id as string]: value } }: { row: FileItem }) =>
            column.render ? column.render(value, row) : value
        });
      }),
    [settings.columns]
  );

  const fieldBorders = typeof fieldBorder === 'boolean' ? fieldBorder : !readOnly;

  if (theme?.fileDataTableTypePremium) {
    return (
      <DataGrid
        {...settings}
        {...props}
        controls={{
          search: false,
          refresh: false,
          ...controls
        }}
        loading={loading}
        pagination={pagination}
        rows={tableData}
        columns={mapColumns}
        CustomToolbar={renderToolbar}
        rowsSelected={rowsSelected}
        actions={settings.actions}
        printAction={printAction}
        getRowId={getRowId}
        height={'100%'}
        hiddenMenu={hiddenMenu}
        previewAttach={previewAttach}
      />
    );
  }

  return (
    <DataTable
      {...props}
      {...settings}
      view={defaultView}
      darkTheme={darkTheme}
      CustomToolbar={renderToolbar}
      rowsSelected={rowsSelected}
      getRowId={getRowId}
      fieldBorder={fieldBorders}
      data={tableData}
      actions={settings.actions}
      printAction={printAction}
    />
  );
};

FileDataTable.defaultProps = {
  actions: {},
  fileStorage: {},
  fileControl: false,
  handleDownload: null,
  printAction: false,
  darkTheme: false,
  defaultView: 'table',
  pagination: false,
  loading: false,
  hiddenMenu: false
};

export default translate('FileDataTable')(FileDataTable as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

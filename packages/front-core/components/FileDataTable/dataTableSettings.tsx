import React from 'react';
import { GridActionsCellItem } from '@mui/x-data-grid';
import moment from 'moment';

import TimeLabelRaw from 'components/Label/Time';
import SignatureDetailsRaw from 'components/FileDataTable/components/SignatureDetails';
import FileNameColumnRaw from './components/FileNameColumn';
import DataTableCardRaw from './components/DataTableCard';
import DownloadAllButtonRaw from './components/DownloadAllButton';
import DeleteFileRaw from './components/AttachesActions/DeleteFile';
import ShowPreviewRaw from './components/AttachesActions/ShowPreview';
import FileModalRaw from './components/AttachesActions/FileModal';

const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SignatureDetails = SignatureDetailsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FileNameColumn = FileNameColumnRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DownloadAllButton = DownloadAllButtonRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteFile = DeleteFileRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ShowPreview = ShowPreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FileModal = FileModalRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface FileItem {
  id?: string;
  name?: string;
  customName?: string;
  meta?: { description?: string };
  size?: number;
  fileSize?: number;
  updatedAt?: string;
  hasP7sSignature?: boolean;
  [key: string]: unknown;
}

interface DataTableSettingsParams {
  t: (key: string, params?: Record<string, unknown>) => string;
  printAction?: boolean;
  actions?: Record<string, unknown>;
  fileStorage?: Record<string, unknown>;
  darkTheme?: boolean;
  admin?: boolean;
  showCreatedDate?: boolean;
  isDataGrid?: boolean;
  previewAttach?: boolean;
  isMobile?: boolean;
  withPrint?: boolean;
}

export default ({
  t,
  printAction,
  actions,
  fileStorage,
  darkTheme,
  admin,
  showCreatedDate = false,
  isDataGrid,
  previewAttach = false,
  isMobile,
  withPrint
}: DataTableSettingsParams) => {
  const getColumnWidth = () => {
    if (isMobile) {
      return 'auto';
    } else {
      if (previewAttach) {
        return window.innerWidth > 1023 ? window.innerWidth - 660 : window.innerWidth - 286;
      }
      return 300;
    }
  };

  const columns: Record<string, unknown>[] = [];

  columns.push({
    id: 'fileName',
    name: t('FileName'),
    align: 'left',
    disableTooltip: true,
    width: isMobile ? 'auto' : '55%',
    minWidth: getColumnWidth(),
    render: (value: string, item: FileItem) => {
      const fileName = value || item.name || t('Unnamed');
      const customName = item.customName || null;
      const meta = (item.meta && item.meta.description) || null;

      return (
        <FileNameColumn
          name={fileName}
          item={item}
          customName={customName}
          meta={meta}
          cutLine={true}
          extension={fileName.split('.').pop()}
          isDataGrid={isDataGrid}
        />
      );
    }
  });

  if (!isMobile) {
    if (showCreatedDate) {
      columns.push({
        id: 'createdAt',
        name: t('FileDate'),
        width: 160,
        align: 'left',
        padding: 'none',
        render: (value: string, { updatedAt }: FileItem) => <TimeLabel date={value || updatedAt} />
      });
    } else {
      columns.push({
        id: 'size',
        name: t('fileSize'),
        align: 'left',
        width: 90,
        render: (_: unknown, row: FileItem) => {
          const { size, fileSize } = row;

          const value = size || fileSize;

          if (!value) {
            return '';
          }

          const bytesString = `(${value} ${t('bytes')})`;

          // moment.locale() holds the active app language, so the decimal
          // separator follows the user's locale (e.g. 31,19 KB in German)
          const formatSize = (size: number) =>
            size.toLocaleString(moment.locale(), {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });

          if (value && value < 1024 * 1024) {
            return `${formatSize(value / 1024)} KB ${admin ? bytesString : ''}`;
          }

          return `${formatSize(value / 1024 / 1024)} MB ${admin ? bytesString : ''}`;
        }
      });
    }
  }

  const actionsArray = (item: FileItem, dataGrid: boolean) => {
    if (isMobile) {
      return [
        <FileModal
          item={item}
          fileStorage={fileStorage}
          handleDownloadFile={(actions || {}).handleDownloadFile}
          darkTheme={darkTheme}
          GridActionsCellItem={dataGrid ? GridActionsCellItem : null}
          key={item.id}
        />
      ];
    }

    return [
      <DownloadAllButton
        printAction={printAction}
        asics={true}
        actions={actions}
        data={[item]}
        rowsSelected={[item.id]}
        isRow={true}
        p7sDownload={false}
        hasP7sSignature={item.hasP7sSignature}
        key={item.id}
        GridActionsCellItem={dataGrid ? GridActionsCellItem : null}
      />,
      <DownloadAllButton
        printAction={printAction}
        asics={true}
        actions={actions}
        data={[item]}
        rowsSelected={[item.id]}
        isRow={true}
        p7sDownload={true}
        hasP7sSignature={item.hasP7sSignature}
        hidden={!admin}
        key={item.id}
        GridActionsCellItem={dataGrid ? GridActionsCellItem : null}
      />,
      <ShowPreview
        item={item}
        fileStorage={fileStorage}
        handleDownloadFile={(actions || {}).handleDownloadFile}
        darkTheme={darkTheme}
        GridActionsCellItem={dataGrid ? GridActionsCellItem : null}
        key={item.id}
        withPrint={withPrint}
      />,
      <SignatureDetails
        item={item}
        GridActionsCellItem={dataGrid ? GridActionsCellItem : null}
        key={item.id}
      />,
      <DeleteFile
        item={item}
        handleDeleteFile={(actions as { handleDeleteFile?: unknown })?.handleDeleteFile}
        GridActionsCellItem={dataGrid ? GridActionsCellItem : null}
        key={item.id}
        hidden={item instanceof File}
      />
    ];
  };

  columns.push({
    id: t('download'),
    name: t('download'),
    type: 'actions',
    align: 'left',
    disableClick: true,
    padding: 'none',
    minWidth: previewAttach ? 100 : 140,
    getActions: ({ row: item }: { row: FileItem }) => actionsArray(item, true),
    render: (_: unknown, item: FileItem) => (
      <div style={{ display: 'flex', paddingRight: 16 }}>
        {actionsArray(item, false).map((action, index) => (
          <div key={index}>{action}</div>
        ))}
      </div>
    )
  });

  return {
    actions,
    components: {
      DataTableCard: DataTableCardRaw
    },
    controls: {
      pagination: false,
      toolbar: true,
      search: false,
      header: true,
      refresh: false,
      switchView: true,
      customizateColumns: false
    },
    checkable: !isMobile,
    cellStyle: {
      verticalAlign: 'middle'
    },
    columns
  };
};

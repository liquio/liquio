import React from 'react';
import { GridActionsCellItem } from '@mui/x-data-grid';

import TimeLabel from 'components/Label/Time';
import SignatureDetails from 'components/FileDataTable/components/SignatureDetails';
import FileNameColumn from './components/FileNameColumn';
import DataTableCard from './components/DataTableCard';
import DownloadAllButton from './components/DownloadAllButton';
import DeleteFile from './components/AttachesActions/DeleteFile';
import ShowPreview from './components/AttachesActions/ShowPreview';
import FileModal from './components/AttachesActions/FileModal';

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
}) => {
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

  const columns = [];

  columns.push({
    id: 'fileName',
    name: t('FileName'),
    align: 'left',
    disableTooltip: true,
    width: isMobile ? 'auto' : '55%',
    minWidth: getColumnWidth(),
    render: (value, item) => {
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
        render: (value, { updatedAt }) => <TimeLabel date={value || updatedAt} />
      });
    } else {
      columns.push({
        id: 'size',
        name: t('fileSize'),
        align: 'left',
        width: 90,
        render: (_, row) => {
          const { size, fileSize } = row;

          const value = size || fileSize;

          if (!value) {
            return '';
          }

          const bytesString = `(${value} ${t('bytes')})`;

          if (value && value < 1024 * 1024) {
            return `${(value / 1024).toFixed(2)} KB ${admin ? bytesString : ''}`;
          }

          return `${(value / 1024 / 1024).toFixed(2)} MB ${admin ? bytesString : ''}`;
        }
      });
    }
  }

  const actionsArray = (item, dataGrid) => {
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
        handleDeleteFile={actions?.handleDeleteFile}
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
    getActions: ({ row: item }) => actionsArray(item, true),
    render: (_, item) => (
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
      DataTableCard
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

import React from 'react';
import PropTypes from 'prop-types';
import cleenDeep from 'clean-deep';
import { translate } from 'react-translate';

import theme from 'theme';
import DataTable from 'components/DataTable';
import DataGrid from 'components/DataGridPremium';
import dataTableSettings from './dataTableSettings';
import fileTableSettings from './fileTableSettings';
import FileDataTableToolbar from './components/Toolbar';
import controls from 'components/DataGridPremium/components/defaultProps';

const FileDataTable = (props) => {
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
  const [rowsSelected, setRowsSelected] = React.useState([]);

  const onRowsSelect = React.useCallback((rowsSelected) => {
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
    });
  }, [props, onRowsSelect, previewAttach, hiddenMenu]);

  const settings = React.useMemo(() => getSettings(), [getSettings]);

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

  const getRowId = React.useCallback((row) => row?.id || row?.path || row?.link || row?.name, []);

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
          renderCell: column.getActions
            ? null
            : ({ row, row: { [column?.id]: value } }) => column.render(value, row),
          getActions: column.getActions
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

FileDataTable.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object,
  fileStorage: PropTypes.object,
  fileControl: PropTypes.bool,
  handleDownload: PropTypes.func,
  printAction: PropTypes.bool,
  darkTheme: PropTypes.bool,
  defaultView: PropTypes.string,
  pagination: PropTypes.bool,
  loading: PropTypes.bool,
  hiddenMenu: PropTypes.bool
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

export default translate('FileDataTable')(FileDataTable);

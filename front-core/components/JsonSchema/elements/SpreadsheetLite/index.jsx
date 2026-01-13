import React from 'react';
import { useTranslate } from 'react-translate';
import cleenDeep from 'clean-deep';
import MobileDetect from 'mobile-detect';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import FullScreenDialog from 'components/FullScreenDialog';
import useUndo from 'hooks/useUndo';
import { ChangeEvent } from 'components/JsonSchema';
import ConfirmDialog from 'components/ConfirmDialog';
import { arrayToData } from 'components/JsonSchema/elements/Spreadsheet/dataMapping';
import useColumns from 'components/JsonSchema/elements/SpreadsheetLite/helpers/useColumns';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import DataSheetGridHeaded from './DataSheetGridHeaded';
import ContextMenu from './components/ContextMenu';
import ActionsToolbar from './components/ActionsToolbar';
import ActionsToolbarMaterial from './components/ActionsToolbarMaterial';
import ErrorsBlock from './components/ErrorsBlock';
import CustomAddRowsComponent from './components/CustomAddRowsComponent';
import CustomAddRowsComponentMaterial from './components/CustomAddRowsComponentMaterial';
import MobileContextMenu from './components/ContextMenuMobile';
import theme from 'theme';

const normalizePath = (path = '') => {
  return path.replace(/\[/g, '.').replace(/\]/g, '');
};

const errorMap = (path) => (error) => {
  const rowPath = normalizePath(error.path).split('.').slice(path.length);

  return {
    ...error,
    path: normalizePath(error.path),
    relativePath: rowPath,
    rowId: parseInt(rowPath[0], 10),
  };
};

const errorFilter = (path) => (error) => {
  const errorPath = normalizePath(error.path).split('.');
  const rootPath = errorPath.slice(0, path.length);

  if (rootPath.length !== path.length) {
    return false;
  }

  return !rootPath.filter((row, index) => row !== path[index]).length;
};

const { defaultLayout } = theme;

export const SpreadsheetLite = (props) => {
  const {
    path,
    value,
    hidden,
    readOnly,
    schema: { description, items, headers, allowAddRows = true } = {},
    height = 400,
    onChange,
    task,
    actions,
    errors,
    maxItems = null,
    hideColumnChooser = true,
    name,
    sample,
    width,
    noMargin,
    maxWidth = 'unset',
    isImportBtn,
    isClearDataBtn,
  } = props;

  const t = useTranslate('Elements');
  const [key, setKeyId] = React.useState(crypto.randomUUID());
  const [open, setOpen] = React.useState(false);
  const [activeCell, setActiveCell] = React.useState(null);
  const [activeCellRef, setActiveCellRef] = React.useState(null);
  const [importTrigger, setImportTrigger] = React.useState(false);

  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const columns = useColumns(
    items?.properties,
    items?.required,
    path,
    readOnly,
    task?.document || {},
  );

  const { undo, redo, hasNext, hasPrevious } = useUndo(value, (newValue) => {
    onChange(newValue);
  });

  const [fullScreen, setFullScreen] = React.useState(false);
  const [selectedColumns, setSelectedColumns] = React.useState(() =>
    columns.map(({ id }) => id),
  );

  const maxItemsReached = React.useMemo(() => {
    if (!maxItems) return false;

    return value?.length > maxItems;
  }, [maxItems, value]);

  const handleChange = React.useCallback(
    (changes, event) => {
      if (
        (readOnly || maxItemsReached) &&
        event.find((e) => e?.type !== 'DELETE')
      ) {
        setOpen(maxItemsReached);
        return;
      }

      if (changes?.length > maxItems && maxItems) {
        changes = changes.slice(0, maxItems - changes.length);
        onChange(changes.map((item) => cleenDeep(item)));
        setKeyId(crypto.randomUUID());
        return;
      }

      onChange(changes.map((item) => cleenDeep(item)));
    },
    [onChange, readOnly, maxItemsReached, maxItems],
  );

  const clearData = React.useCallback(async () => {
    await onChange(new ChangeEvent([{}], true));
    setKeyId(crypto.randomUUID());
    setImportTrigger(true);
  }, [onChange]);

  const onImportCallback = React.useCallback(
    () => {
      if (!importTrigger) return;
      actions.loadTaskAction();
      setImportTrigger(false);
    },
  [actions, importTrigger]);

  const onImport = React.useCallback(
    (arrayData) => {
      if (maxItems && arrayData.length > maxItems) {
        arrayData = arrayData.slice(0, maxItems);
        setOpen(maxItemsReached);
      }
      
      setImportTrigger(false);

      const mappedData = arrayToData(arrayData, items).map((row) => {
        const newRow = { ...row };

        columns.forEach((col) => {
          if (col.type !== 'string' && !newRow[col.propertyName]) {
            newRow[col.propertyName] = undefined;
          }
        });

        return newRow;
      });

      onChange(new ChangeEvent(mappedData, true, true));

      setKeyId(crypto.randomUUID());
    },
    [onChange, maxItems, items, maxItemsReached, columns],
  );

  const filteredColumns = React.useMemo(
    () =>
      columns
        .filter(({ id }) => selectedColumns.includes(id))
        .filter((col) => !col.hidden),
    [columns, selectedColumns],
  );

  const errorMapped = React.useMemo(() => {
    if (!errors) {
      return [];
    }

    const normalizeError = errors.filter(errorFilter(path)).map(errorMap(path));

    return Object.values(
      normalizeError.reduce((acc, error) => {
        if (!acc[error.dataPath]) {
          acc[error.dataPath] = error;
        }
        return acc;
      }, {}),
    );
  }, [path, errors]);

  const contextMenuComponent = React.useCallback(
    (event) =>
      isMobile ? null : ContextMenu({ t, value, handleChange, event }),
    [isMobile, t, handleChange, value],
  );

  const onActiveCellChange = React.useCallback(
    ({ cell }) => {
      if (!cell || !isMobile) return;
      const isSelect = (
        filteredColumns.find(({ id }) => id === cell.colId) || {}
      )?.options;
      if (isSelect) return;
      const activeElement = document.activeElement;
      const activeRef = activeCellRef[`${cell.col}${cell.row}`]?.current || {};
      const hasFocusedCell = activeElement.hasAttribute(
        'data-focus-visible-added',
      );
      if (hasFocusedCell && activeElement.id !== activeRef.id)
        activeElement.blur();
      setActiveCell(cell);
    },
    [isMobile, filteredColumns, activeCellRef],
  );

  const setActiveCellRefAction = React.useCallback((ref) => {
    setActiveCellRef((prev) => ({ ...prev, ...ref }));
  }, []);

  const toolbarProps = React.useMemo(
    () => ({
      clearData,
      actions,
      onImport,
      readOnly,
      setFullScreen,
      columns,
      selectedColumns,
      setSelectedColumns,
      undo,
      hasPrevious,
      redo,
      hasNext,
      value,
      errors: errorMapped,
      hideColumnChooser,
      isImportBtn,
      isClearDataBtn,
    }),
    [
      clearData,
      actions,
      onImport,
      readOnly,
      setFullScreen,
      columns,
      selectedColumns,
      setSelectedColumns,
      undo,
      hasPrevious,
      redo,
      hasNext,
      value,
      errorMapped,
      hideColumnChooser,
      isClearDataBtn,
      isImportBtn,
    ],
  );

  const tableProps = React.useMemo(
    () => ({
      onActiveCellChange,
      headers,
      lockRows: !allowAddRows || readOnly,
      autoAddRow: allowAddRows && !readOnly && !maxItemsReached,
      value: value || [{}],
      columns: filteredColumns,
      height,
      onChange: handleChange,
      addRowsComponent:
        !allowAddRows || readOnly || maxItemsReached || maxItems === 1
          ? null
          : (props) => {
              if (defaultLayout)
                return CustomAddRowsComponent({
                  ...props,
                  rows: value,
                  errors: errorMapped,
                });
              return CustomAddRowsComponentMaterial({
                ...props,
                rows: value,
                errors: errorMapped,
              });
            },
      contextMenuComponent,
      errors: errorMapped,
      isMobile,
      activeCell,
      setActiveCellRef: setActiveCellRefAction,
      onImportCallback
    }),
    [
      headers,
      value,
      filteredColumns,
      contextMenuComponent,
      maxItems,
      height,
      handleChange,
      allowAddRows,
      readOnly,
      maxItemsReached,
      errorMapped,
      activeCell,
      isMobile,
      onActiveCellChange,
      setActiveCellRefAction,
      onImportCallback
    ],
  );

  if (hidden) return null;

  return (
    <ElementContainer
      sample={sample}
      bottomSample={true}
      width={width}
      maxWidth={maxWidth}
      noMargin={noMargin}
    >
      {defaultLayout ? (
        <ActionsToolbar {...toolbarProps} />
      ) : (
        <ActionsToolbarMaterial {...toolbarProps} />
      )}

      <ErrorsBlock errors={errorMapped} items={items} name={name} />

      <DataSheetGridHeaded key={key} {...tableProps} props={props} />

      <FullScreenDialog
        open={fullScreen}
        title={description}
        disableEscapeKeyDown={false}
        onClose={() => setFullScreen(false)}
      >
        <AutoSizer disableWidth={true}>
          {({ height: containerHeight }) => (
            <DataSheetGridHeaded
              key={key}
              {...tableProps}
              props={props}
              height={containerHeight - headers?.length * 40}
            />
          )}
        </AutoSizer>
      </FullScreenDialog>

      {defaultLayout && isMobile && (
        <MobileContextMenu
          activeCell={activeCell}
          setActiveCell={setActiveCell}
          handleChange={handleChange}
          value={value || [{}]}
          activeCellRef={activeCellRef}
        />
      )}

      <ConfirmDialog
        open={open}
        title={t('MaxItemsReached')}
        description={t('MaxItemsReachedDescription', { maxItems })}
        handleClose={() => setOpen(false)}
      />
    </ElementContainer>
  );
};

export default SpreadsheetLite;

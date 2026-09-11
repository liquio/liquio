import { generateUUID } from 'utils/uuid';
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

interface SchemaError {
  path: string;
  dataPath?: string;
  [key: string]: unknown;
}

const normalizePath = (path = '') => {
  return path.replace(/\[/g, '.').replace(/\]/g, '');
};

const errorMap = (path: Array<string | number>) => (error: SchemaError) => {
  const rowPath = normalizePath(error.path).split('.').slice(path.length);

  return {
    ...error,
    path: normalizePath(error.path),
    relativePath: rowPath,
    rowId: parseInt(rowPath[0], 10),
  };
};

const errorFilter = (path: Array<string | number>) => (error: SchemaError) => {
  const errorPath = normalizePath(error.path).split('.');
  const rootPath = errorPath.slice(0, path.length);

  if (rootPath.length !== path.length) {
    return false;
  }

  return !rootPath.filter((row, index) => row !== path[index]).length;
};

const { defaultLayout } = theme as unknown as { defaultLayout?: boolean };

interface SpreadsheetLiteSchema {
  description?: string;
  items?: { properties?: Record<string, Record<string, unknown>>; required?: string[] };
  headers?: unknown[];
  allowAddRows?: boolean;
}

interface SpreadsheetLiteProps {
  path: Array<string | number>;
  value?: Array<Record<string, unknown>>;
  hidden?: boolean;
  readOnly?: boolean;
  schema?: SpreadsheetLiteSchema;
  height?: number;
  onChange: (value: unknown) => void;
  task?: { document?: unknown };
  actions: { loadTaskAction: () => void; [key: string]: unknown };
  errors?: SchemaError[];
  maxItems?: number | null;
  hideColumnChooser?: boolean;
  name: string;
  sample?: string;
  width?: number | string;
  noMargin?: boolean;
  maxWidth?: number | string;
  isImportBtn?: boolean;
  isClearDataBtn?: boolean;
}

export const SpreadsheetLite = (props: SpreadsheetLiteProps) => {
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
  const [key, setKeyId] = React.useState(generateUUID());
  const [open, setOpen] = React.useState(false);
  const [activeCell, setActiveCell] = React.useState<{ col: number; row: number; colId?: string } | null>(null);
  const [activeCellRef, setActiveCellRef] = React.useState<Record<string, React.RefObject<HTMLElement>> | null>(null);
  const [importTrigger, setImportTrigger] = React.useState(false);

  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const columns = useColumns(
    items?.properties || {},
    items?.required,
    path,
    readOnly,
    task?.document || {},
  ) as Array<Record<string, unknown> & { id: string | number; hidden?: boolean; propertyName: string; type?: string }>;

  const { undo, redo, hasNext, hasPrevious } = useUndo(value, (newValue: unknown) => {
    onChange(newValue);
  });

  const [fullScreen, setFullScreen] = React.useState(false);
  const [selectedColumns, setSelectedColumns] = React.useState<Array<string | number>>(() =>
    columns.map(({ id }: { id: string | number }) => id),
  );

  const maxItemsReached = React.useMemo(() => {
    if (!maxItems) return false;

    return (value?.length || 0) > maxItems;
  }, [maxItems, value]);

  const handleChange = React.useCallback(
    (changes: Array<Record<string, unknown>>, event: Array<{ type?: string }>) => {
      if (
        (readOnly || maxItemsReached) &&
        event.find((e) => e?.type !== 'DELETE')
      ) {
        setOpen(maxItemsReached);
        return;
      }

      if (changes?.length > (maxItems as number) && maxItems) {
        changes = changes.slice(0, maxItems - changes.length);
        onChange(changes.map((item) => cleenDeep(item)));
        setKeyId(generateUUID());
        return;
      }

      onChange(changes.map((item) => cleenDeep(item)));
    },
    [onChange, readOnly, maxItemsReached, maxItems],
  );

  const clearData = React.useCallback(async () => {
    await onChange(new ChangeEvent([{}], true));
    setKeyId(generateUUID());
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
    (arrayData: unknown[][]) => {
      if (maxItems && arrayData.length > maxItems) {
        arrayData = arrayData.slice(0, maxItems);
        setOpen(maxItemsReached);
      }

      setImportTrigger(false);

      const mappedData = (arrayToData(arrayData, items as never) as Array<Record<string, unknown>>).map((row) => {
        const newRow = { ...row };

        columns.forEach((col: { type?: string; propertyName: string }) => {
          if (col.type !== 'string' && !newRow[col.propertyName]) {
            newRow[col.propertyName] = undefined;
          }
        });

        return newRow;
      });

      onChange(new ChangeEvent(mappedData, true, true));

      setKeyId(generateUUID());
    },
    [onChange, maxItems, items, maxItemsReached, columns],
  );

  const filteredColumns = React.useMemo(
    () =>
      columns
        .filter(({ id }: { id: string | number }) => selectedColumns.includes(id))
        .filter((col: { hidden?: boolean }) => !col.hidden),
    [columns, selectedColumns],
  );

  const errorMapped = React.useMemo(() => {
    if (!errors) {
      return [];
    }

    const normalizeError = errors.filter(errorFilter(path)).map(errorMap(path));

    return Object.values(
      normalizeError.reduce((acc: Record<string, unknown>, error) => {
        if (!acc[error.dataPath as string]) {
          acc[error.dataPath as string] = error;
        }
        return acc;
      }, {}),
    );
  }, [path, errors]);

  const contextMenuComponent = React.useCallback(
    (event: unknown) =>
      isMobile ? null : ContextMenu({ t, value: value || [], handleChange: handleChange as never, event: event as never }),
    [isMobile, t, handleChange, value],
  );

  const onActiveCellChange = React.useCallback(
    ({ cell }: { cell: { col: number; row: number; colId?: string } | null }) => {
      if (!cell || !isMobile) return;
      const isSelect = (
        filteredColumns.find(({ id }: { id: string | number }) => id === cell.colId) || {}
      ) as { options?: unknown };
      if (isSelect.options) return;
      const activeElement = document.activeElement as HTMLElement;
      const activeRef = (activeCellRef?.[`${cell.col}${cell.row}`]?.current || {}) as HTMLElement;
      const hasFocusedCell = activeElement.hasAttribute(
        'data-focus-visible-added',
      );
      if (hasFocusedCell && activeElement.id !== activeRef.id)
        activeElement.blur();
      setActiveCell(cell);
    },
    [isMobile, filteredColumns, activeCellRef],
  );

  const setActiveCellRefAction = React.useCallback((ref: Record<string, React.RefObject<HTMLElement>>) => {
    setActiveCellRef((prev) => ({ ...prev, ...ref }));
  }, []);

  const toolbarProps = React.useMemo(
    () => ({
      clearData,
      actions: actions as unknown as { clearErrors?: () => void },
      onImport: onImport as unknown as (rows: unknown[]) => void,
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
      errors: errorMapped as SchemaError[],
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
          : (props: { addRows: (count?: number) => void }) => {
              if (defaultLayout)
                return CustomAddRowsComponent({
                  ...props,
                  addRows: props.addRows as (count: number) => void,
                  rows: value,
                  errors: errorMapped,
                });
              return CustomAddRowsComponentMaterial({
                ...props,
                rows: value,
                errors: errorMapped,
              } as never);
            },
      contextMenuComponent,
      errors: errorMapped as SchemaError[],
      isMobile,
      activeCell,
      setActiveCellRef: setActiveCellRefAction as unknown as (ref: Record<string, unknown>) => void,
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

      <ErrorsBlock errors={errorMapped as never} items={items as never} name={name} />

      <DataSheetGridHeaded key={key} {...tableProps} props={props as never} />

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
              props={props as never}
              height={containerHeight - (headers?.length || 0) * 40}
            />
          )}
        </AutoSizer>
      </FullScreenDialog>

      {defaultLayout && isMobile && (
        <MobileContextMenu
          activeCell={activeCell}
          setActiveCell={setActiveCell}
          handleChange={handleChange as never}
          value={value || [{}]}
          activeCellRef={activeCellRef as never}
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

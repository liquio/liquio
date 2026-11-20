import React, { useState, useRef } from 'react';
import classNames from 'classnames';
import objectPath from 'object-path';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import { TableCell, TableRow, Checkbox, Popover } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import RenderOneLineRaw from 'helpers/renderOneLine';

const RenderOneLine = RenderOneLineRaw as unknown as React.ComponentType<Record<string, unknown>>;

type AppTheme = Theme & {
  dataTableHoverBg?: string;
  dataTableHoverColor?: string;
  dataTableHighlights?: string;
  header?: { borderBottom?: string };
  buttonBg?: string;
  tableCell?: Record<string, unknown>;
  disabledRow?: Record<string, unknown>;
};

const styles = (theme: AppTheme) => ({
  selected: {
    backgroundColor: `${theme.dataTableHoverBg}!important`
  },
  hover: {
    '&:hover': {
      '& td': {
        color: `${theme.dataTableHoverColor}!important`
      }
    }
  },
  clickable: {
    cursor: 'pointer'
  },
  tableCell: {
    minWidth: 50,
    [theme.breakpoints.down('md')]: {
      padding: 15,
      fontSize: 13,
      lineHeight: '18px'
    },
    ...(theme.tableCell || {})
  },
  hightlight: {
    backgroundColor: theme.dataTableHighlights || '#FFFCE5'
  },
  fullscreenCell: {
    '& > div': {
      position: 'static' as const
    },
    '& > div > button': {
      position: 'static' as const
    }
  },
  checkBoxRoot: {
    padding: 0,
    position: 'relative' as const,
    left: 0,
    top: 7,
    backgroundColor: 'transparent!important'
  },
  cellDark: {
    borderBottom: theme?.header?.borderBottom,
    padding: '14px 12px'
  },
  checkBoxRootDarkChecked: {
    '& svg': {
      fill: theme.buttonBg
    }
  },
  alignError: {
    verticalAlign: 'top' as const
  },
  error: {
    '& td': {
      color: '#f44336'
    }
  },
  warning: {
    '& *': {
      color: '#ffeb3b'
    }
  },
  disabledRow: {
    ...(theme.disabledRow || {})
  }
});

interface RowError {
  path?: string;
  [key: string]: unknown;
}

interface CellProps {
  id?: string;
  render?: (value: unknown, item: Record<string, unknown>, columnKey: number, rowIndex: number, id?: string) => React.ReactNode;
  item: Record<string, unknown>;
  rowIndex: number;
  handleClick?: (item: Record<string, unknown>) => (event: React.MouseEvent) => void;
  disableClick?: boolean;
  classes: Record<string, string>;
  columnKey: number;
  cellStyle?: React.CSSProperties;
  onClick?: (props: unknown) => void;
  editPopupMode?: boolean;
  disableEditPopup?: boolean;
  cellColor?: (item: Record<string, unknown>, id?: string) => string;
  fullscreen?: boolean;
  darkTheme?: boolean;
  disableTooltip?: boolean;
  maxTextRows?: number;
  minWidthCustom?: number;
  errors?: RowError[];
  path?: string[];
  sortableListeners?: Record<string, unknown>;
  sortableAttributes?: Record<string, unknown>;
  isDragHandle?: boolean;
  [key: string]: unknown;
}

const Cell = ({
  id,
  render,
  item,
  rowIndex,
  handleClick,
  disableClick,
  classes,
  columnKey,
  cellStyle = {},
  onClick,
  editPopupMode,
  disableEditPopup,
  cellColor,
  fullscreen,
  darkTheme,
  disableTooltip,
  maxTextRows,
  minWidthCustom,
  errors,
  path,
  sortableListeners,
  sortableAttributes,
  isDragHandle,
  ...rest
}: CellProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLTableCellElement>(null);

  const onClickAction = (props: unknown) => {
    onClick && onClick(props);
    setOpen(true);
  };

  const anchorEl = containerRef && containerRef.current;

  const tableCellStyle: React.CSSProperties = { ...(cellStyle || {}) };

  if (cellColor) {
    tableCellStyle.backgroundColor = cellColor(item, id);
  }

  const dataValue = id ? objectPath.get(item, id) : null;
  const cellValue =
    typeof render === 'function' ? render(dataValue, item, columnKey, rowIndex, id) : dataValue;

  let pathCell = path || [];

  const pathCellString = pathCell.concat(String(rowIndex), id as string).join('.');

  const errorCell = errors?.find((error) => error.path === pathCellString);

  const firstItemProps = {
    component: 'th' as const,
    scope: 'row' as const
  };

  return (
    <>
      <TableCell
        style={tableCellStyle}
        className={classNames({
          [classes.tableCell]: true,
          [classes.fullscreenCell]: !!fullscreen,
          [classes.cellDark]: !!darkTheme,
          [classes.alignError]: !!errors?.length && !errorCell
        })}
        {...(rest as Record<string, unknown>)}
        key={columnKey}
        ref={containerRef}
        {...(columnKey === 0 ? firstItemProps : {})}
        onClick={disableClick ? undefined : handleClick ? handleClick(item).bind(null) : onClickAction}
      >
        <div
          {...(isDragHandle ? sortableListeners : {})}
          {...(isDragHandle ? sortableAttributes : {})}
          style={isDragHandle ? { cursor: 'grab' } : undefined}
          onClick={isDragHandle ? (event) => event.stopPropagation() : undefined}
        >
          <RenderOneLine
            id={id}
            title={cellValue}
            disableTooltip={disableTooltip}
            maxTextRows={maxTextRows}
            minWidthCustom={minWidthCustom}
          />
        </div>
      </TableCell>
      {editPopupMode && !disableEditPopup ? (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={() => setOpen(false)}
          PaperProps={{
            style: {
              padding: 5,
              boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)'
            }
          }}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
        >
          {render ? render(item[id as string], item, columnKey, rowIndex, open as never) : (item[id as string] as React.ReactNode)}
        </Popover>
      ) : null}
    </>
  );
};

interface DataTableRowProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  rowIndex: number;
  item: Record<string, unknown>;
  selected?: boolean;
  hightlight?: boolean;
  checkable?: boolean;
  columns?: CellProps[];
  hiddenColumns?: string[];
  onClick?: (item: Record<string, unknown>, key: number) => void;
  onSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  cellStyle?: React.CSSProperties;
  editPopupMode?: boolean;
  disableEditPopup?: boolean;
  cellColor?: (item: Record<string, unknown>, id?: string) => string;
  fullscreen?: boolean;
  hover?: boolean;
  darkTheme?: boolean;
  maxTextRows?: number;
  errors?: RowError[];
  warningRows?: number[];
  errorRows?: number[];
  disabled?: boolean;
  sortableId?: string | number;
  sortableEnabled?: boolean;
  dragHandleColumnId?: string;
}

const DataTableRow = ({
  t,
  classes,
  rowIndex,
  item,
  selected = false,
  hightlight = false,
  checkable = false,
  columns = [],
  hiddenColumns,
  onClick,
  onSelect,
  cellStyle,
  editPopupMode = false,
  disableEditPopup = false,
  cellColor,
  fullscreen,
  hover = true,
  darkTheme,
  maxTextRows,
  errors,
  warningRows = [],
  errorRows,
  disabled,
  sortableId,
  sortableEnabled = false,
  dragHandleColumnId
}: DataTableRowProps) => {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useSortable({
    id: sortableId || (item?.id as string) || (item?.value as string) || rowIndex,
    disabled: !sortableEnabled
  });

  const style = sortableEnabled
    ? {
        transform: CSS.Transform.toString(transform),
        transition: 'none',
        opacity: isDragging ? 0.75 : 1
      }
    : undefined;

  return (
    <TableRow
      ref={sortableEnabled ? (setNodeRef as never) : undefined}
      style={style}
      hover={hover}
      selected={selected}
      classes={{
        hover: classNames({
          [classes.hover]: true
        }),
        selected: classes.selected
      }}
      className={classNames({
        [classes.clickable]: !!onClick,
        [classes.hightlight]: hightlight,
        [classes.rowDark]: !!darkTheme,
        [classes.warning]: !!warningRows?.includes(rowIndex),
        [classes.error]: !!errorRows?.includes(rowIndex),
        [classes.disabledRow]: !!disabled
      })}
    >
      {checkable ? (
        <TableCell
          style={{
            ...cellStyle,
            textAlign: 'left'
          }}
          align="center"
          padding="checkbox"
          className={classNames({
            [classes.cellDark]: !!darkTheme
          })}
        >
          <Checkbox
            checkedIcon={<CheckBoxOutlinedIcon />}
            checked={selected}
            disabled={disabled}
            onChange={onSelect}
            disableRipple={true}
            classes={{
              root: classNames({
                [classes.checkBoxRootDark]: !!darkTheme
              }),
              checked: classNames({
                [classes.checkBoxRootDarkChecked]: !!darkTheme
              })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onSelect?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
              }
            }}
            inputProps={{
              'aria-label': t('CheckboxButton')
            }}
          />
        </TableCell>
      ) : null}
      {columns
        .filter((column) => !(hiddenColumns || []).includes(column.id as string))
        .map(({ id, render, handleClick, disableClick, path, ...rest }, columnKey) => (
          <Cell
            key={columnKey}
            cellColor={cellColor}
            id={id}
            item={item}
            rowIndex={rowIndex}
            render={render}
            onClick={onClick as never}
            errors={errors}
            path={path}
            cellStyle={cellStyle}
            handleClick={handleClick}
            disableClick={disableClick}
            columnKey={columnKey}
            classes={classes}
            editPopupMode={editPopupMode}
            disableEditPopup={disableEditPopup}
            fullscreen={fullscreen}
            darkTheme={darkTheme}
            maxTextRows={maxTextRows}
            sortableListeners={listeners as unknown as Record<string, unknown>}
            sortableAttributes={attributes as unknown as Record<string, unknown>}
            isDragHandle={sortableEnabled && id === dragHandleColumnId}
            {...(rest as Record<string, unknown>)}
          />
        ))}
    </TableRow>
  );
};

export default withStyles(styles)(DataTableRow as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

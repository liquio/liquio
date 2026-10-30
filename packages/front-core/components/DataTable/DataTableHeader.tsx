import React from 'react';
import classNames from 'classnames';
import { TableHead, TableRow, TableCell, TableSortLabel } from '@mui/material';

interface Column {
  id: string;
  name?: string;
  sortable?: boolean;
  [key: string]: unknown;
}

interface DataTableHeaderProps {
  columns?: Column[];
  hiddenColumns?: string[];
  checkable?: boolean;
  sort?: Record<string, 'asc' | 'desc' | undefined>;
  createSortHandler?: (columnId: string) => () => void;
  stickyHeader?: boolean;
  classes: Record<string, string>;
  headerCellStyle?: React.CSSProperties;
  darkTheme?: boolean;
}

const DataTableHeader = ({
  columns = [],
  hiddenColumns = [],
  checkable = false,
  sort = {},
  createSortHandler = () => () => undefined,
  stickyHeader = false,
  classes,
  headerCellStyle,
  darkTheme
}: DataTableHeaderProps) => (
  <TableHead
    className={classNames({
      [classes.stickyHeader]: stickyHeader
    })}
  >
    <TableRow>
      {checkable ? (
        <TableCell
          padding="checkbox"
          width={64}
          style={headerCellStyle}
          component="th"
          aria-hidden="true"
          role="presentation"
          className={classNames({
            [classes.cellDark]: !!darkTheme
          })}
        />
      ) : null}
      {(columns || [])
        .filter((column) => !hiddenColumns.includes(column.id))
        .map(({ sortable, ...column }, columnKey) => {
          const direction = sort[column.id];

          return (
            <TableCell
              key={columnKey}
              style={headerCellStyle}
              className={classNames({
                [classes.TableCell]: true,
                [classes.cellDark]: !!darkTheme
              })}
              {...(column as Record<string, unknown>)}
              component={column?.name ? 'th' : 'td'}
            >
              {sortable ? (
                <TableSortLabel
                  active={!!direction}
                  direction={direction}
                  onClick={createSortHandler(column.id)}
                >
                  {column.name}
                </TableSortLabel>
              ) : (
                column.name
              )}
            </TableCell>
          );
        })}
    </TableRow>
  </TableHead>
);

export default DataTableHeader;

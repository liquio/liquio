import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { TableHead, TableRow, TableCell, TableSortLabel } from '@mui/material';

const DataTableHeader = ({
  columns,
  hiddenColumns,
  checkable,
  sort,
  createSortHandler,
  stickyHeader,
  classes,
  headerCellStyle,
  darkTheme
}) => (
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
            [classes.cellDark]: darkTheme
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
                [classes.cellDark]: darkTheme
              })}
              {...column}
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

DataTableHeader.propTypes = {
  columns: PropTypes.array,
  hiddenColumns: PropTypes.array,
  checkable: PropTypes.bool,
  sort: PropTypes.object,
  createSortHandler: PropTypes.func,
  classes: PropTypes.object,
  stickyHeader: PropTypes.bool
};

DataTableHeader.defaultProps = {
  columns: [],
  hiddenColumns: [],
  checkable: false,
  sort: {},
  createSortHandler: () => null,
  classes: {},
  stickyHeader: false
};

export default DataTableHeader;

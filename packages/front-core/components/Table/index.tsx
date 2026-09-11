import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TableFooter,
  Icon,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import cx from 'classnames';
// import styles from 'variables/styles/tableStyle';

import Checkbox from '@mui/material/Checkbox';

type Row = Record<string, unknown>;
type Field = Record<string, unknown> & { key: string; classNames: string[]; grid?: number[]; sort?: unknown; title?: string };

const getTotal = (list: (Row[] & { meta?: { pagination?: { total?: number } } }) | Row[]) =>
  (list as { meta?: { pagination?: { total?: number } } }).meta?.pagination?.total ?? list.length;

const getClasses = (classes: Record<string, string>, item: Field, ownerList = true) => {
  const { classNames, grid } = item;
  const cn = classNames.map((className) => classes[className]);
  if (grid) {
    cn.push(classes[`columnStart${!ownerList ? grid[0] - 1 : grid[0]}`]);
    cn.push(classes[`columnEnd${grid[1]}`]);
    cn.push(classes[`rowStart${grid[2]}`]);
    cn.push(classes[`rowEnd${grid[3]}`]);
  }
  return cx(cn);
};

interface CustomTableProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  list: Row[];
  dataSource?: Record<string, unknown> & { count?: number; sort?: Record<string, unknown>; page?: number };
  createSortHandler?: (key: string) => (event: unknown) => void;
  checked: string | string[];
  onCheckItem: (idOrData: unknown, data: Row) => (event: unknown) => void;
  onCheckboxClick?: (id: unknown) => (event: unknown) => void;
  setId: (name: string) => string;
  pagination?: (event: unknown, page: number) => void;
  changeCount?: (event: unknown) => void;
  fields: {
    tableFields: Field[];
    checkbox?: Field;
    pagination?: boolean;
    selectAllCheckbox?: Field;
  };
  getText: (data: Row, key: string) => React.ReactNode;
  labelDisplayedRows?: string;
  labelRowsPerPage?: string;
  onSelectAllClick?: (event: unknown) => void;
  highlightClaim?: boolean;
  needFullData?: boolean;
  isOwner?: (item: Row) => boolean;
  ownerList?: boolean;
  favorites?: Array<{ id: unknown }>;
  dontHaveDelPerLabel?: string;
  delLabel?: string;
}

const CustomTable = ({
  t,
  classes,
  list,
  dataSource = {},
  createSortHandler,
  checked = '',
  onCheckItem,
  onCheckboxClick,
  setId,

  pagination,
  changeCount,
  fields,
  getText,
  labelDisplayedRows = 'COUNT_CASES',
  labelRowsPerPage = 'DISPLAYED_CASES',
  onSelectAllClick,
  highlightClaim = false,
  needFullData = false,
  isOwner,
  ownerList = true,
  favorites = [],
  dontHaveDelPerLabel = '',
  delLabel = 'Вибрати',
}: CustomTableProps) => {
  const {
    tableFields,
    checkbox,
    pagination: needPagination,
    selectAllCheckbox,
  } = fields;
  const total = getTotal(list);
  if (total === 0) return null;
  const isHavePermission = (item: Row) => {
    if ('haveDeletePermission' in item) {
      return item.haveDeletePermission;
    }
    let havePermission = true;
    if ('haveEditPermission' in item) {
      havePermission = item.haveEditPermission as boolean;
    }
    if ('state' in item && havePermission) {
      return item.state === 1 || item.state === -1;
    }
    if (isOwner && havePermission) {
      havePermission = isOwner(item);
    }
    return havePermission;
  };
  const listWithPermissions: Row[] = checkbox
    ? list.map((item) => ({ ...item, havePermissions: isHavePermission(item) }))
    : list;
  const havePermissionsList = listWithPermissions.filter(
    ({ havePermissions }) => havePermissions,
  );
  const needAllCheckbox = checkbox && selectAllCheckbox && ownerList;
  const showPagination = (dataSource?.count as number) < total && total > 0;
  const itIsFavorite = (item: Row) =>
    'id' in item ? !!favorites?.find(({ id }) => id === item.id) : false;
  return (
    <Table
      className={cx(classes.table, classes.mobileBlock)}
      id={setId('table')}
    >
      <TableHead
        id={setId('table-head')}
        className={
          needAllCheckbox ? classes.mobileBlock : classes.onlyBigScreen
        }
      >
        <TableRow id={setId('table-head-row')} className={classes.mobileGrid}>
          {checkbox && ownerList && (
            <TableCell
              padding="checkbox"
              id={setId('table-head-checkbox')}
              className={getClasses(classes, (selectAllCheckbox || checkbox) as Field)}
            >
              {needAllCheckbox && (
                <Checkbox
                  className={classes.checkbox}
                  indeterminate={
                    checked.length > 0 &&
                    checked.length < havePermissionsList.length
                  }
                  checked={checked.length > 0}
                  onChange={onSelectAllClick}
                  disabled={!havePermissionsList.length}
                  color="default"
                  id={setId('cell-checkbox')}
                />
              )}
            </TableCell>
          )}
          {tableFields.map((item) => (
            <TableCell
              id={setId(`table-header-cell-${item.key}`)}
              key={`table-header-cell-${item.key}`}
              className={cx(getClasses(classes, item), classes.onlyBigScreen)}
              title={t(item.title as string)}
            >
              {!!item.sort && (
                <TableSortLabel
                  id={setId(`table-header-cell-sort-${item.key}`)}
                  active={item.key in (dataSource?.sort || {})}
                  direction={(dataSource?.sort as Record<string, 'asc' | 'desc'>)?.[item.key]}
                  onClick={createSortHandler?.(item.key)}
                >
                  {item.title ? t(item.title) : ''}
                </TableSortLabel>
              )}
              {!item.sort && item.title ? t(item.title) : ''}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody id={setId('table-body')} className={classes.mobileBlock}>
        {listWithPermissions &&
          listWithPermissions.map((data, index) => (
            <TableRow
              key={`row-${index}${data.id || JSON.stringify(data)}`}
              hover={true}
              id={setId(`row-${index}`)}
              className={cx(
                classes.row,
                classes.mobileGrid,
                highlightClaim === data.id && classes.highlight,
                'viewed' in data && !data.viewed && classes.notViewed,
              )}
            >
              {checkbox && ownerList && (
                <TableCell
                  padding="checkbox"
                  id={setId('table-checkbox')}
                  className={getClasses(classes, checkbox)}
                  title={!data.havePermissions ? dontHaveDelPerLabel : delLabel}
                >
                  <Checkbox
                    checked={(checked as string[]).includes(data.id as string)}
                    color="default"
                    className={classes.checkbox}
                    onClick={onCheckboxClick?.(data.id)}
                    id={setId('checkbox')}
                    disabled={!data.havePermissions}
                  />
                  {!!favorites?.length && (
                    <Icon
                      className={cx(
                        classes.icon,
                        (checked as string[]).includes(data.id as string) && classes.checkbox,
                        !itIsFavorite(data) && classes.hidden,
                      )}
                    >
                      star
                    </Icon>
                  )}
                  {!!data.resharing && (
                    <Icon
                      className={cx(
                        classes.icon,
                        (checked as string[]).includes(data.id as string) && classes.checkbox,
                      )}
                    >
                      supervisor_account
                    </Icon>
                  )}
                </TableCell>
              )}
              {tableFields.map((item) => (
                <TableCell
                  onClick={onCheckItem(
                    needFullData ? data : data.id || data.attachId,
                    data,
                  )}
                  id={setId(`table-cell-${item.key}`)}
                  key={`table-cell-${item.key}`}
                  className={getClasses(classes, item, ownerList)}
                  title={
                    item.key === 'status' ||
                    item.key === 'state' ||
                    item.key === 'icon'
                      ? ''
                      : (getText(data, item.key) as string)
                  }
                  {...({ numeric: !!data.numeric } as unknown as Record<string, unknown>)}
                >
                  {!item.classNames.includes('onlyMobile') &&
                    !item.classNames.includes('onlyBigScreen') &&
                    item.title && (
                      <span
                        className={cx(
                          classes.onlyMobileText,
                          classes.onlyMobile,
                        )}
                      >
                        {`${t(item.title)}: `}
                      </span>
                    )}
                  {getText(data, item.key)}
                </TableCell>
              ))}
            </TableRow>
          ))}
      </TableBody>
      {needPagination && (
        <TableFooter id={setId('table-footer')}>
          <TableRow id={setId('table-footer-row')}>
            {showPagination && (
              <TablePagination
                component="div"
                id={setId('pagination')}
                className={classes.pagination}
                count={total}
                onPageChange={pagination as never}
                rowsPerPage={dataSource?.count as number}
                labelRowsPerPage={t(labelRowsPerPage as string)}
                labelDisplayedRows={({ from, to }: { from: number; to: number }) =>
                  t(labelDisplayedRows as string, { from, to, total })
                }
                rowsPerPageOptions={[10, 20, 50]}
                onRowsPerPageChange={changeCount}
                page={dataSource?.page as number}
                SelectProps={{ className: classes.pagSelect }}
                backIconButtonProps={{ className: classes.pagButton }}
                nextIconButtonProps={{ className: classes.pagButton }}
              />
            )}
            {!showPagination && (
              <TableCell
                className={cx(classes.pagination, classes.totalCount)}
                id={setId('totalCount')}
              >
                {t('TOTAL', { total: total || 0 })}
              </TableCell>
            )}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};

export default withStyles({})(CustomTable as never) as unknown as React.ComponentType<Record<string, unknown>>;

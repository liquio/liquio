import React from 'react';
import PropTypes from 'prop-types';

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

const getTotal = (list) =>
  list && list.meta && list.meta.pagination && list.meta.pagination.total
    ? list.meta.pagination.total
    : list.length;

const getClasses = (classes, item, ownerList = true) => {
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

const CustomTable = ({
  t,
  classes,
  list,
  dataSource,
  createSortHandler,
  checked,
  onCheckItem,
  onCheckboxClick,
  setId,

  pagination,
  changeCount,
  fields,
  getText,
  labelDisplayedRows,
  labelRowsPerPage,
  onSelectAllClick,
  highlightClaim,
  needFullData,
  isOwner,
  ownerList,
  favorites,
  dontHaveDelPerLabel,
  delLabel,
}) => {
  const {
    tableFields,
    checkbox,
    pagination: needPagination,
    selectAllCheckbox,
  } = fields;
  const total = getTotal(list);
  if (total === 0) return null;
  const isHavePermission = (item) => {
    if ('haveDeletePermission' in item) {
      return item.haveDeletePermission;
    }
    let havePermission = true;
    if ('haveEditPermission' in item) {
      havePermission = item.haveEditPermission;
    }
    if ('state' in item && havePermission) {
      return item.state === 1 || item.state === -1;
    }
    if (isOwner && havePermission) {
      havePermission = isOwner(item);
    }
    return havePermission;
  };
  const listWithPermissions = checkbox
    ? list.map((item) => ({ ...item, havePermissions: isHavePermission(item) }))
    : list;
  const havePermissionsList = listWithPermissions.filter(
    ({ havePermissions }) => havePermissions,
  );
  const needAllCheckbox = checkbox && selectAllCheckbox && ownerList;
  const showPagination = dataSource.count < total && total > 0;
  const itIsFavorite = (item) =>
    'id' in item ? !!favorites.find(({ id }) => id === item.id) : false;
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
              className={getClasses(classes, selectAllCheckbox || checkbox)}
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
              title={t(item.title)}
            >
              {item.sort && (
                <TableSortLabel
                  id={setId(`table-header-cell-sort-${item.key}`)}
                  active={item.key in dataSource.sort}
                  direction={dataSource.sort[item.key]}
                  onClick={createSortHandler(item.key)}
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
                    checked={checked.includes(data.id)}
                    color="default"
                    className={classes.checkbox}
                    onClick={onCheckboxClick(data.id)}
                    id={setId('checkbox')}
                    disabled={!data.havePermissions}
                  />
                  {!!favorites.length && (
                    <Icon
                      className={cx(
                        classes.icon,
                        checked.includes(data.id) && classes.checkbox,
                        !itIsFavorite(data) && classes.hidden,
                      )}
                    >
                      star
                    </Icon>
                  )}
                  {data.resharing && (
                    <Icon
                      className={cx(
                        classes.icon,
                        checked.includes(data.id) && classes.checkbox,
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
                      : getText(data, item.key)
                  }
                  numeric={!!data.numeric}
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
                onPageChange={pagination}
                rowsPerPage={dataSource.count}
                labelRowsPerPage={t(labelRowsPerPage)}
                labelDisplayedRows={({ from, to }) =>
                  t(labelDisplayedRows, { from, to, total })
                }
                rowsPerPageOptions={[10, 20, 50]}
                onRowsPerPageChange={changeCount}
                page={dataSource.page}
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

CustomTable.propTypes = {
  fields: PropTypes.object.isRequired,
  checked: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  getText: PropTypes.func.isRequired,
  setId: PropTypes.func.isRequired,
  dataSource: PropTypes.object,
  onCheckItem: PropTypes.func.isRequired,

  createSortHandler: PropTypes.func,
  onCheckboxClick: PropTypes.func,
  pagination: PropTypes.func,
  changeCount: PropTypes.func,

  list: PropTypes.array.isRequired,
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,

  labelDisplayedRows: PropTypes.string,
  labelRowsPerPage: PropTypes.string,
  onSelectAllClick: PropTypes.func,
  highlightClaim: PropTypes.bool,
  needFullData: PropTypes.bool,
  isOwner: PropTypes.func,
  ownerList: PropTypes.bool,
  favorites: PropTypes.array,
  dontHaveDelPerLabel: PropTypes.string,
  delLabel: PropTypes.string,
};

CustomTable.defaultProps = {
  dataSource: {},
  checked: '',
  labelDisplayedRows: 'COUNT_CASES',
  labelRowsPerPage: 'DISPLAYED_CASES',
  onSelectAllClick: undefined,
  highlightClaim: false,
  needFullData: false,
  isOwner: undefined,
  pagination: undefined,
  changeCount: undefined,
  ownerList: true,
  createSortHandler: undefined,
  onCheckboxClick: undefined,
  favorites: [],
  dontHaveDelPerLabel: '',
  delLabel: 'Вибрати',
};

export default withStyles({})(CustomTable);

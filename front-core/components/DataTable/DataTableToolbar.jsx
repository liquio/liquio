import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Toolbar, Tooltip, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import LoopIcon from '@mui/icons-material/Loop';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIconOutlined from '@mui/icons-material/ViewModuleOutlined';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

import DataTablePagination from 'components/DataTable/DataTablePagination';
import SelectAllButton from './components/SelectAllButton';
import SearchInput from './components/SearchInput';
import CustomizateColumns from './components/CustomizateColumns';

const styles = (theme) => ({
  toolbar: {
    padding: '12px 0',
    alignItems: 'center',
    [theme.breakpoints.down('md')]: {
      paddingTop: 5,
      paddingLeft: 5,
      paddingBottom: 0,
      flexWrap: 'wrap'
    },
    '& > *': {
      marginRight: 6
    },
    '&:last-child': {
      paddingRight: 0,
      marginRight: 0
    },
    ...(theme.tableToolbar || {})
  },
  paginationToolbar: {
    alignItems: 'center',
    [theme.breakpoints.up('md')]: {
      paddingLeft: 8
    }
  },
  grow: {
    flexGrow: 1,
    maxWidth: '100%',
    flexBasis: 0
  },
  container: {
    paddingBottom: 18,
    marginLeft: 8,
    marginRight: 8,
    borderBottom: theme?.header?.borderBottom || '1px solid rgba(224, 224, 224, 1)',
    [theme.breakpoints.up('md')]: {
      display: 'flex'
    },
    ...(theme.tableToolbarContainer || {})
  },
  flexContainer: {
    display: 'flex'
  },
  row: {
    borderBottom: 'none',
    padding: '8px 0',
    display: 'flex',
    alignItems: 'center'
  },
  bottomToolbar: {
    borderTop: '1px solid rgba(224, 224, 224, 1)',
    borderBottom: 'none',
    paddingBottom: 15,
    ...(theme.bottomToolbar || {})
  },
  refreshIcon: {
    transform: 'rotate(90deg)'
  }
});

const DataTableToolbar = (props) => {
  const {
    t,
    classes,
    className,
    view,
    page,
    count,
    rowsPerPage,
    checkable,
    actions,
    data,
    search,
    filters,
    filterHandlers,
    CustomToolbar,
    CustomToolbarHelper,
    toolbarPosition,
    rowsSelected,
    columns,
    hiddenColumns,
    controls: { selectAllButton = true, ...controls },
    switchView,
    groupBy,
    grouping,
    fullscreen,
    toggleGrouping,
    fullscreenMode,
    toggleFullscreen,
    bottomToolbar,
    darkTheme,
    searchPlaceholder,
    loading,
    updateOnChangeSearch = true,
    OnSelectActions = false,
    multiple
  } = props;

  const selectableData = (data || []).filter(actions.isRowSelectable || Boolean);
  const selectedLength = selectableData.length;

  return (
    <>
      <div
        className={classNames(
          classes.container,
          {
            [classes.flexContainer]: !controls.pagination,
            [classes.bottomToolbar]: bottomToolbar
          },
          className
        )}
      >
        <Toolbar className={classNames(classes.toolbar, classes.grow)}>
          {checkable && selectAllButton && multiple ? (
            <SelectAllButton
              rowsSelected={rowsSelected}
              selectableData={selectableData}
              onRowsSelect={actions.onRowsSelectAll || actions.onRowsSelect}
              darkTheme={darkTheme}
            />
          ) : null}

          {OnSelectActions ? <OnSelectActions selectedLength={selectedLength} {...props} /> : null}

          {CustomToolbar && toolbarPosition === 'start' ? (
            <CustomToolbar selectedLength={selectedLength} {...props} />
          ) : null}
          {controls.search ? (
            <SearchInput
              actions={actions}
              search={search}
              filters={filters}
              filterHandlers={filterHandlers}
              darkTheme={darkTheme}
              searchPlaceholder={searchPlaceholder}
              updateOnChangeSearch={updateOnChangeSearch}
            />
          ) : null}
          {controls.refresh ? (
            <Tooltip title={t('Reload')}>
              <IconButton onClick={(actions || {}).load} size="large">
                <LoopIcon className={classes.refreshIcon} />
              </IconButton>
            </Tooltip>
          ) : null}
          {CustomToolbar && toolbarPosition !== 'start' ? (
            <CustomToolbar selectedLength={selectedLength} {...props} />
          ) : null}
        </Toolbar>

        {controls.pagination ? (
          <DataTablePagination
            t={t}
            loading={loading}
            rowsPerPage={rowsPerPage}
            page={page - 1}
            count={count}
            onChangePage={actions?.onChangePage}
            onChangeRowsPerPage={actions?.onChangeRowsPerPage}
            withPerPage={false}
            darkTheme={darkTheme}
          />
        ) : null}
        <Toolbar className={classes.toolbar}>
          {controls.switchView ? (
            <Tooltip title={t('SwitchView')}>
              <IconButton onClick={switchView} id="switch-view" size="large">
                {view === 'table' ? <ViewModuleIconOutlined /> : <ViewListIcon />}
              </IconButton>
            </Tooltip>
          ) : null}
          {groupBy ? (
            <Tooltip title={t('ToggleGrouping')}>
              <IconButton onClick={toggleGrouping} id="toggle-grouping" size="large">
                {grouping ? <ViewHeadlineIcon /> : <ViewAgendaIcon />}
              </IconButton>
            </Tooltip>
          ) : null}
          {controls.customizateColumns ? (
            <CustomizateColumns
              darkTheme={darkTheme}
              columns={columns}
              hiddenColumns={hiddenColumns}
              toggleColumnVisible={actions.toggleColumnVisible}
            />
          ) : null}
          {(fullscreenMode || controls.fullscreenMode) && !fullscreen ? (
            <Tooltip title={t('ToggleFullscreen')}>
              <IconButton onClick={toggleFullscreen} id="toggle-fullscreen" size="large">
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          ) : null}
        </Toolbar>
      </div>

      {CustomToolbarHelper ? <CustomToolbarHelper {...props} /> : null}
    </>
  );
};

DataTableToolbar.propTypes = {
  t: PropTypes.func,
  classes: PropTypes.object,
  page: PropTypes.number,
  count: PropTypes.number,
  rowsPerPage: PropTypes.number,
  actions: PropTypes.object,
  data: PropTypes.array,
  rowsSelected: PropTypes.array,
  CustomToolbar: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  filterHandlers: PropTypes.object,
  toolbarPosition: PropTypes.string,
  bottomToolbar: PropTypes.bool,
  darkTheme: PropTypes.bool,
  OnSelectActions: PropTypes.node
};

DataTableToolbar.defaultProps = {
  t: null,
  classes: null,
  page: 0,
  count: 0,
  rowsPerPage: 10,
  actions: {},
  data: [],
  rowsSelected: [],
  CustomToolbar: null,
  toolbarPosition: 'middle',
  filterHandlers: {},
  bottomToolbar: false,
  darkTheme: false,
  OnSelectActions: null
};

export default withStyles(styles)(DataTableToolbar);

import React from 'react';
import classNames from 'classnames';
import { Toolbar, Tooltip, IconButton } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import LoopIcon from '@mui/icons-material/Loop';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIconOutlined from '@mui/icons-material/ViewModuleOutlined';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

import DataTablePaginationRaw from 'components/DataTable/DataTablePagination';
import SelectAllButtonRaw from './components/SelectAllButton';
import SearchInputRaw from './components/SearchInput';
import CustomizateColumnsRaw from './components/CustomizateColumns';

const DataTablePagination = DataTablePaginationRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SelectAllButton = SelectAllButtonRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SearchInput = SearchInputRaw as unknown as React.ComponentType<Record<string, unknown>>;
const CustomizateColumns = CustomizateColumnsRaw as unknown as React.ComponentType<Record<string, unknown>>;

type AppTheme = Theme & {
  header?: { borderBottom?: string };
  tableToolbar?: Record<string, unknown>;
  tableToolbarContainer?: Record<string, unknown>;
  bottomToolbar?: Record<string, unknown>;
};

const styles = (theme: AppTheme) => ({
  toolbar: {
    padding: '12px 0',
    alignItems: 'center',
    [theme.breakpoints.down('md')]: {
      paddingTop: 5,
      paddingLeft: 5,
      paddingBottom: 0,
      flexWrap: 'wrap' as const
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

interface DataTableToolbarProps {
  t?: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  className?: string;
  view?: string;
  page?: number;
  count?: number;
  rowsPerPage?: number;
  checkable?: boolean;
  actions?: Record<string, unknown> & {
    isRowSelectable?: (row: unknown) => boolean;
    onRowsSelectAll?: (selection: unknown[]) => void;
    onRowsSelect?: (selection: unknown[]) => void;
    load?: () => void;
    onChangePage?: (page: number) => void;
    onChangeRowsPerPage?: (value: number) => void;
    toggleColumnVisible?: (id: string) => void;
  };
  data?: unknown[];
  search?: string;
  filters?: Record<string, unknown>;
  filterHandlers?: Record<string, unknown>;
  CustomToolbar?: React.ComponentType<Record<string, unknown>> | null;
  CustomToolbarHelper?: React.ComponentType<Record<string, unknown>>;
  toolbarPosition?: string;
  rowsSelected?: unknown[];
  columns?: unknown[];
  hiddenColumns?: string[];
  controls?: {
    selectAllButton?: boolean;
    pagination?: boolean;
    search?: boolean;
    refresh?: boolean;
    switchView?: boolean;
    customizateColumns?: boolean;
    fullscreenMode?: boolean;
    [key: string]: unknown;
  };
  switchView?: () => void;
  groupBy?: string;
  grouping?: boolean;
  fullscreen?: boolean;
  toggleGrouping?: () => void;
  fullscreenMode?: boolean;
  toggleFullscreen?: () => void;
  bottomToolbar?: boolean;
  darkTheme?: boolean;
  searchPlaceholder?: string;
  loading?: boolean;
  updateOnChangeSearch?: boolean;
  OnSelectActions?: React.ComponentType<Record<string, unknown>> | false;
  multiple?: boolean;
}

const DataTableToolbar = (props: DataTableToolbarProps) => {
  const {
    t,
    classes,
    className,
    view,
    page = 0,
    count = 0,
    rowsPerPage = 10,
    checkable,
    actions = {},
    data = [],
    search,
    filters,
    filterHandlers = {},
    CustomToolbar = null,
    CustomToolbarHelper,
    toolbarPosition = 'middle',
    rowsSelected = [],
    columns,
    hiddenColumns,
    controls: { selectAllButton = true, ...controls } = {},
    switchView,
    groupBy,
    grouping,
    fullscreen,
    toggleGrouping,
    fullscreenMode,
    toggleFullscreen,
    bottomToolbar = false,
    darkTheme = false,
    searchPlaceholder,
    loading,
    updateOnChangeSearch = true,
    OnSelectActions = null,
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

          {OnSelectActions ? <OnSelectActions selectedLength={selectedLength} {...(props as unknown as Record<string, unknown>)} /> : null}

          {CustomToolbar && toolbarPosition === 'start' ? (
            <CustomToolbar selectedLength={selectedLength} {...(props as unknown as Record<string, unknown>)} />
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
            <Tooltip title={t?.('Reload')}>
              <IconButton onClick={(actions || {}).load} size="large">
                <LoopIcon className={classes.refreshIcon} />
              </IconButton>
            </Tooltip>
          ) : null}
          {CustomToolbar && toolbarPosition !== 'start' ? (
            <CustomToolbar selectedLength={selectedLength} {...(props as unknown as Record<string, unknown>)} />
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
            <Tooltip title={t?.('SwitchView')}>
              <IconButton onClick={switchView} id="switch-view" size="large">
                {view === 'table' ? <ViewModuleIconOutlined /> : <ViewListIcon />}
              </IconButton>
            </Tooltip>
          ) : null}
          {groupBy ? (
            <Tooltip title={t?.('ToggleGrouping')}>
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
            <Tooltip title={t?.('ToggleFullscreen')}>
              <IconButton onClick={toggleFullscreen} id="toggle-fullscreen" size="large">
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          ) : null}
        </Toolbar>
      </div>

      {CustomToolbarHelper ? <CustomToolbarHelper {...(props as unknown as Record<string, unknown>)} /> : null}
    </>
  );
};

export default withStyles(styles)(DataTableToolbar as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

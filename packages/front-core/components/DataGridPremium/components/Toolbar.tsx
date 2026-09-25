import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
} from '@mui/material';
import MobileDetect from 'mobile-detect';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import CheckIcon from '@mui/icons-material/Check';
import { history } from 'store';
import { ReactComponent as RefreshIcon } from './assets/refresh.svg';
import { ReactComponent as ColumnsIcon } from './assets/columns.svg';
import { ReactComponent as RowsIcon } from './assets/rows.svg';
import { ReactComponent as ExportIcon } from './assets/export.svg';
import type { Actions, Column } from '../index';

interface SelectedFilter {
  name: string;
  label?: string;
  value?: unknown;
}

interface ToolbarProps {
  data?: unknown[];
  classes: Record<string, string>;
  t: (key: string, params?: Record<string, unknown>) => string;
  search?: string;
  handleSearch: (event: { target: { value: string } }) => void;
  actions?: Actions;
  controls?: Record<string, unknown>;
  CustomToolbar?: React.ComponentType<Record<string, unknown>> | null;
  CustomBottomToolbar?: React.ComponentType<Record<string, unknown>> | null;
  filters?: Record<string, unknown> | unknown[];
  rowsSelected?: unknown[];
  filterHandlers?: Record<string, unknown> | null;
  selectedFilters?: SelectedFilter[];
  updateSelectedFilters?: (filters: unknown[], filter: unknown) => void;
  columns?: Column[];
  columnVisibilityModel?: Record<string, boolean>;
  onColumnVisibilityChange?: (field: string, isVisible: boolean) => void;
  density?: string;
  onDensityChange?: (value: string) => void;
  onExport?: () => void;
}

const Toolbar = ({
  data,
  classes,
  t,
  search,
  handleSearch,
  actions,
  controls,
  CustomToolbar,
  CustomBottomToolbar,
  filters,
  rowsSelected = [],
  filterHandlers,
  selectedFilters = [],
  updateSelectedFilters = () => {},
  columns = [],
  columnVisibilityModel,
  onColumnVisibilityChange,
  density = 'standard',
  onDensityChange = () => {},
  onExport = () => {},
}: ToolbarProps) => {
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    return !!md.mobile();
  });

  const [columnsAnchorEl, setColumnsAnchorEl] = React.useState<HTMLElement | null>(null);
  const [densityAnchorEl, setDensityAnchorEl] = React.useState<HTMLElement | null>(null);

  const handleColumnsOpen = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    setColumnsAnchorEl(event.currentTarget);
  }, []);

  const handleColumnsClose = React.useCallback(() => {
    setColumnsAnchorEl(null);
  }, []);

  const handleDensityOpen = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    setDensityAnchorEl(event.currentTarget);
  }, []);

  const handleDensityClose = React.useCallback(() => {
    setDensityAnchorEl(null);
  }, []);

  const handleColumnToggle = React.useCallback(
    (field: string) => {
      const visible = columnVisibilityModel?.[field] !== false;
      onColumnVisibilityChange && onColumnVisibilityChange(field, !visible);
    },
    [columnVisibilityModel, onColumnVisibilityChange],
  );

  const handleDensitySelect = React.useCallback(
    (value: string) => {
      onDensityChange && onDensityChange(value);
      handleDensityClose();
    },
    [onDensityChange, handleDensityClose],
  );

  const handleClearSearch = React.useCallback(() => {
    handleSearch({ target: { value: '' } });
  }, [handleSearch]);

  const {
    toolbar = true,
    refresh = true,
    customizeColumns = true,
    search: searchControl = true,
    export: exportControl = true,
  } = React.useMemo(() => (controls || {}) as Record<string, boolean>, [controls]);

  const CustomToolbarMemo = React.useCallback(() => {
    if (!CustomToolbar) return null;
    return (
      <CustomToolbar
        filters={filters}
        actions={actions}
        rowsSelected={rowsSelected}
        data={data}
        filterHandlers={filterHandlers}
        location={history?.location?.pathname}
      />
    );
  }, [filters, actions, rowsSelected, data, filterHandlers, CustomToolbar]);

  const CustomBottomToolbarMemo = React.useCallback(() => {
    if (!CustomBottomToolbar) return null;
    return (
      <CustomBottomToolbar
        filters={filters}
        actions={actions}
        rowsSelected={rowsSelected}
        data={data}
        filterHandlers={filterHandlers}
        location={history?.location?.pathname}
      />
    );
  }, [
    filters,
    actions,
    rowsSelected,
    data,
    filterHandlers,
    CustomBottomToolbar,
  ]);

  const handleFilterDelete = React.useCallback(
    (filter: SelectedFilter) => {
      const newFilters = (selectedFilters || []).filter(
        (item) => item.name !== filter.name,
      );
      updateSelectedFilters && updateSelectedFilters(newFilters, filter);
    },
    [selectedFilters, updateSelectedFilters],
  );

  const clearAllFilters = React.useCallback(() => {
    updateSelectedFilters && updateSelectedFilters([], 'all');
  }, [updateSelectedFilters]);

  const densities = React.useMemo(
    () => [
      { value: 'compact', label: t('DensityCompact') },
      { value: 'standard', label: t('DensityStandard') },
      { value: 'comfortable', label: t('DensityComfortable') },
    ],
    [t],
  );

  if (!toolbar) return null;

  return (
    <Box className={classes.toolbarRoot}>
      <div className={classes.toolbarFilters}>
        <div className={classes.toolbarActions}>
          <div className={classes.toolbarSettings}>
            {refresh ? (
              <Button
                onClick={actions?.load}
                startIcon={<RefreshIcon />}
                className={classes.buttonSm}
              >
                {t('Refresh')}
              </Button>
            ) : null}
            {customizeColumns ? (
              <>
                <Button
                  onClick={handleColumnsOpen}
                  startIcon={<ColumnsIcon />}
                  className={classes.buttonSm}
                >
                  {t('columns')}
                </Button>
                <Menu
                  anchorEl={columnsAnchorEl}
                  open={Boolean(columnsAnchorEl)}
                  onClose={handleColumnsClose}
                >
                  {(columns || []).map((column) => {
                    const field = column.field;
                    const visible = columnVisibilityModel?.[field] !== false;
                    return (
                      <MenuItem
                        key={field}
                        onClick={() => handleColumnToggle(field)}
                      >
                        <Checkbox checked={visible} edge="start" />
                        <ListItemText
                          primary={column.headerName || column.field}
                        />
                      </MenuItem>
                    );
                  })}
                </Menu>
                <Button
                  onClick={handleDensityOpen}
                  startIcon={<RowsIcon />}
                  className={classes.buttonSm}
                >
                  {t('density')}
                </Button>
                <Menu
                  anchorEl={densityAnchorEl}
                  open={Boolean(densityAnchorEl)}
                  onClose={handleDensityClose}
                >
                  {densities.map(({ value, label }) => (
                    <MenuItem
                      key={value}
                      selected={density === value}
                      onClick={() => handleDensitySelect(value)}
                    >
                      <ListItemIcon>
                        {density === value ? <CheckIcon fontSize="small" /> : null}
                      </ListItemIcon>
                      <ListItemText primary={label} />
                    </MenuItem>
                  ))}
                </Menu>
              </>
            ) : null}
            {exportControl ? (
              <Button
                onClick={onExport}
                startIcon={<ExportIcon />}
                className={classes.buttonSm}
              >
                {t('Export')}
              </Button>
            ) : null}
          </div>
          {CustomToolbar ? <CustomToolbarMemo /> : null}
        </div>
        {searchControl ? (
          <TextField
            autoFocus={!!search?.length}
            className={classes.toolbarQuickFilter}
            variant="outlined"
            placeholder={t('Search')}
            aria-label={t('Search')}
            value={search}
            onChange={handleSearch}
            InputProps={{
              endAdornment: search?.length ? (
                <IconButton onClick={handleClearSearch} size="small">
                  <ClearOutlinedIcon />
                </IconButton>
              ) : null,
            }}
          />
        ) : null}
      </div>
      {!isMobile && selectedFilters?.length ? (
        <div className={classes.selectedFilters}>
          <div className={classes.selectedFiltersClear}>
            <p className={classes.selectedFiltersLabel}>
              {t('FiltersNumber', { number: selectedFilters.length })}
            </p>
            <Button
              className={classes.clearAll}
              onClick={clearAllFilters}
              variant="outlined"
              size="small"
            >
              {t('ClearAll')}
            </Button>
          </div>
          {selectedFilters.map((filter) => (
            <div key={filter.name} className={classes.selectedFiltersItem}>
              <div>
                {filter.label ? (
                  <span className={classes.filterLabel}>{filter.label}:</span>
                ) : null}
                {filter.value as React.ReactNode}
              </div>
              <IconButton
                className={classes.closeBtn}
                onClick={() => handleFilterDelete(filter)}
                size="small"
              >
                <ClearOutlinedIcon />
              </IconButton>
            </div>
          ))}
        </div>
      ) : null}
      {CustomBottomToolbar ? <CustomBottomToolbarMemo /> : null}
    </Box>
  );
};

export default Toolbar;

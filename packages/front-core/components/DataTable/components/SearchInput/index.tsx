import React from 'react';
import { translate } from 'react-translate';
import { ClickAwayListener } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import InputComponentRaw from 'components/DataTable/components/SearchInput/InputComponent';
import FilterChipsRaw from 'components/DataTable/components/SearchInput/FilterChips';
import FilterHandlersRaw from 'components/DataTable/components/SearchInput/FilterHandlers';
import processList from 'services/processList';
import waiter from 'helpers/waitForAction';

const InputComponent = InputComponentRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FilterChips = FilterChipsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FilterHandlers = FilterHandlersRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  root: {
    alignItems: 'center',
    flexGrow: 1,
    maxWidth: '100%',
    flexBasis: 0,
    marginLeft: 10
  },
  searchIcon: {
    padding: '0 8px'
  }
};

const SEARCH_INTERVAL = 1000;

interface SearchInputProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  variant?: string;
  autoFocus?: boolean;
  classes: Record<string, string>;
  search?: string;
  filters?: Record<string, unknown>;
  filterHandlers?: Record<string, React.ComponentType<Record<string, unknown>>>;
  actions?: {
    onSearchChange?: (value: string, force: boolean) => void;
    onFilterChange?: (filters: Record<string, unknown>) => void;
    load?: () => void;
  };
  darkTheme?: boolean;
  searchPlaceholder?: string;
  updateOnChangeSearch?: boolean;
}

const SearchInput = ({
  t,
  variant,
  autoFocus,
  classes,
  search: searchOrigin = '',
  filters = {},
  filterHandlers = {},
  actions = {},
  darkTheme,
  searchPlaceholder = undefined,
  updateOnChangeSearch = true
}: SearchInputProps) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState(searchOrigin);
  const timeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const handleChange = ({ target: { value } }: { target: { value: string } }, force?: boolean) => {
    setSearch(value);

    clearTimeout(timeout.current);

    const interval = force ? 0 : SEARCH_INTERVAL;

    timeout.current = setTimeout(() => {
      if (actions.onSearchChange) {
        actions.onSearchChange(value, false);
      }
      if (updateOnChangeSearch) {
        processList.hasOrSet('dataTableSearch_load', () => {
          waiter.addAction('dataTableSearch', actions.load as () => void, interval);
        });
      }
    }, interval);
  };

  const onKeyPress = ({ key }: React.KeyboardEvent) => {
    if (searchOrigin === search) return;

    if (key === 'Enter') {
      handleChange(
        {
          target: { value: search }
        },
        true
      );
    }
  };

  const onFocus = ({ currentTarget }: React.FocusEvent<HTMLElement>) => {
    setAnchorEl(currentTarget);
    setActiveFilter(null);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setActiveFilter(null);
  };

  const renderPlaceholder = () => {
    if (activeFilter) {
      return (
        filterHandlers?.[activeFilter] as unknown as (() => { props?: { label?: string } }) | undefined
      )?.()?.props?.label;
    }
    return searchPlaceholder || t('Search');
  };

  return (
    <>
      <ClickAwayListener onClickAway={handleClose}>
        <div className={classes.root} ref={rootRef}>
          <InputComponent
            autoFocus={autoFocus}
            variant={variant}
            value={search}
            darkTheme={darkTheme}
            placeholder={renderPlaceholder()}
            onChange={handleChange}
            onKeyPress={onKeyPress}
            onFocus={onFocus}
            startAdornment={
              <FilterChips
                filters={filters}
                onClose={handleClose}
                filterHandlers={filterHandlers}
                onFilterChange={actions.onFilterChange}
                onClick={(currentTarget: HTMLElement, filterName: string) => {
                  setAnchorEl(currentTarget);
                  setActiveFilter(filterName);
                }}
              />
            }
          />
          <FilterHandlers
            filters={filters}
            filterHandlers={filterHandlers}
            onFilterChange={actions.onFilterChange}
            onClose={handleClose}
            anchorEl={anchorEl}
            rootRef={rootRef}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            darkTheme={darkTheme}
          />
        </div>
      </ClickAwayListener>
    </>
  );
};

const styled = withStyles(styles)(SearchInput as never);
const translated = translate('DataTable')(styled as never);
export default translated as unknown as React.ComponentType<Record<string, unknown>>;

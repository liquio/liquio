import React from 'react';
import FilterListIcon from '@mui/icons-material/FilterList';

import FilterChipRaw from 'components/DataTable/components/FilterChip';

const FilterChip = FilterChipRaw as unknown as React.ComponentType<Record<string, unknown>>;

// Shared, deliberately loose prop surface: every FilterHandler subclass in
// this directory adds its own subset of these (options, users, actions,
// IconComponent, etc.) and reads them straight off `this.props` the same
// way the original untyped subclasses did, rather than each redeclaring a
// narrower props type that TS would then need reconciled against this base.
export interface FilterHandlerProps {
  type?: string | null;
  name?: string;
  value?: unknown;
  filterValue?: unknown;
  onChange?: (value: unknown, ...rest: unknown[]) => void;
  onClick?: (event: unknown) => void;
  onDelete?: () => void;
  classes?: Record<string, string>;
  t?: (key: string, params?: Record<string, unknown>) => string;
  darkTheme?: boolean;
  IconComponent?: React.ComponentType<Record<string, unknown>>;
  chipLabel?: string | null;
  options?: { id: string | number; name: string }[];
  useOwnNames?: boolean;
  listDisplay?: boolean;
  searchField?: boolean;
  placeholder?: string;
  renderListText?: (option: { id: string | number; name: string }) => React.ReactNode;
  disableToolbar?: boolean;
  variant?: string;
  users?: Record<string, unknown>;
  actions?: { searchUsers?: (params: Record<string, unknown>) => Promise<unknown>; [key: string]: unknown };
  replaceSpaces?: boolean;
  [key: string]: unknown;
}

export interface FilterHandlerState {
  [key: string]: unknown;
}

class FilterHandler extends React.Component<FilterHandlerProps, FilterHandlerState> {
  static defaultProps: Partial<FilterHandlerProps> = {
    type: 'handler',
    name: 'name not defined'
  };

  state: FilterHandlerState = {};

  renderChipContainer() {
    const { onClick, onDelete } = this.props;

    return (
      <FilterChip label={this.renderChip()} variant="outlined" onClick={onClick} onDelete={onDelete} />
    );
  }

  renderChip(): React.ReactNode {
    return <div>define filter chip</div>;
  }

  renderHandler(): React.ReactNode {
    return <div>define filter handler</div>;
  }

  renderIcon(): React.ReactNode {
    return <FilterListIcon />;
  }

  render() {
    const { type, name } = this.props;

    switch (type) {
      case 'chip':
        return this.renderChipContainer();
      case 'icon':
        return this.renderIcon();
      case 'name':
        return name;
      case 'handler':
      default:
        return this.renderHandler();
    }
  }
}

export default FilterHandler;

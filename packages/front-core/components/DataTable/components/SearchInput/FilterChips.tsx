import React from 'react';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';

const styles = {};

interface SearchFilterChipsProps {
  filterHandlers?: Record<string, React.ComponentType<Record<string, unknown>>>;
  filters?: Record<string, unknown>;
  onClick?: (currentTarget: HTMLElement, filterName: string) => void;
  onClose?: () => void;
  onFilterChange?: (filters: Record<string, unknown>) => void;
}

const SearchFilterChips = ({
  filterHandlers = {},
  filters = {},
  onClick = () => null,
  onFilterChange = () => null,
  onClose = () => null
}: SearchFilterChipsProps) => {
  const handleDelete = (filterName: string, filterValue?: unknown) => () => {
    const value = Object.keys(filters)
      .filter((fName) => {
        if (Array.isArray(filters[fName])) {
          filters[fName] = (filters[fName] as unknown[]).filter((el) => el !== filterValue);
          return (filters[fName] as unknown[]).length > 0;
        } else {
          return fName !== filterName;
        }
      })
      .reduce(
        (acc, fName) => ({
          ...acc,
          [fName]: filters[fName]
        }),
        {} as Record<string, unknown>
      );

    onFilterChange(value);
    onClose();
  };

  return (
    <>
      {Object.keys(filterHandlers).map((filterName) => {
        const FilterHandler = filterHandlers[filterName];

        if (!filters[filterName]) {
          return null;
        }

        if (Array.isArray(filters[filterName])) {
          return (filters[filterName] as unknown[]).map((filterValue) => (
            <FilterHandler
              key={filterName}
              type="chip"
              value={filterValue}
              onClick={({ currentTarget }: React.MouseEvent<HTMLElement>) => onClick(currentTarget, filterName)}
              onDelete={handleDelete(filterName, filterValue)}
            />
          ));
        }

        return (
          <FilterHandler
            key={filterName}
            type="chip"
            value={filters[filterName]}
            onClick={({ currentTarget }: React.MouseEvent<HTMLElement>) => onClick(currentTarget, filterName)}
            onDelete={handleDelete(filterName)}
          />
        );
      })}
    </>
  );
};

const styled = withStyles(styles)(SearchFilterChips as never);
export default translate('DataTable')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

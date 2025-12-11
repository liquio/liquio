import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';

const styles = {};

const SearchFilterChips = ({ filterHandlers, filters, onClick, onFilterChange, onClose }) => {
  const handleDelete = (filterName, filterValue) => () => {
    const value = Object.keys(filters)
      .filter((fName) => {
        if (Array.isArray(filters[fName])) {
          filters[fName] = filters[fName].filter((el) => el !== filterValue);
          return filters[fName].length > 0;
        } else {
          return fName !== filterName;
        }
      })
      .reduce(
        (acc, fName) => ({
          ...acc,
          [fName]: filters[fName]
        }),
        {}
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
          return filters[filterName].map((filterValue) => (
            <FilterHandler
              key={filterName}
              type="chip"
              value={filterValue}
              onClick={({ currentTarget }) => onClick(currentTarget, filterName)}
              onDelete={handleDelete(filterName, filterValue)}
            />
          ));
        }

        return (
          <FilterHandler
            key={filterName}
            type="chip"
            value={filters[filterName]}
            onClick={({ currentTarget }) => onClick(currentTarget, filterName)}
            onDelete={handleDelete(filterName)}
          />
        );
      })}
    </>
  );
};

SearchFilterChips.propTypes = {
  classes: PropTypes.object.isRequired,
  filters: PropTypes.object,
  filterHandlers: PropTypes.object,
  onClick: PropTypes.func,
  onClose: PropTypes.func,
  onFilterChange: PropTypes.func
};

SearchFilterChips.defaultProps = {
  filters: {},
  filterHandlers: {},
  onClick: () => null,
  onClose: () => null,
  onFilterChange: () => null
};

const styled = withStyles(styles)(SearchFilterChips);
export default translate('DataTable')(styled);

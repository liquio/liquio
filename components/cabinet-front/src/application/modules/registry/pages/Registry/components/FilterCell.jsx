import React from 'react';
import PropTypes from 'prop-types';
import { TableFilterRow } from '@devexpress/dx-react-grid-material-ui';

const FilterCell = ({ useSearch, ...restProps }) =>
  useSearch ? (
    <TableFilterRow.Cell
      {...restProps}
      style={{
        padding: '12px 12px 12px 0'
      }}
    />
  ) : null;

FilterCell.propTypes = {
  useSearch: PropTypes.bool.isRequired
};

export default FilterCell;

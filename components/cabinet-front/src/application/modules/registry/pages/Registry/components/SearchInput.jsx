import React from 'react';
import PropTypes from 'prop-types';
import { SearchPanel } from '@devexpress/dx-react-grid-material-ui';

const SearchInput = ({ useSearch, ...restProps }) =>
  useSearch ? <SearchPanel.Input {...restProps} /> : null;

SearchInput.propTypes = {
  useSearch: PropTypes.bool.isRequired
};

export default SearchInput;

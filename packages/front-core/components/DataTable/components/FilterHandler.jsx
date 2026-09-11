import React from 'react';
import PropTypes from 'prop-types';
import FilterListIcon from '@mui/icons-material/FilterList';

import FilterChip from 'components/DataTable/components/FilterChip';

class FilterHandler extends React.Component {
  state = {};

  renderChipContainer() {
    const { onClick, onDelete } = this.props;

    return (
      <FilterChip
        label={this.renderChip()}
        variant="outlined"
        onClick={onClick}
        onDelete={onDelete}
      />
    );
  }

  renderChip() {
    return <div>define filter chip</div>;
  }

  renderHandler() {
    return <div>define filter handler</div>;
  }

  renderIcon() {
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

FilterHandler.propTypes = {
  type: PropTypes.string,
  name: PropTypes.string
};

FilterHandler.defaultProps = {
  type: 'handler',
  name: 'name not defined'
};

export default FilterHandler;

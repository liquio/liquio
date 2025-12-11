import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

import FilterHandler from 'components/DataTable/components/FilterHandler';

class ToggleFilter extends FilterHandler {
  renderIcon = () => {
    const { IconComponent } = this.props;

    if (IconComponent) {
      return <IconComponent />;
    }

    return <NotificationsNoneIcon />;
  };

  renderChip = () => {
    const { name, chipLabel } = this.props;
    return [chipLabel || name].join(': ');
  };

  componentDidMount = () => {
    const { onChange } = this.props;
    onChange(true);
  };

  renderHandler = () => null;
}

ToggleFilter.propTypes = {
  name: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  chipLabel: PropTypes.string
};

ToggleFilter.defaultProps = {
  name: '',
  value: '',
  onChange: () => null,
  chipLabel: null
};

export default translate('StringFilterHandler')(ToggleFilter);

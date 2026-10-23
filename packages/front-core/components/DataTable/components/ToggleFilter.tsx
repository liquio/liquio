import React from 'react';
import { translate } from 'react-translate';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

import FilterHandler, { type FilterHandlerProps } from 'components/DataTable/components/FilterHandler';

class ToggleFilter extends FilterHandler {
  static defaultProps: Partial<FilterHandlerProps> = {
    ...FilterHandler.defaultProps,
    name: '',
    value: '',
    onChange: () => null,
    chipLabel: null
  };

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
    onChange?.(true);
  };

  renderHandler = () => null;
}

export default translate('StringFilterHandler')(ToggleFilter as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

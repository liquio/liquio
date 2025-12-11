import { Component } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';

class Mime extends Component {
  getTypes() {
    const { t, children } = this.props;
    const types = children
      .split(',')
      .map(t)
      .filter((value, index, self) => self.indexOf(value) === index);

    if (types.length === 2) {
      return types.join(t('OR'));
    }

    return types.join(', ');
  }

  render = () => this.getTypes();
}

Mime.propTypes = {
  children: PropTypes.node,
  t: PropTypes.func.isRequired,
};

Mime.defaultProps = {
  children: '',
};

export default translate('MimeType')(Mime);

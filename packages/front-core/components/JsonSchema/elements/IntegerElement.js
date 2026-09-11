import React from 'react';
import PropTypes from 'prop-types';
import StringElement from './StringElement';

class IntegerElement extends React.Component {
  componentDidMount() {
    const { value, onChange, required } = this.props;
    if (required && value === null && onChange) {
      onChange(0);
    }
  }

  render() {
    const { onChange, value, hidden } = this.props;

    if (hidden) return null;

    return (
      <StringElement
        {...this.props}
        type="number"
        value={String(value)}
        onChange={(val) => onChange && onChange(parseInt(val, 10))}
      />
    );
  }
}

IntegerElement.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func,
  required: PropTypes.bool,
};

IntegerElement.defaultProps = {
  value: null,
  onChange: () => null,
  required: false,
};

export default IntegerElement;

import React from 'react';
import PropTypes from 'prop-types';

import setComponentsId from 'helpers/setComponentsId';

export default class CustomInputWrapper extends React.Component {
  state = { editMode: false };
  render() {
    const { editMode } = this.state;
    if (!editMode) {
      return <h4 {...this.props}>test</h4>;
    }
    return this.props.children;
  }
}

CustomInputWrapper.propTypes = {
  children: PropTypes.node,
  setId: PropTypes.func
};

CustomInputWrapper.defaultProps = {
  children: <div />,
  setId: setComponentsId('custom-input-wrap')
};

/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import DialogWrapper from 'components/JsonSchema/elements/Modal/components/Dialog';
import ContentLayout from 'components/JsonSchema/elements/Modal/components/ContentLayout';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import evaluate from 'helpers/evaluate';

class Modal extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: false };
  }

  handleClickOpen = () => this.setState({ open: true });

  handleClose = () => this.setState({ open: false });

  getDisabled = () => {
    const { disabled, rootDocument } = this.props;

    try {
      return disabled && evaluate(disabled, rootDocument.data);
    } catch (e) {
      return false;
    }
  };

  componentDidUpdate = () => {
    const { open } = this.state;
    open && this.getDisabled() && this.setState({ open: false });
  };

  render = () => {
    const { hidden, required, error, disabled, noMargin, readOnly } =
      this.props;

    if (hidden) return null;

    return (
      <ElementContainer
        required={required}
        error={error}
        bottomSample={true}
        noMargin={noMargin}
      >
        <ContentLayout
          {...this.props}
          {...this.state}
          isDisabled={(disabled && this.getDisabled()) || readOnly}
          handleClickOpen={this.handleClickOpen}
        />
        <DialogWrapper
          {...this.props}
          {...this.state}
          handleClose={this.handleClose}
        />
      </ElementContainer>
    );
  };
}

Modal.propTypes = {
  rootDocument: PropTypes.object.isRequired,
  error: PropTypes.object,
  required: PropTypes.bool,
  hidden: PropTypes.bool,
  disabled: PropTypes.string,
  readOnly: PropTypes.bool,
};

Modal.defaultProps = {
  error: null,
  required: false,
  hidden: false,
  disabled: null,
  readOnly: false,
};

export default Modal;

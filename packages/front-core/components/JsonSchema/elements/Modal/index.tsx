/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import DialogWrapper from 'components/JsonSchema/elements/Modal/components/Dialog';
import ContentLayout from 'components/JsonSchema/elements/Modal/components/ContentLayout';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import evaluate from 'helpers/evaluate';
import { JsonSchemaNode } from '../../types';

interface ModalProps {
  rootDocument: { data: Record<string, unknown> };
  error?: unknown;
  required?: boolean;
  hidden?: boolean;
  disabled?: string | null;
  readOnly?: boolean;
  noMargin?: boolean;
  properties: Record<string, JsonSchemaNode>;
  onChange: (key: string, value: unknown) => void;
  originDocument: unknown;
  stepName: string;
  schema: JsonSchemaNode;
  actionText: string;
  path?: Array<string | number> | null;
  steps?: unknown[];
  taskId?: string | null;
  activeStep?: number | null;
  errors?: unknown[] | Record<string, unknown>;
  value?: Record<string, unknown>;
  description?: string | null;
  sample?: string | null;
  htmlBlock?: string | null;
  buttonFloat?: string;
  disabledText?: string | null;
  params?: Record<string, unknown> | null;
  actions?: unknown;
  [key: string]: unknown;
}

interface ModalState {
  open: boolean;
}

class Modal extends React.Component<ModalProps, ModalState> {
  static defaultProps: Partial<ModalProps> = {
    error: null,
    required: false,
    hidden: false,
    disabled: null,
    readOnly: false,
  };

  constructor(props: ModalProps) {
    super(props);
    this.state = { open: false };
  }

  handleClickOpen = () => this.setState({ open: true });

  handleClose = () => this.setState({ open: false });

  getDisabled = () => {
    const { disabled, rootDocument } = this.props;

    try {
      return disabled && evaluate(disabled, rootDocument.data);
    } catch {
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
        noMargin={noMargin as boolean}
      >
        <ContentLayout
          {...this.props}
          {...this.state}
          isDisabled={!!((disabled && this.getDisabled()) || readOnly)}
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

export default Modal;

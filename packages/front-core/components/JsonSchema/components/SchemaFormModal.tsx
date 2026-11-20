import React from 'react';
import { translate, Translate } from 'react-translate';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  CircularProgress
} from '@mui/material';

import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import ConfirmDialog from 'components/ConfirmDialog';
import { JsonSchemaNode } from '../types';

interface SchemaFormModalProps {
  t: Translate;
  title?: string | null;
  open?: boolean;
  clean?: boolean;
  value?: Record<string, unknown> | null;
  translateError?: ((message: string) => string) | null;
  onClose?: () => void;
  onChange?: (value: unknown) => Promise<void> | void;
  schema?: JsonSchemaNode;
  customControls?: Record<string, unknown>;
  darkTheme?: boolean;
  saveButtonText?: string;
}

interface SchemaFormModalState {
  value: Record<string, unknown> | null | undefined;
  errors: unknown[];
  error: Error | null;
  busy: boolean;
  showErrorDialog: boolean;
}

class SchemaFormModal extends React.Component<SchemaFormModalProps, SchemaFormModalState> {
  static defaultProps = {
    open: false,
    clean: true,
    value: null,
    title: null,
    schema: {},
    customControls: {},
    translateError: null,
    onClose: () => null,
    onChange: () => undefined,
    darkTheme: false
  };

  constructor(props: SchemaFormModalProps) {
    super(props);

    this.state = {
      value: props.value,
      errors: [],
      error: null,
      busy: false,
      showErrorDialog: false
    };
  }

  componentDidUpdate(prevProps: SchemaFormModalProps) {
    const { open, value } = this.props;

    if (open !== prevProps.open) {
      this.setState({ value, errors: [] });
    }
  }

  handleChange = (value: unknown) => this.setState({ value: value as Record<string, unknown> });

  handleSave = async () => {
    const { onChange, onClose, schema } = this.props;
    const { value } = this.state;

    const errors = validateData(value as Record<string, unknown>, schema as JsonSchemaNode);
    this.setState({ errors });

    if (!errors.length) {
      this.setState({ busy: true });
      try {
        await onChange?.(value);
        this.setState({ busy: false }, onClose);
      } catch (e) {
        this.setState({ busy: false, error: e as Error, showErrorDialog: true });
      }
    }
  };

  render() {
    const {
      t,
      open,
      onClose,
      title,
      schema,
      customControls,
      translateError,
      saveButtonText,
      clean,
      darkTheme
    } = this.props;
    const { value, errors, error, busy, showErrorDialog } = this.state;

    return (
      <>
        <Dialog
          open={!!open}
          onClose={busy ? undefined : onClose}
          scroll="body"
          fullWidth={true}
          maxWidth="sm"
        >
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <SchemaForm
              value={value}
              errors={errors}
              readOnly={busy}
              schema={schema}
              customControls={customControls}
              darkTheme={darkTheme}
              onChange={handleChangeAdapter(value as Record<string, unknown>, this.handleChange, clean)}
            />
          </DialogContent>
          <DialogActions>
            {busy ? <CircularProgress size={16} /> : null}
            <div style={{ flexGrow: 1 }} />
            <Button color="primary" onClick={onClose} disabled={busy} aria-label={t('Cancel')}>
              {t('Cancel')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={busy}
              onClick={this.handleSave}
              aria-label={saveButtonText || t('Save')}
            >
              {saveButtonText || t('Save')}
            </Button>
          </DialogActions>
        </Dialog>
        <ConfirmDialog
          title={t('Error')}
          open={showErrorDialog}
          description={
            error ? (translateError ? translateError(error.message) : error.message) : null
          }
          handleClose={() => this.setState({ showErrorDialog: false })}
        />
      </>
    );
  }
}

export default translate('Elements')(SchemaFormModal);

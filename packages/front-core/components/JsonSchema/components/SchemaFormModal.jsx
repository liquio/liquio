import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
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

class SchemaFormModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: props.value,
      errors: [],
      error: null,
      busy: false,
      showErrorDialog: false
    };
  }

  componentDidUpdate(prevProps) {
    const { open, value } = this.props;

    if (open !== prevProps.open) {
      this.setState({ value, errors: [] });
    }
  }

  handleChange = (value) => this.setState({ value });

  handleSave = async () => {
    const { onChange, onClose, schema } = this.props;
    const { value } = this.state;

    const errors = validateData(value, schema);
    this.setState({ errors });

    if (!errors.length) {
      this.setState({ busy: true });
      try {
        await onChange(value);
        this.setState({ busy: false }, onClose);
      } catch (e) {
        this.setState({ busy: false, error: e, showErrorDialog: true });
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
          open={open}
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
              onChange={handleChangeAdapter(value, this.handleChange, clean)}
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

SchemaFormModal.propTypes = {
  t: PropTypes.func.isRequired,
  title: PropTypes.string,
  open: PropTypes.bool,
  clean: PropTypes.bool,
  value: PropTypes.object,
  translateError: PropTypes.func,
  onClose: PropTypes.func,
  onChange: PropTypes.func,
  schema: PropTypes.object,
  customControls: PropTypes.object,
  darkTheme: PropTypes.bool
};

SchemaFormModal.defaultProps = {
  open: false,
  clean: true,
  value: null,
  title: null,
  schema: {},
  customControls: {},
  translateError: null,
  onClose: () => null,
  onChange: () => null,
  darkTheme: false
};

export default translate('Elements')(SchemaFormModal);

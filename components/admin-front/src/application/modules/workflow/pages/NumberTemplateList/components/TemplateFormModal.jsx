import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  FormHelperText,
} from '@mui/material';

import {
  SchemaForm,
  handleChangeAdapter,
  validateData,
} from 'components/JsonSchema';

import RegisterSelect from './RegisterSelect';
import schema from '../variables/registrySchema';

class TemplateFormModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: props.value,
      errors: [],
      error: null,
      busy: false,
    };
  }

  componentDidUpdate(prevProps) {
    const { open, value } = this.props;

    if (open !== prevProps.open) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ value, errors: [] });
    }
  }

  handleChange = (value) => this.setState({ value });

  handleSave = async () => {
    const { t, onChange, onClose } = this.props;
    const { value } = this.state;
    const registrySchema = schema({ t });

    const errors = validateData(value, registrySchema);
    this.setState({ errors });

    if (!errors.length) {
      this.setState({ busy: true });
      try {
        await onChange(value);
        this.setState({ busy: false }, onClose);
      } catch (e) {
        this.setState({ busy: false, error: e });
      }
    }
  };

  render() {
    const { t, open, onClose, value: origin } = this.props;
    const { value, errors, error, busy } = this.state;

    return (
      <Dialog
        open={open}
        onClose={busy ? undefined : onClose}
        scroll="body"
        fullWidth={true}
        maxWidth="sm"
      >
        <DialogTitle>{t(origin ? 'EditRegister' : 'NewRegister')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value}
            errors={errors}
            readOnly={busy}
            schema={schema({ t })}
            customControls={{
              RegisterSelect: (props) => (
                <RegisterSelect excludeKey={value && value.id} {...props} />
              ),
            }}
            onChange={handleChangeAdapter(value, this.handleChange)}
          />
        </DialogContent>
        <DialogActions>
          {error ? (
            <FormHelperText error={true}>{error.message}</FormHelperText>
          ) : null}
          <div style={{ flexGrow: 1 }} />
          <Button onClick={onClose} disabled={busy}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={busy}
            onClick={this.handleSave}
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

TemplateFormModal.propTypes = {
  t: PropTypes.func.isRequired,
  open: PropTypes.bool,
  value: PropTypes.object,
  onClose: PropTypes.func,
  onChange: PropTypes.func,
};

TemplateFormModal.defaultProps = {
  open: false,
  value: null,
  onClose: () => null,
  onChange: () => null,
};

export default translate('RegistryListAdminPage')(TemplateFormModal);

/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  FormHelperText,
  Typography,
} from '@mui/material';

import {
  SchemaForm,
  handleChangeAdapter,
  validateData,
} from 'components/JsonSchema';
import processList from 'services/processList';
import { getAllRegistersKeys } from 'application/actions/registry';
import { bindActionCreators } from 'redux';
import isCyrillic from 'helpers/isCyrillic';

import KeySelect from './KeySelect';
import schema from '../variables/keySchema';

class KeyFormModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: props.value || {},
      errors: [],
      error: null,
      busy: false,
      options: [],
    };
  }

  componentDidMount() {
    this.init();
  }

  init = async () => {
    const { actions, registerId } = this.props;

    const options = await processList.hasOrSet(
      'getAllRegistersKeys',
      actions.getAllRegistersKeys,
      registerId,
    );
    this.setState({ options });
  };

  componentDidUpdate = (prevProps) => {
    const { open, value } = this.props;

    if (open !== prevProps.open) {
      this.setState({
        value,
        errors: [],
      });
    }
  };

  handleChange = (value) => this.setState({ value });

  handleSave = async () => {
    const { t, onChange, registerId } = this.props;
    const { value } = this.state;
    const registrySchema = schema({ t });

    const errors = validateData(value, registrySchema);
    const exists = this.nameExists(value?.name);

    if (exists) {
      errors.push({
        dataPath: '.name',
        path: 'name',
        message: t('KeyNameExists'),
      });
    }

    this.setState({ errors });

    if (!errors.length) {
      this.setState({ busy: true });

      try {
        await onChange({
          ...value,
          registerId,
          parentId: value?.parentId || null,
        });
        this.setState({ busy: false });
      } catch (e) {
        this.setState({ busy: false, error: e });
      }
    }
  };

  handleClose = (event) => {
    const { onClose } = this.props;
    const { busy } = this.state;

    this.setState({ error: null });

    return busy ? undefined : onClose(event);
  };

  nameExists = (name) => {
    const { registerId, registryKeyList } = this.props;
    const { value } = this.state;
    const checkFunc = (el) =>
      Number(el.registerId) === Number(registerId) &&
      el.name === name &&
      el.id !== value?.id;
    return (Object.values(registryKeyList.data || {}) || []).filter(checkFunc)
      .length;
  };

  setDefaultData = ({ value, schemaResult }) => {
    if (value && typeof value.schema !== 'object') {
      value.schema = schemaResult.properties.schema.defaultSchema;
    }

    if (value && typeof value.toString !== 'string') {
      value.toString = schemaResult.properties.toString.defaultSchema;
    }

    if (value && typeof value.toSearchString !== 'string') {
      value.toSearchString =
        schemaResult.properties.toSearchString.defaultSchema;
    }
  };

  render = () => {
    const {
      t,
      open,
      onClose,
      value: origin,
      registerId,
      readOnly,
      type,
      newKey,
    } = this.props;
    const { value, errors, error, busy, options } = this.state;
    const schemaResult = schema({ t, type, newKey });

    this.setDefaultData({ value, schemaResult });

    const signatureDetails = value?.keySignature?.validationIdentity;

    return (
      <Dialog
        open={open}
        onClose={this.handleClose}
        scroll="body"
        fullWidth={true}
        maxWidth="sm"
      >
        <DialogTitle>{t(origin ? 'EditKey' : 'NewKey')}</DialogTitle>
        <DialogContent>
          <SchemaForm
            value={value}
            errors={errors}
            readOnly={busy || readOnly}
            schema={schemaResult}
            customControls={{
              KeySelect: (props) => (
                <KeySelect
                  {...props}
                  options={options}
                  registerId={registerId}
                  excludeKey={value && value.id}
                />
              ),
            }}
            onChange={handleChangeAdapter(value, this.handleChange)}
            handleSave={this.handleSave}
            onClose={onClose}
          />

          {signatureDetails ? (
            <>
              <Typography>{t('SignatureDetails')}</Typography>
              <Typography>{signatureDetails.join(', ')}</Typography>
            </>
          ) : null}

          {error ? (
            <FormHelperText error={true}>
              {isCyrillic(error.message) ? error.message : t(error.message)}
            </FormHelperText>
          ) : null}
        </DialogContent>
        <DialogActions>
          <div style={{ flexGrow: 1 }} />
          <Button onClick={onClose} disabled={busy}>
            {t('Cancel')}
          </Button>
          {readOnly ? null : (
            <Button
              variant="contained"
              color="primary"
              disabled={busy}
              onClick={this.handleSave}
            >
              {t('Save')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  };
}

KeyFormModal.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  open: PropTypes.bool,
  value: PropTypes.object,
  onClose: PropTypes.func,
  onChange: PropTypes.func,
  registerId: PropTypes.string.isRequired,
  registryKeyList: PropTypes.object.isRequired,
  readOnly: PropTypes.bool,
  type: PropTypes.string,
};

KeyFormModal.defaultProps = {
  open: false,
  value: {},
  onClose: () => null,
  onChange: () => null,
  readOnly: false,
  type: null,
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    getAllRegistersKeys: bindActionCreators(getAllRegistersKeys, dispatch),
  },
});
const mapStateToProps = ({ registryKeyList }) => ({ registryKeyList });
const translated = translate('KeyListAdminPage')(KeyFormModal);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

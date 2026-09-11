import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  Checkbox,
  FormControlLabel,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import Preloader from 'components/Preloader';
import { importRegistersKeysXLS , getRegistersKeys } from 'application/actions/registry';
import EJVError from 'components/JsonSchema/components/EJVError';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import ExplicitIcon from '@mui/icons-material/Explicit';
import StringElement from 'components/JsonSchema/elements/StringElement';
import Select from 'components/Select';
import RegisterSelect from './RegisterSelect';

const styles = {
  buttonPadding: {
    marginLeft: 10,
  },
  xlsButton: {
    marginTop: 20,
    marginBottom: 20,
  },
  selectWrapper: {
    marginBottom: 40,
  },
};

class ImportRegistersKeys extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      openImportDialog: false,
      registerId: null,
      keyId: null,
      unique: '',
      showErrorDialog: false,
      error: null,
      loading: false,
      registerKeys: [],
      clear: false,
    };
  }

  handleOpenImportDialog = () => this.setState({ openImportDialog: true });

  handleCloseImportDialog = () => this.setState({ openImportDialog: false });

  handleCheckboxChange = (event) =>
    this.setState({ clear: event.target.checked });

  handleUploadClick = () => {
    const { t } = this.props;
    const { registerId, keyId } = this.state;

    if (registerId && keyId) {
      this.input && this.input.click();
    } else {
      this.setState({ error: new Error(t('RequiredField')) });
    }
  };

  handleChange = async ({ target }) => {
    const { actions, importActions } = this.props;
    const { registerId, keyId, unique, clear } = this.state;

    this.handleCloseImportDialog();

    this.setState({ loading: true });

    const importResult = await importActions.importRegistersKeysXLS(
      target.files[0],
      registerId,
      keyId?.id,
      unique,
      clear,
    );

    this.setState({ loading: false });

    if (importResult instanceof Error) {
      this.setState({
        showErrorDialog: true,
        error: {
          message: importResult?.message,
          details: JSON.stringify(
            importResult?.response?.details || {},
            null,
            4,
          ),
        },
      });
      return;
    }
    importActions.addMessage(new Message('ImportRegistersSuccess', 'success'));
    this.setState({ registerId: null, keyId: null, unique: '', clear: false });
    actions.load();
  };

  handleFieldChange =
    (name) =>
    ({ target: { value } }) =>
      this.setState({ [name]: value });

  getRegistryKeys = async () => {
    const { importActions } = this.props;
    const { registerId } = this.state;

    const optionsToMenu = (option) =>
      option ? { ...option, value: option.id, label: option.name } : null;

    const keys = await importActions.getRegistersKeys(registerId, true);

    if (keys instanceof Error) {
      importActions.addMessage(
        new Message('FailGettingRegistersKeys', 'error'),
      );
    }

    this.setState({
      registerKeys: keys.map(optionsToMenu),
    });
  };

  onCloseError = () => {
    this.setState({
      openImportDialog: false,
      showErrorDialog: false,
      registerId: null,
      keyId: null,
      error: null,
      unique: '',
      clear: false,
    });
  };

  componentDidUpdate = (prevProps, prevState) => {
    const { registerId } = this.state;

    if (!registerId) return;

    if (prevState.registerId === registerId) return;

    this.getRegistryKeys();
  };

  render = () => {
    const { t, classes, ColorButton, loading: loadingOrigin } = this.props;
    const {
      openImportDialog,
      registerId,
      keyId,
      unique,
      showErrorDialog,
      error,
      loading,
      registerKeys,
    } = this.state;
    const errorText = error ? <EJVError error={error} /> : null;

    return (
      <>
        {loading ? (
          <Dialog open={true}>
            <Preloader />
          </Dialog>
        ) : null}

        <ColorButton
          variant="contained"
          color="primary"
          disableElevation={true}
          onClick={this.handleOpenImportDialog}
          disabled={loadingOrigin}
        >
          <ExplicitIcon />
          {t('ImportRegistersKeysXLS')}
        </ColorButton>

        {openImportDialog ? (
          <input
            ref={(ref) => {
              this.input = ref;
            }}
            type="file"
            accept=".xls, .xlsx"
            onChange={this.handleChange}
            hidden={true}
            multiple={false}
          />
        ) : null}

        {openImportDialog ? (
          <Dialog
            open={true}
            fullWidth={true}
            onClose={this.handleCloseImportDialog}
          >
            <DialogTitle>{t('ImportRegistersKeysXLS')}</DialogTitle>
            <DialogContent>
              <FormControl variant="standard" row={false}>
                <RegisterSelect
                  description={t('RegisterChoose')}
                  value={registerId}
                  fullWidth={true}
                  required={true}
                  darkTheme={true}
                  variant={'outlined'}
                  onChange={(value) => {
                    this.handleFieldChange('registerId')({
                      target: { value },
                    });
                    this.handleFieldChange('keyId')({
                      target: {
                        value: null,
                      },
                    });
                  }}
                  error={
                    !!error
                      ? {
                          keyword: '',
                          message: errorText,
                        }
                      : null
                  }
                />

                {registerId ? (
                  <div className={classes.selectWrapper}>
                    <Select
                      description={t('RegistryKeyChoose')}
                      options={registerKeys}
                      value={keyId}
                      fullWidth={true}
                      required={true}
                      darkTheme={true}
                      variant={'outlined'}
                      onChange={(value) => {
                        this.handleFieldChange('keyId')({
                          target: { value },
                        });
                      }}
                      error={
                        !!error
                          ? {
                              keyword: '',
                              message: errorText,
                            }
                          : null
                      }
                    />
                  </div>
                ) : null}

                <StringElement
                  description={t('Unique')}
                  value={unique || ''}
                  fullWidth={true}
                  helperText={`<span style="color: rgba(255, 255, 255, 0.6);font-size: 11px;">${t(
                    'UniqueDescription',
                  )}</span>`}
                  darkTheme={true}
                  required={true}
                  variant={'outlined'}
                  onChange={(value) => {
                    this.handleFieldChange('unique')({ target: { value } });
                  }}
                  inputProps={{ maxLength: 255 }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      id={'delete-records'}
                      onChange={(event) => {
                        this.handleCheckboxChange(event);
                      }}
                    />
                  }
                  label={t('DeleteOldRecords')}
                />
              </FormControl>
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleUploadClick}
                className={classes.xlsButton}
              >
                {t('Continue')}
              </Button>
            </DialogContent>
          </Dialog>
        ) : null}

        {showErrorDialog && error ? (
          <Dialog open={true} onClose={this.onCloseError}>
            <DialogTitle>{t('ErrorImportingKeys')}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {error?.message}
                {error?.details ? <pre>{error?.details}</pre> : null}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={this.onCloseError}
                color="primary"
                autoFocus={true}
              >
                {t('CloseErrorDialog')}
              </Button>
            </DialogActions>
          </Dialog>
        ) : null}
      </>
    );
  };
}

ImportRegistersKeys.propTypes = {
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
};

ImportRegistersKeys.defaultProps = {};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    importRegistersKeysXLS: bindActionCreators(
      importRegistersKeysXLS,
      dispatch,
    ),
    addMessage: bindActionCreators(addMessage, dispatch),
    getRegistersKeys: bindActionCreators(getRegistersKeys, dispatch),
  },
});

const translated = translate('RegistryListAdminPage')(ImportRegistersKeys);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(styled);

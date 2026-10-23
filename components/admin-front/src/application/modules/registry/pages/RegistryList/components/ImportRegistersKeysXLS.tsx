import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
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
import { importRegistersKeysXLS, getRegistersKeys } from 'application/actions/registry';
import EJVErrorRaw from 'components/JsonSchema/components/EJVError';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import ExplicitIcon from '@mui/icons-material/Explicit';
import StringElementRaw from 'components/JsonSchema/elements/StringElement';
import SelectRaw from 'components/Select';
import RegisterSelectRaw from './RegisterSelect';

const EJVError = EJVErrorRaw as unknown as React.ComponentType<Record<string, unknown>>;
const StringElement = StringElementRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Select = SelectRaw as unknown as React.ComponentType<Record<string, unknown>>;
const RegisterSelect = RegisterSelectRaw as unknown as React.ComponentType<Record<string, unknown>>;

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

interface RegisterKeyOption {
  id: string;
  name?: string;
  value?: string;
  label?: string;
}

interface ImportRegistersKeysProps {
  actions: { load: () => void };
  importActions: {
    importRegistersKeysXLS: (
      file: File,
      registerId: string | null,
      keyId: string | undefined,
      unique: string,
      clear: boolean,
    ) => Promise<unknown>;
    getRegistersKeys: (registerId: string | null, silent: boolean) => Promise<RegisterKeyOption[] | Error>;
    addMessage: (message: unknown) => void;
  };
  classes: Record<string, string>;
  t: (key: string, params?: Record<string, unknown>) => string;
  ColorButton: React.ComponentType<Record<string, unknown>>;
  loading?: boolean;
}

interface ImportRegistersKeysState {
  openImportDialog: boolean;
  registerId: string | null;
  keyId: RegisterKeyOption | null;
  unique: string;
  showErrorDialog: boolean;
  error: { message?: string; details?: string } | Error | null;
  loading: boolean;
  registerKeys: RegisterKeyOption[];
  clear: boolean;
}

class ImportRegistersKeys extends React.Component<ImportRegistersKeysProps, ImportRegistersKeysState> {
  constructor(props: ImportRegistersKeysProps) {
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

  input: HTMLInputElement | null = null;

  handleOpenImportDialog = () => this.setState({ openImportDialog: true });

  handleCloseImportDialog = () => this.setState({ openImportDialog: false });

  handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) =>
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

  handleChange = async ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const { actions, importActions } = this.props;
    const { registerId, keyId, unique, clear } = this.state;

    this.handleCloseImportDialog();

    this.setState({ loading: true });

    const importResult = await importActions.importRegistersKeysXLS(
      target.files?.[0] as File,
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
            (importResult as unknown as { response?: { details: unknown } })?.response?.details || {},
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
    (name: 'registerId' | 'keyId' | 'unique') =>
    ({ target: { value } }: { target: { value: unknown } }) =>
      this.setState({ [name]: value } as never);

  getRegistryKeys = async () => {
    const { importActions } = this.props;
    const { registerId } = this.state;

    const optionsToMenu = (option: RegisterKeyOption | null | undefined): RegisterKeyOption | null =>
      option ? { ...option, value: option.id, label: option.name } : null;

    const keys = await importActions.getRegistersKeys(registerId, true);

    if (keys instanceof Error) {
      importActions.addMessage(
        new Message('FailGettingRegistersKeys', 'error'),
      );
      return;
    }

    this.setState({
      registerKeys: keys.map(optionsToMenu) as RegisterKeyOption[],
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

  componentDidUpdate = (_prevProps: ImportRegistersKeysProps, prevState: ImportRegistersKeysState) => {
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
              <FormControl variant="standard">
                <RegisterSelect
                  description={t('RegisterChoose')}
                  value={registerId}
                  fullWidth={true}
                  required={true}
                  darkTheme={true}
                  variant={'outlined'}
                  onChange={(value: string) => {
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
                      onChange={(value: RegisterKeyOption) => {
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
                  onChange={(value: string) => {
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
                {(error as { message?: string })?.message}
                {(error as { details?: string })?.details ? <pre>{(error as { details?: string })?.details}</pre> : null}
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

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  importActions: {
    importRegistersKeysXLS: bindActionCreators(
      importRegistersKeysXLS,
      dispatch,
    ),
    addMessage: bindActionCreators(addMessage, dispatch),
    getRegistersKeys: bindActionCreators(getRegistersKeys, dispatch),
  },
});

const translated = translate('RegistryListAdminPage')(ImportRegistersKeys as never);
const styled = withStyles(styles)(translated as never);
export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

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
  Checkbox,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { importRegisters } from 'application/actions/registry';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import ConfirmDialog from 'components/ConfirmDialog';
import Preloader from 'components/Preloader';
import DownloadIcon from 'assets/img/dowload-icon.svg';

const styles = {
  buttonPadding: {
    marginLeft: 10,
  },
  actionBtn: {
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    paddingBottom: 0,
  },
  importBtn: {
    marginLeft: 10,
  },
};

class ImportRegisters extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      openConfirmDialog: false,
      openImportDialog: false,
      checked: {
        rewrite_schema: false,
        clear_records: false,
        add_data: false,
        loading: false,
        useStream: false,
      },
    };
  }

  handleOpenImportDialog = () => this.setState({ openImportDialog: true });

  handleCloseImportDialog = () => this.setState({ openImportDialog: false });

  handleOpenConfirmDialog = () => this.setState({ openConfirmDialog: true });

  handleCloseConfirmDialog = () => this.setState({ openConfirmDialog: false });

  handleUploadClick = () => this.input && this.input.click();

  handleChange = async ({ target }) => {
    this.setState({ target });
    const { actions, importActions } = this.props;
    const { checked } = this.state;

    this.handleCloseImportDialog();
    this.setState({ loading: true });

    const importResult = await importActions.importRegisters(
      target.files[0],
      false,
      checked.rewrite_schema,
      checked.clear_records,
      checked.add_data,
    );

    this.setState({ loading: false });

    if (importResult instanceof Error) {
      if (importResult.message.indexOf('Register already exists.') === 0) {
        return this.handleOpenConfirmDialog();
      }
      return importActions.addMessage(new Message('InvalidFile', 'error'));
    }

    importActions.addMessage(new Message('ImportRegistersSuccess', 'success'));
    actions.load();
  };

  handleChangeConfirm = async () => {
    const { actions, importActions } = this.props;
    const { target, checked } = this.state;

    this.handleCloseConfirmDialog();
    this.setState({ loading: true });

    const importResult = await importActions.importRegisters(
      target.files[0],
      true,
      checked.rewrite_schema,
      checked.clear_records,
      checked.add_data,
    );

    this.setState({ loading: false });

    if (importResult instanceof Error) {
      importActions.addMessage(new Message('FailImportingRegisters', 'error'));
      return;
    }

    importActions.addMessage(new Message('ImportRegistersSuccess', 'success'));
    actions.load();

    this.setState({ target: {} });
  };

  handleCheckboxChange =
    (keyId) =>
    ({ target: { checked } }) =>
      this.setState({
        checked: {
          ...this.state.checked,
          [keyId]: checked,
        },
      });

  render() {
    const { t, classes, ColorButton } = this.props;
    const { openConfirmDialog, openImportDialog, checked, loading } =
      this.state;

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
          className={classes.importBtn}
        >
          <img src={DownloadIcon} alt="import icon" />
          {t('ImportRegisters')}
        </ColorButton>

        <input
          ref={(ref) => {
            this.input = ref;
          }}
          type="file"
          accept=".bpmn, application/bpmn"
          onChange={this.handleChange}
          hidden={true}
          multiple={false}
        />

        <ConfirmDialog
          darkTheme={true}
          fullScreen={false}
          open={openConfirmDialog}
          title={t('OverwriteRegisterConfirmation')}
          description={t('OverwriteRegisterConfirmationText')}
          handleClose={() => {
            this.setState({ loading: false });
            this.handleCloseConfirmDialog();
          }}
          handleConfirm={this.handleChangeConfirm}
        />

        <Dialog
          onClose={() => this.setState({ openImportDialog: false })}
          open={openImportDialog}
        >
          <DialogTitle className={classes.title}>
            {t('HowToImport')}
          </DialogTitle>
          <DialogContent>
            <FormGroup row={false}>
              <FormControlLabel
                control={
                  <Checkbox
                    id={'with-data-radio'}
                    checked={checked.rewrite_schema}
                    onChange={this.handleCheckboxChange('rewrite_schema')}
                  />
                }
                label={t('RewriteSchema')}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    id={'clear-records-radio'}
                    checked={checked.clear_records}
                    onChange={this.handleCheckboxChange('clear_records')}
                  />
                }
                label={t('ClearRecords')}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    id={'without-data-radio'}
                    checked={checked.add_data}
                    onChange={this.handleCheckboxChange('add_data')}
                  />
                }
                label={t('AddData')}
              />
            </FormGroup>
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleUploadClick}
              className={classes.actionBtn}
            >
              {t('Continue')}
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}

ImportRegisters.propTypes = {
  actions: PropTypes.object.isRequired,
  importActions: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
};

ImportRegisters.defaultProps = {};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    importRegisters: bindActionCreators(importRegisters, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const translated = translate('RegistryListAdminPage')(ImportRegisters);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(styled);

import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  DialogActions,
  FormHelperText,
  FormGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import classNames from 'classnames';

import { history } from 'store';

import AddIcon from '@mui/icons-material/Add';
import ExportIcon from 'assets/img/export_pink.svg';

import { importWorkflow, createWorkflow } from 'application/actions/workflow';

import emptyWorkflow from 'application/modules/workflow/variables/emptyWorkflow';

import { addMessage, closeError } from 'actions/error';
import Message from 'components/Snackbars/Message';
import ConfirmDialog from 'components/ConfirmDialog';
import StringElement from 'components/JsonSchema/elements/StringElement';

import padWithZeroes from 'helpers/padWithZeroes';

import DownloadIcon from 'assets/img/dowload-icon.svg';
import parseFile from 'helpers/parseFile';
import { getConfig } from '../../../../../../core/helpers/configLoader';

const styles = (theme) => ({
  formControl: {
    marginBottom: 30
  },
  importButton: {
    marginLeft: 16
  },
  darkThemeLabel: {
    '& fieldset': {
      borderColor: 'transparent'
    },
    '& label': {
      color: '#fff'
    }
  },
  buttonsWrapper: {
    display: 'flex',
    '& button': {
      flex: 1
    },
    [theme.breakpoints.down('md')]: {
      width: '100%',
      marginTop: '10px'
    }
  }
});

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover
    },
    '& svg': {
      fill: theme.buttonBg,
      marginRight: 10
    },
    '& img': {
      fill: theme.buttonBg,
      marginRight: 10
    }
  }
}))(Button);

class ImportWorkflow extends React.Component {
  state = {
    error: null,
    openNewWorkflowDialog: false,

    newWorkflow: {},
    busy: false,
    openConfirmDialog: false,
    target: {},
    customer: null,
    exporting: false,
    ignoreErrors: false,
    ignoreErrorsDialog: false
  };

  handleOpenConfirmDialog = () =>
    this.setState({ openConfirmDialog: true, ignoreErrorsDialog: null });

  handleCloseConfirmDialog = () => this.setState({ openConfirmDialog: false });

  handleUploadClick = () => {
    this.input.value = null;
    this.input && this.input.click();
  };

  handleChangeNewWorkflow =
    (field) =>
    ({ target: { value } }) => {
      const config = getConfig();
      const { newWorkflow } = this.state;
      const { path } = this.props;
      const { testCategory } = config;

      if (path === '/workflow_test') {
        newWorkflow.workflowTemplateCategoryId = testCategory;
      }
      this.setState({
        newWorkflow: {
          ...newWorkflow,
          [field]: value
        }
      });
    };

  handleChangeCustomer = ({ target: { value: customer } }) => this.setState({ customer });

  handleChange = async ({ target }) => {
    this.setState({ target });
    const { actions, importActions } = this.props;
    const { ignoreErrors } = this.state;

    const file = target.files[0];

    parseFile(file, (files) => {
      this.setState({
        filesInfo: []
          .concat(files)
          .map(({ workflowTemplate: { id, name } }) => `${id} «${name}»`)
          .join(', ')
      });
    });

    const importResult = await importActions.importWorkflow(target.files[0], false, ignoreErrors);

    if (importResult instanceof Error) {
      if (importResult.message === 'Workflow already exists.') {
        this.handleOpenConfirmDialog();
      } else {
        importActions.addMessage(
          new Message('InvalidFile', 'error', importResult.response.details)
        );
      }
      return;
    }

    const { filesInfo } = this.state;

    importActions.addMessage(
      new Message('ImportSuccess', 'success', null, {
        filesInfo
      })
    );

    this.setState({ ignoreErrorsDialog: null, ignoreErrors: false });

    actions.load();
  };

  handleChangeConfirm = async () => {
    const { actions, importActions } = this.props;
    const { target, ignoreErrors } = this.state;

    this.handleCloseConfirmDialog();

    const importResult = await importActions.importWorkflow(target.files[0], true, ignoreErrors);

    if (importResult instanceof Error) {
      importActions.addMessage(
        new Message('FailImportingWorkflow', 'error', importResult.response.details)
      );
      return;
    }

    const { filesInfo } = this.state;

    importActions.addMessage(
      new Message('ImportSuccess', 'success', null, {
        filesInfo
      })
    );

    actions.load();

    this.setState({ target: {} });
  };

  generateWorkflowId = () => {
    const { newWorkflow, customer } = this.state;
    const {
      customers,
      application: { environment }
    } = getConfig();
    const customerId = customer ? customer || customers[0].id : '';

    const envId = {
      development: 0,
      stage: 1,
      demo: 2,
      production: 9
    };

    const id =
      '' + customerId + (envId[environment] || 0) + padWithZeroes(parseInt(newWorkflow.id, 10), 3);

    return newWorkflow.id ? id : undefined;
  };

  handleCreateWorkflow = async () => {
    const { importActions } = this.props;
    const { newWorkflow, busy, customer } = this.state;

    const { customers } = getConfig();

    this.setState({ trigered: true });

    if (!newWorkflow.name || busy || (!customer && (customers || []).length > 1)) return;

    this.setState({ busy: true });

    const id = this.generateWorkflowId();

    const workflow = await importActions.createWorkflow(
      emptyWorkflow({
        ...newWorkflow,
        id
      })
    );

    if (workflow instanceof Error) {
      this.setState({ busy: false, error: workflow });
      return;
    }

    this.setState({ busy: false }, () => {
      history.push(`/workflow/${workflow.id}`);
    });
  };

  hideMessage = () => {
    const { importActions, errors } = this.props;
    if (!errors.length) return;
    importActions.closeError(0);
  };

  exportWorkflow = async () => {
    const { exportWorkflow, selectedRowsData } = this.props;
    const { exporting } = this.state;
    if (exporting) return;
    this.setState({ exporting: true });
    for (const workflow of selectedRowsData) {
      await exportWorkflow(workflow);
    }
    this.setState({ exporting: false });
  };

  exportWorkflowButton = () => {
    const { t, classes, selectedRowsData } = this.props;
    return (
      <>
        {(selectedRowsData || []).length ? (
          <ColorButton
            variant="contained"
            color="primary"
            disableElevation={true}
            className={classes.actionBtn}
            onClick={this.exportWorkflow}
          >
            <img
              src={ExportIcon}
              className={classes.actionColor}
              alt="export workflow icon"
              width={23}
            />
            {t('ExportWorkflow')}
          </ColorButton>
        ) : null}
      </>
    );
  };

  render() {
    const {
      openNewWorkflowDialog,
      newWorkflow,
      busy,
      openConfirmDialog,
      customer,
      error,
      trigered,
      filesInfo,
      ignoreErrorsDialog,
      ignoreErrors
    } = this.state;
    const { t, classes, readOnly, selectedRowsData } = this.props;

    const { customers } = getConfig();

    if (readOnly) return this.exportWorkflowButton();

    return (
      <>
        <div className={classes.buttonsWrapper}>
          <ColorButton
            variant="contained"
            color="primary"
            disableElevation={true}
            onClick={() => this.setState({ openNewWorkflowDialog: true })}
          >
            <AddIcon />
            {t('CreateWorkflow')}
          </ColorButton>

          {(selectedRowsData || []).length ? null : (
            <ColorButton
              variant="contained"
              color="primary"
              disableElevation={true}
              onClick={() => this.setState({ ignoreErrorsDialog: true })}
              className={classes.importButton}
            >
              <img src={DownloadIcon} alt="import workflow icon" className={classes.actionColor} />
              {t('ImportWorkflow')}
            </ColorButton>
          )}

          {this.exportWorkflowButton()}
        </div>

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
          fullScreen={false}
          darkTheme={true}
          open={openConfirmDialog}
          title={t('OverwriteWorkflowConfirmation', {
            filesInfo
          })}
          description={t('OverwriteWorkflowConfirmationText')}
          handleClose={this.handleCloseConfirmDialog}
          handleConfirm={this.handleChangeConfirm}
        />
        <Dialog
          fullWidth={true}
          maxWidth="sm"
          onClose={() => !busy && this.setState({ openNewWorkflowDialog: false })}
          open={openNewWorkflowDialog}
        >
          <DialogTitle>{t('NewWorkflow')}</DialogTitle>
          <DialogContent>
            <StringElement
              description={t('WorkflowName')}
              fullWidth={true}
              darkTheme={true}
              required={true}
              disabled={busy}
              variant={'outlined'}
              onChange={(value) => {
                this.handleChangeNewWorkflow('name')({ target: { value } });
              }}
              value={newWorkflow.name || ''}
              inputProps={{ maxLength: 255 }}
              className={classNames({
                [classes.formControl]: true,
                [classes.darkThemeLabel]: true
              })}
              error={
                trigered && !(newWorkflow?.name || '').length
                  ? {
                      keyword: '',
                      message: t('RequiredField')
                    }
                  : null
              }
            />

            {customers && customers.length > 1 ? (
              <FormControl
                fullWidth={true}
                error={trigered && !customer}
                variant={'outlined'}
                className={classNames({
                  [classes.formControl]: true,
                  [classes.darkThemeLabel]: true
                })}
              >
                <InputLabel htmlFor="customer-select">{t('Customer')}</InputLabel>
                <Select
                  id="customer-select"
                  value={customer || ''}
                  onChange={this.handleChangeCustomer}
                  inputProps={{
                    id: 'customer-select'
                  }}
                  MenuProps={{
                    classes: {
                      paper: classes.darkThemePaper
                    }
                  }}
                  classes={{
                    select: classes.darkThemeSelect
                  }}
                >
                  {customers.map(({ id, name }) => (
                    <MenuItem key={id} value={id}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
                {trigered && !customer ? (
                  <FormHelperText>{t('RequiredField')}</FormHelperText>
                ) : null}
              </FormControl>
            ) : null}

            <StringElement
              description={t('WorkflowNumber')}
              fullWidth={true}
              darkTheme={true}
              required={true}
              variant={'outlined'}
              mask={'999'}
              value={newWorkflow.id || ''}
              onChange={(value) => {
                this.handleChangeNewWorkflow('id')({ target: { value } });
              }}
              className={classNames({
                [classes.formControl]: true,
                [classes.darkThemeLabel]: true
              })}
            />
          </DialogContent>
          <DialogActions>
            {busy ? (
              <CircularProgress size={32} />
            ) : (
              <Button variant="contained" color="primary" onClick={this.handleCreateWorkflow}>
                {t('Continue')}
              </Button>
            )}
          </DialogActions>
        </Dialog>
        <ConfirmDialog
          fullScreen={false}
          darkTheme={true}
          open={!!error}
          title={t('WorkflowErrorTitle')}
          description={error && t(error.message)}
          handleClose={() => this.setState({ error: null })}
        />
        <ConfirmDialog
          fullScreen={false}
          darkTheme={true}
          open={ignoreErrorsDialog}
          acceptButtonText={t('Continue')}
          handleConfirm={this.handleUploadClick}
          handleClose={() => this.setState({ ignoreErrorsDialog: null, ignoreErrors: false })}
        >
          <FormGroup>
            <FormControlLabel
              control={<Checkbox />}
              label={t('IgnoreErrorsAsk')}
              checked={ignoreErrors}
              onChange={({ target: { checked } }) => this.setState({ ignoreErrors: checked })}
            />
          </FormGroup>
        </ConfirmDialog>
      </>
    );
  }
}

const mapStateToProps = ({ errors: { list } }) => ({
  errors: list
});

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    createWorkflow: bindActionCreators(createWorkflow, dispatch),
    importWorkflow: bindActionCreators(importWorkflow, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    closeError: bindActionCreators(closeError, dispatch)
  }
});

const styled = withStyles(styles)(ImportWorkflow);
const translated = translate('WorkflowListAdminPage')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

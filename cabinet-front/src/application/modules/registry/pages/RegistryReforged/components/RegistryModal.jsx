import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import { Button, Dialog, DialogActions, DialogContent, Toolbar, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import cleanDeep from 'clean-deep';
import deepObjectFind from 'helpers/deepObjectFind';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';

import { addMessage } from 'actions/error';
import { restoreRecord } from 'actions/registry';
import ConfirmDialog from 'components/ConfirmDialog';
import SigningDialog from 'components/P7SForm/SigningDialog';
import { handleChangeAdapter, SchemaForm, validateDataAsync } from 'components/JsonSchema';
import Message from 'components/Snackbars/Message';
import diff from 'helpers/diff';
import KeyVersionSelect from './KeyVersionSelect';
import { ReactComponent as CloseIcon } from './assets/close.svg';
import { ReactComponent as DeleteIcon } from './assets/delete.svg';
import { ReactComponent as EditIcon } from './assets/edit.svg';

const styles = (theme) => ({
  dialogContent: {
    overflowX: 'hidden'
  },
  toolbar: {
    display: 'flex',
    paddingTop: 20,
    justifyContent: 'space-between',
    minHeight: 'unset'
  },
  grow: {
    flexGrow: 1
  },
  restoreIcon: {
    color: '#FFFFFF'
  },
  dialogActions: {
    justifyContent: 'space-between',
    padding: '16px 20px',
    '& button': {
      height: 40
    }
  },
  deleteButton: {
    backgroundColor: 'transparent',
    color: theme?.deleteButton?.color || '#B01038',
    '& path': {
      fill: theme?.deleteButton?.fill
    }
  },
  closeButton: {
    backgroundColor: 'transparent',
    color: theme?.closeButton?.color || '#0068FF',
    marginLeft: 8,
    '& path': {
      fill: theme?.closeButton?.fill
    }
  },
  dialogPaper: {
    maxWidth: 792
  }
});

class RegistryModal extends React.Component {
  constructor(props) {
    super(props);
    const { editMode } = props;
    this.state = {
      record: null,
      editMode,
      errors: [],
      showClosePrompt: false,
      openConfirmDialog: false,
      showSigningDialog: false,
      operation: null
    };
  }

  recursiveSort = (obj) => {
    if (typeof obj !== 'object' || obj instanceof Array || obj instanceof Date) {
      return obj;
    }

    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return obj;
    }

    const sortedObject = {};

    keys.sort().forEach((key) => {
      sortedObject[key] = this.recursiveSort(obj[key]);
    });

    return sortedObject;
  };

  handleClose = () => {
    const { handleClose, value } = this.props;
    const { record, editMode } = this.state;

    const diffs = diff(value && value.data, record && record.data);

    if (editMode && diffs) {
      this.setState({ showClosePrompt: true });
      return;
    }

    this.setState({ editMode: false }, handleClose);
  };

  handleChange = (data) => {
    const { record } = this.state;

    this.setState({
      record: {
        ...record,
        data
      }
    });
  };

  handleValidate = async () => {
    const { record, editMode } = this.state;
    const { selected } = this.props;

    const errors = editMode
      ? await validateDataAsync(cleanDeep(record.data || {}), selected.schema)
      : [];

    this.setState({ errors });

    return errors;
  };

  jsonToUint8Array = (json) => {
    const str = JSON.stringify(json, null, 0);
    const ret = new Uint8Array(str.length);

    for (let i = 0; i < str.length; i++) {
      ret[i] = str.charCodeAt(i);
    }

    return ret;
  };

  onSelectKey = async (_, signer, resetPrivateKey) => {
    try {
      const { handleSave } = this.props;
      const { record } = this.state;

      const dataToSign = record?.data;

      const sortedData = this.recursiveSort(dataToSign);

      const uIntArray = this.jsonToUint8Array(sortedData);

      const signature = await signer.execute('SignData', uIntArray, false);

      record.signature = signature;

      handleSave(record);

      this.setState({
        showSigningDialog: false,
        editMode: false
      });
    } catch (e) {
      console.log('signing error', e);
    }

    resetPrivateKey();
  };

  scrollToInvalidField = (errors) => {
    if (!errors) return;

    try {
      const firstError = deepObjectFind(errors, ({ path }) => !!path);

      if (!firstError) return;

      const replacepath = firstError.path.replace(/\./g, '-');

      const firstInvalidField =
        document.getElementById(firstError.path) ||
        document.getElementById(replacepath) ||
        document.querySelector(`input[name=${replacepath}]`);

      if (!firstInvalidField) return;

      const type = firstInvalidField.getAttribute('type');
      const isHidden = type === 'hidden' || firstInvalidField.style.display === 'none';

      if (isHidden) {
        const parent = firstInvalidField.parentNode;
        parent && parent.scrollIntoView({ block: 'center' });
      } else {
        firstInvalidField.scrollIntoView({ block: 'center' });
      }
    } catch {
      console.log('scrollToInvalidField errors', errors);
    }
  };

  handleSave = async () => {
    const { record, editMode } = this.state;
    const { handleSave, selected } = this.props;

    const errors = await this.handleValidate();

    if (errors.length) {
      console.log('saving errors', errors);
      this.scrollToInvalidField(errors);
      return;
    }

    if (editMode && handleSave) {
      if (selected?.keySignature?.validationIdentity) {
        this.setState({
          showSigningDialog: true
        });
        return;
      }

      handleSave(record);
    }

    this.setState({
      editMode: !editMode
    });
  };

  handleDelete = () => {
    const { handleDelete } = this.props;
    handleDelete();
    this.handleCloseConfirmDialog();
    this.handleClose();
  };

  handleRestore = async () => {
    const { t, actions, selectedRecord } = this.props;

    const result = await actions.restoreRecord({
      historyId: selectedRecord.id,
      recordId: selectedRecord.recordId,
      keyId: selectedRecord.keyId
    });

    if (result instanceof Error) {
      actions.addMessage(new Message('FailRestoringRecord', 'error'));
      return;
    }

    actions.addMessage(new Message(t('RestoreRecordSuccess'), 'success'));
    this.handleClose();
  };

  handleOpenConfirmDialog = () => this.setState({ openConfirmDialog: true });

  handleCloseConfirmDialog = () => this.setState({ openConfirmDialog: false });

  componentDidMount = () => {
    const { value: record } = this.props;
    this.setState({ record });
  };

  componentWillReceiveProps = ({ value: record }) => {
    this.setState({ record });
  };

  render = () => {
    const {
      t,
      classes,
      open,
      selected,
      handleDelete,
      handleSave,
      handleClose,
      historyTab,
      selectedRecord,
      value
    } = this.props;
    const {
      record,
      editMode,
      errors,
      showClosePrompt,
      openConfirmDialog,
      showSigningDialog,
      operation
    } = this.state;

    const isCreated = !!(record && record.id);
    const allowDelete = handleDelete && selected.access && selected.access.allowDelete;
    const allowUpdate = handleSave && selected.access && selected.access.allowUpdate && isCreated;
    const allowCreate = handleSave && selected.access && selected.access.allowCreate && !isCreated;
    const allowHistory = selected.access && selected.access.allowHistory;
    const allowRestore =
      selectedRecord?.updatedAt &&
      moment(selectedRecord?.updatedAt).isAfter(moment().subtract(7, 'days'));

    const readOnly = !editMode || !handleSave;

    return (
      <>
        <Dialog
          open={open}
          fullWidth={true}
          classes={{
            paper: classes.dialogPaper
          }}
          onClose={this.handleClose}
        >
          <Toolbar className={classes.toolbar}>
            <Typography variant="h4">
              {operation ? t('Versions') + ': ' + t(operation) : t('EditRecord')}
            </Typography>
            {allowHistory ? (
              <KeyVersionSelect
                record={record}
                classes={classes}
                selectedKey={selected}
                onSelect={(version) => {
                  this.setState({
                    record: version.data,
                    operation: version.operation
                  });
                }}
              />
            ) : null}
          </Toolbar>

          <DialogContent className={classes.dialogContent}>
            <SchemaForm
              errors={errors}
              schema={selected.schema}
              readOnly={readOnly}
              disabled={readOnly}
              isPopup={true}
              value={(record || {}).data}
              keyId={value?.keyId}
              recordId={value?.id}
              outsideEditScreen={true}
              maxWidth={'unset'}
              onChange={handleChangeAdapter((record || {}).data, this.handleChange)}
            />
          </DialogContent>

          <DialogActions
            classes={{
              root: classes.dialogActions
            }}
          >
            {allowDelete ? (
              <Button
                onClick={this.handleOpenConfirmDialog}
                startIcon={<DeleteIcon />}
                className={classes.deleteButton}
              >
                {t('Delete')}
              </Button>
            ) : (
              <div />
            )}
            <div>
              {allowUpdate || allowCreate ? (
                <Button onClick={this.handleSave} variant="contained" startIcon={<EditIcon />}>
                  {editMode ? t('Save') : t('Edit')}
                </Button>
              ) : null}
              {historyTab && allowRestore ? (
                <Button
                  onClick={this.handleRestore}
                  variant="contained"
                  startIcon={<ManageHistoryIcon className={classes.restoreIcon} />}
                >
                  {t('Restore')}
                </Button>
              ) : null}
              <Button
                onClick={this.handleClose}
                className={classes.closeButton}
                startIcon={<CloseIcon />}
              >
                {t('Close')}
              </Button>
            </div>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={openConfirmDialog}
          title={t('DeleteRecordConfirmation')}
          description={t('DeleteRecordConfirmationText')}
          handleClose={this.handleCloseConfirmDialog}
          handleConfirm={this.handleDelete}
        />

        <ConfirmDialog
          title={t('HasUnsavedData')}
          description={t('HasUnsavedDataPrompt')}
          open={showClosePrompt}
          handleClose={() => this.setState({ showClosePrompt: false })}
          handleConfirm={() => this.setState({ editMode: false }, handleClose)}
        />

        <SigningDialog
          open={showSigningDialog}
          onSelectKey={this.onSelectKey}
          onClose={() => {
            this.setState({
              showSigningDialog: false
            });
          }}
          signProgress={0}
          signProgressText={t('Processing')}
        />
      </>
    );
  };
}

RegistryModal.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  selected: PropTypes.object.isRequired,
  selectedRecord: PropTypes.object.isRequired,
  open: PropTypes.bool,
  value: PropTypes.object,
  editMode: PropTypes.bool,
  handleClose: PropTypes.func,
  handleDelete: PropTypes.func,
  handleSave: PropTypes.func
};

RegistryModal.defaultProps = {
  value: {},
  editMode: false,
  handleClose: () => null,
  handleDelete: null,
  handleSave: null,
  open: false
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    restoreRecord: bindActionCreators(restoreRecord, dispatch)
  }
});

const styled = withStyles(styles)(RegistryModal);
const translated = translate('RegistryPage')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

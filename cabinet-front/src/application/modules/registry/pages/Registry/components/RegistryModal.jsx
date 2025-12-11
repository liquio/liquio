import DeletedIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/History';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { Button, Dialog, DialogActions, DialogContent, Toolbar } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import cleanDeep from 'clean-deep';
import deepObjectFind from 'helpers/deepObjectFind';
import diff from 'helpers/diff';
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
import KeyVersionSelect from './KeyVersionSelect';

const styles = () => ({
  dialogContent: {
    overflowX: 'hidden'
  },
  toolbar: {
    padding: '0 4px',
    display: 'flex',
    justifyContent: 'space-between'
  },
  grow: {
    flexGrow: 1
  },
  restoreIcon: {
    marginRight: 10
  },
  btn: {
    '&:focus-visible': {
      outline: '3px solid #0073E6'
    }
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
      showSigningDialog: false
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

  onSelectKey = async (encryptedKey, signer, resetPrivateKey) => {
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

    const cleanEmptyObjectsInArrays = (obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        if (
          obj.every((item) => item && typeof item === 'object' && Object.keys(item).length === 0)
        ) {
          return [];
        } else {
          return obj.map((item) => cleanEmptyObjectsInArrays(item));
        }
      }

      Object.keys(obj).forEach((key) => {
        obj[key] = cleanEmptyObjectsInArrays(obj[key]);
      });

      return obj;
    };

    const filterRecord = cleanEmptyObjectsInArrays(record);

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

      handleSave(filterRecord);
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
      recordId,
      redirectUrl,
      history
    } = this.props;
    const { record, editMode, errors, showClosePrompt, openConfirmDialog, showSigningDialog } =
      this.state;

    const isCreated = !!(record && record.id);
    let allowDelete = handleDelete && selected.access && selected.access.allowDelete;
    let allowUpdate = handleSave && selected.access && selected.access.allowUpdate && isCreated;
    let allowCreate = handleSave && selected.access && selected.access.allowCreate && !isCreated;
    let allowHistory = selected.access && selected.access.allowHistory;
    let allowClose = true;
    if (recordId) {
      allowDelete = false;
      allowUpdate = true;
      allowCreate = false;
      allowHistory = false;
      allowClose = false;
    }

    return (
      <>
        <Dialog
          fullWidth={true}
          maxWidth="lg"
          open={open}
          onClose={allowClose ? this.handleClose : null}
          scroll="body"
        >
          {allowHistory ? (
            <Toolbar className={classes.toolbar}>
              <KeyVersionSelect
                record={record}
                selectedKey={selected}
                onSelect={(version) => {
                  this.setState({
                    record: version.data
                  });
                }}
              />
            </Toolbar>
          ) : null}

          <DialogContent className={classes.dialogContent}>
            <SchemaForm
              errors={errors}
              schema={selected.schema}
              readOnly={!editMode || !handleSave}
              disabled={!editMode || !handleSave}
              isPopup={true}
              value={(record || {}).data}
              outsideEditScreen={true}
              keyId={selected?.id}
              recordId={record?.id}
              onChange={handleChangeAdapter((record || {}).data, this.handleChange)}
            />
          </DialogContent>

          <DialogActions>
            {allowDelete ? (
              <Button
                id="registry-delete"
                onClick={this.handleOpenConfirmDialog}
                className={classes.btn}
              >
                <DeletedIcon />
                {t('Delete')}
              </Button>
            ) : null}
            {allowUpdate || allowCreate ? (
              <Button
                onClick={this.handleSave}
                variant="contained"
                color="primary"
                id="registry-save-btn"
                className={classes.btn}
              >
                {editMode ? <SaveOutlinedIcon /> : <EditIcon />}
                {editMode ? t('Save') : t('Edit')}
              </Button>
            ) : null}
            {historyTab ? (
              <Button
                onClick={this.handleRestore}
                disabled={
                  record?.updated_at
                    ? moment(record?.updated_at).isBefore(moment().subtract(1, 'week'))
                    : false
                }
                variant="contained"
                color="primary"
              >
                <HistoryIcon className={classes.restoreIcon} />
                {t('Restore')}
              </Button>
            ) : null}
            {allowClose ? (
              <Button
                onClick={this.handleClose}
                color="primary"
                id="registry-close-btn"
                className={classes.btn}
              >
                {t('Close')}
              </Button>
            ) : null}
            {redirectUrl && !editMode ? (
              <Button
                onClick={() => history.push(redirectUrl)}
                variant="contained"
                color="primary"
                id="registry-close-btn"
              >
                {t('Done')}
              </Button>
            ) : null}
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
  handleSave: PropTypes.func,
  recordId: PropTypes.bool
};

RegistryModal.defaultProps = {
  value: {},
  editMode: false,
  handleClose: () => null,
  handleDelete: null,
  handleSave: null,
  open: false,
  recordId: false
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

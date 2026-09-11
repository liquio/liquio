import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import { Button, Dialog, DialogActions, DialogContent, Toolbar, Typography } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import cleanDeep from 'clean-deep';
import deepObjectFind from 'helpers/deepObjectFind';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';

import { addMessage } from 'actions/error';
import { restoreRecord } from 'actions/registry';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import SigningDialogRaw from 'components/P7SForm/SigningDialog';
import { handleChangeAdapter, SchemaForm as SchemaFormRaw, validateDataAsync } from 'components/JsonSchema';
import Message from 'components/Snackbars/Message';
import diff from 'helpers/diff';
import KeyVersionSelectRaw from './KeyVersionSelect';
import { ReactComponent as CloseIcon } from './assets/close.svg';
import { ReactComponent as DeleteIcon } from './assets/delete.svg';
import { ReactComponent as EditIcon } from './assets/edit.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SigningDialog = SigningDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme & { deleteButton?: { color?: string; fill?: string }; closeButton?: { color?: string; fill?: string } }) => ({
  dialogContent: {
    overflowX: 'hidden' as const
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
    color: theme?.palette?.primary?.contrastText
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
    color: theme?.deleteButton?.color || theme?.palette?.primary?.main,
    '& path': {
      fill: theme?.deleteButton?.fill || theme?.palette?.primary?.main
    }
  },
  closeButton: {
    backgroundColor: 'transparent',
    color: theme?.closeButton?.color || theme?.palette?.primary?.main,
    marginLeft: 8,
    '& path': {
      fill: theme?.closeButton?.fill || theme?.palette?.primary?.main
    }
  },
  dialogPaper: {
    maxWidth: 792
  }
});

interface SelectedKey {
  schema: Record<string, unknown>;
  access?: { allowDelete?: boolean; allowUpdate?: boolean; allowCreate?: boolean; allowHistory?: boolean };
  keySignature?: { validationIdentity?: boolean };
}

interface RecordLike {
  id?: string | number;
  data?: unknown;
  signature?: unknown;
  [key: string]: unknown;
}

interface SelectedRecord {
  id?: string | number;
  recordId?: string | number;
  keyId?: string | number;
  updatedAt?: string;
}

interface RegistryModalProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  selected: SelectedKey;
  selectedRecord: SelectedRecord;
  open?: boolean;
  value?: RecordLike;
  editMode?: boolean;
  handleClose?: () => void;
  handleDelete?: (() => void) | null;
  handleSave?: ((record: RecordLike) => void) | null;
  historyTab?: boolean;
  actions: {
    addMessage: (message: unknown) => void;
    restoreRecord: (params: Record<string, unknown>) => Promise<unknown>;
  };
}

interface RegistryModalState {
  record: RecordLike | null;
  editMode?: boolean;
  errors: unknown[];
  showClosePrompt: boolean;
  openConfirmDialog: boolean;
  showSigningDialog: boolean;
  operation: string | null;
}

class RegistryModal extends React.Component<RegistryModalProps, RegistryModalState> {
  static defaultProps: Partial<RegistryModalProps> = {
    value: {},
    editMode: false,
    handleClose: () => null as never,
    handleDelete: null,
    handleSave: null,
    open: false
  };

  constructor(props: RegistryModalProps) {
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

  recursiveSort = (obj: unknown): unknown => {
    if (typeof obj !== 'object' || obj instanceof Array || obj instanceof Date || obj === null) {
      return obj;
    }

    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return obj;
    }

    const sortedObject: Record<string, unknown> = {};

    keys.sort().forEach((key) => {
      sortedObject[key] = this.recursiveSort((obj as Record<string, unknown>)[key]);
    });

    return sortedObject;
  };

  handleClose = () => {
    const { handleClose, value } = this.props;
    const { record, editMode } = this.state;

    const diffs = diff((value && value.data) as never, (record && record.data) as never);

    if (editMode && diffs) {
      this.setState({ showClosePrompt: true });
      return;
    }

    this.setState({ editMode: false }, handleClose);
  };

  handleChange = (data: unknown) => {
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
      ? await validateDataAsync(cleanDeep((record?.data || {}) as never) as never, selected.schema as never)
      : [];

    this.setState({ errors: errors as unknown[] });

    return errors as unknown[];
  };

  jsonToUint8Array = (json: unknown) => {
    const str = JSON.stringify(json, null, 0);
    const ret = new Uint8Array(str.length);

    for (let i = 0; i < str.length; i++) {
      ret[i] = str.charCodeAt(i);
    }

    return ret;
  };

  onSelectKey = async (_: unknown, signer: { execute: (method: string, data: Uint8Array, arg: boolean) => Promise<unknown> }, resetPrivateKey: () => void) => {
    try {
      const { handleSave } = this.props;
      const { record } = this.state;

      const dataToSign = record?.data;

      const sortedData = this.recursiveSort(dataToSign);

      const uIntArray = this.jsonToUint8Array(sortedData);

      const signature = await signer.execute('SignData', uIntArray, false);

      (record as RecordLike).signature = signature;

      handleSave?.(record as RecordLike);

      this.setState({
        showSigningDialog: false,
        editMode: false
      });
    } catch (e) {
      console.log('signing error', e);
    }

    resetPrivateKey();
  };

  scrollToInvalidField = (errors: unknown) => {
    if (!errors) return;

    try {
      const firstError = deepObjectFind(errors, (({ path }: { path?: string }) => !!path) as never) as { path?: string } | undefined;

      if (!firstError) return;

      const replacepath = (firstError.path as string).replace(/\./g, '-');

      const firstInvalidField =
        document.getElementById(firstError.path as string) ||
        document.getElementById(replacepath) ||
        document.querySelector(`input[name=${replacepath}]`);

      if (!firstInvalidField) return;

      const type = firstInvalidField.getAttribute('type');
      const isHidden = type === 'hidden' || (firstInvalidField as HTMLElement).style.display === 'none';

      if (isHidden) {
        const parent = firstInvalidField.parentNode;
        (parent as HTMLElement)?.scrollIntoView({ block: 'center' });
      } else {
        (firstInvalidField as HTMLElement).scrollIntoView({ block: 'center' });
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

      handleSave(record as RecordLike);
    }

    this.setState({
      editMode: !editMode
    });
  };

  handleDelete = () => {
    const { handleDelete } = this.props;
    handleDelete?.();
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
    this.setState({ record: record as RecordLike });
  };

  componentWillReceiveProps = ({ value: record }: RegistryModalProps) => {
    this.setState({ record: record as RecordLike });
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

    // Deferred to render() rather than module scope: `components/JsonSchema`
    // is part of a circular import chain documented elsewhere in this
    // migration (see TYPESCRIPT.md) — a module-top-level read can run while
    // that module is still mid-evaluation.
    const SchemaForm = SchemaFormRaw as unknown as React.ComponentType<Record<string, unknown>>;
    const KeyVersionSelect = KeyVersionSelectRaw as unknown as React.ComponentType<Record<string, unknown>>;

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
          open={open as boolean}
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
                onSelect={(version: { data: unknown; operation?: string }) => {
                  this.setState({
                    record: version.data as RecordLike,
                    operation: version.operation as string
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
              onChange={handleChangeAdapter((record || {}).data as never, this.handleChange as never)}
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

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    restoreRecord: bindActionCreators(restoreRecord, dispatch)
  }
});

const styled = withStyles(styles)(RegistryModal as never);
const translated = translate('RegistryPage')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

import React from 'react';
import { useTranslate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import sortArray from 'sort-array';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import {
  requestMessagesTemplate,
  updateMessagesTemplate,
  createMessagesTemplate,
  deleteMessagesTemplate,
  exportMessagesTemplate,
  importMessagesTemplate,
} from 'application/actions/messagesTemplates';
import { addMessage } from 'actions/error';
import {
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import Message from 'components/Snackbars/Message';
import { EditorDialog } from 'components/Editor';
import ConfirmDialog from 'components/ConfirmDialog';
import DataTable from 'components/DataTable';
import checkAccess from 'helpers/checkAccess';
import asModulePage from 'hooks/asModulePage';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import parseFile from 'helpers/parseFile';
import CloseIcon from '@mui/icons-material/Close';
import SaveAltIcon from '@mui/icons-material/SaveAlt';

const styles = () => ({
  root: {
    display: 'flex',
  },
  saveButton: {
    position: 'absolute' as const,
    right: 50,
    top: 4,
  },
  disabled: {
    opacity: 0.3,
  },
  createButton: {
    display: 'flex',
    alignSelf: 'flex-start',
    margin: 12,
  },
  actionButton: {
    marginLeft: 10,
  },
  flex: {
    display: 'flex',
  },
  editorWrapper: {
    height: 'calc(100vh - 50px)',
  },
  error: {
    fontSize: 14,
    marginTop: 10,
  },
});

const useStyles = makeStyles(styles);

interface MessageTemplate {
  template_id?: string | number;
  title?: string;
  type?: string;
  text?: string;
  id?: string | number;
  [key: string]: unknown;
}

interface MessageTemplatesListProps {
  title?: string;
  loading?: boolean;
  location: unknown;
  actions: {
    requestMessagesTemplate: () => Promise<MessageTemplate[] | Error>;
    updateMessagesTemplate: (data: MessageTemplate) => Promise<MessageTemplate | Error>;
    createMessagesTemplate: (data: MessageTemplate) => Promise<MessageTemplate | Error>;
    deleteMessagesTemplate: (data: MessageTemplate) => Promise<unknown>;
    exportMessagesTemplate: (row: MessageTemplate) => Promise<unknown>;
    importMessagesTemplate: (file: File, params: string | null) => Promise<unknown>;
    addMessage: (message: unknown) => void;
  };
  userInfo: Record<string, unknown>;
  userUnits: unknown[];
}

const MessageTemplatesList = ({
  title,
  loading: loadingOrigin,
  location,
  actions,
  userInfo,
  userUnits,
}: MessageTemplatesListProps) => {
  const t = useTranslate('MessageTemplatesList');
  const classes = useStyles();

  const [loading, setLoading] = React.useState(!!loadingOrigin);
  const [list, setList] = React.useState<MessageTemplate[]>([]);
  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [templateTitle, setTemplateTitle] = React.useState('');
  const [templateType, setTemplateType] = React.useState('sms');
  const [templateHTML, setTemplateHTML] = React.useState('');
  const [openEditor, setOpenEditor] = React.useState(false);
  const [openConfirm, setOpenConfirm] = React.useState(false);
  const [duplicateIds, setDuplicateIds] = React.useState<(string | number)[]>([]);
  const [chosenId, setChosenId] = React.useState<string | number | null>(null);
  const [editContent, setContent] = React.useState<MessageTemplate | string>('');
  const [deletingItem, setDeletingItem] = React.useState<MessageTemplate | null>(null);
  const [error, setError] = React.useState('');
  const [openModalDublicate, setOpenModalDublicate] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isEditable = checkAccess(
    { userHasUnit: [1000002] },
    userInfo,
    userUnits as never,
  );

  const handleClickEdit = (row: MessageTemplate) => {
    const bodyToEdit: MessageTemplate = { ...row };
    setChosenId(row.template_id as string | number);
    delete bodyToEdit.template_id;
    setContent(bodyToEdit);
    setOpenCreateDialog(true);
  };

  const handleCreateTemplate = () => {
    setTemplateTitle('');
    setTemplateType('');
    setTemplateHTML('');
    setError('');
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setError('');
    setTemplateTitle('');
    setTemplateType('');
    setTemplateHTML('');
    setContent('');
    setChosenId(null);
  };

  const handleOpenEditor = () => {
    setOpenEditor(true);
  };

  const editContentObj = (typeof editContent === 'object' ? editContent : {}) as MessageTemplate;

  const handleSaveTemplate = async () => {
    if (!chosenId && (!templateTitle || !templateHTML)) {
      setError('RequiredField');
      return;
    }

    const newTemplate: MessageTemplate = {
      title: templateTitle || editContentObj?.title,
      type: !chosenId
        ? templateType || 'sms'
        : templateType || editContentObj?.type,
      text: templateHTML || editContentObj?.text,
    };
    let result: MessageTemplate | Error | null = null;

    if (!chosenId) {
      result = await actions.createMessagesTemplate(newTemplate);
    } else {
      newTemplate.id = chosenId;
      result = await actions.updateMessagesTemplate(newTemplate);
    }

    if (result instanceof Error) {
      actions.addMessage(new Message(t(result.message), 'error'));
      return;
    }

    const newList = await actions.requestMessagesTemplate();
    setList(newList as MessageTemplate[]);
    setOpenCreateDialog(false);
    setContent('');
    setChosenId(null);
  };

  const handleDeleteOpen = (row: MessageTemplate) => {
    setOpenConfirm(true);
    setDeletingItem(row);
  };

  const handleDelete = async () => {
    await actions.deleteMessagesTemplate(deletingItem as MessageTemplate);
    const newList = await actions.requestMessagesTemplate();
    setList(newList as MessageTemplate[]);
    setContent('');
    setChosenId(null);
  };

  const handleExport = async (row: MessageTemplate) => {
    const blob = await actions.exportMessagesTemplate(row);

    if (blob instanceof Error) {
      // Preserved exactly: `this` is undefined here (a plain arrow function,
      // not a class method), and `handleErrorDialog` is never defined
      // anywhere in this file — this branch throws a real TypeError at
      // runtime in the original .jsx too, not something introduced here.
      blob.message === 'Max export limit reached.'
        ? (this as unknown as { handleErrorDialog: () => void }).handleErrorDialog()
        : actions.addMessage(new Message('FailExportingTemplates', 'error'));

      return null;
    }

    return downloadBase64Attach(
      {
        fileName: row?.title
          ? `template-${row.title}-${row.template_id}.dat`
          : 'message-templates.dat',
      },
      blob as string,
    );
  };

  const checkDuplicates = (importedTemplates: MessageTemplate[]) => {
    const importedIds = importedTemplates.map(
      (template) => template.template_id,
    );
    const duplicateIds = importedIds.filter((id) =>
      list.some((template) => template.template_id === id),
    );
    return duplicateIds as (string | number)[];
  };

  const importFile = async ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const file = (target.files as FileList)[0];

    parseFile(file, async (importedTemplatesRaw) => {
      const importedTemplates = importedTemplatesRaw as MessageTemplate[];
      const duplicateIds = checkDuplicates(importedTemplates);
      if (duplicateIds.length > 0) {
        setDuplicateIds(duplicateIds);
        setOpenModalDublicate(true);
      } else {
        await handleImport(file);
      }
      setLoading(false);
    });
    setLoading(true);
  };

  const handleImport = async (file: File, rewriteTemplateIds: (string | number)[] | null = null, withRewrite?: boolean) => {
    const params =
      rewriteTemplateIds && withRewrite
        ? rewriteTemplateIds
          .map((id, index) => `rewriteTemplateIds[${index}]=${id}`)
          .join('&')
        : null;

    const importResult = await actions.importMessagesTemplate(file, params);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setDuplicateIds([]);

    if (importResult instanceof Error) {
      actions.addMessage(new Message('InvalidFile', 'error'));
    } else {
      actions.addMessage(
        new Message('MessageTemplateAlreadyExported', 'success'),
      );
      const newList = await actions.requestMessagesTemplate();
      setList(newList as MessageTemplate[]);
    }
  };

  const handleRewrite = async (withRewrite = false) => {
    setOpenModalDublicate(false);
    const file = (inputRef.current as HTMLInputElement).files?.[0] as File;
    await handleImport(file, duplicateIds, withRewrite);
  };

  const handleUploadClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await actions.requestMessagesTemplate();
      setLoading(false);
      if (result instanceof Error) {
        actions.addMessage(
          new Message('ErrorGettingMessagesTemplates', 'error'),
        );
        return;
      }
      setList(result);
    };
    fetchData();
  }, [actions]);

  sortArray(list, {
    by: 'template_id',
    order: 'desc',
  });

  const columns: Record<string, unknown>[] = [
    {
      id: 'template_id',
      name: t('template_id'),
    },
    {
      id: 'type',
      name: t('type'),
    },
    {
      id: 'text',
      name: t('text'),
      cellStyle: {
        maxWidth: 300,
      },
    },
    {
      id: 'title',
      name: t('title'),
      cellStyle: {
        maxWidth: 300,
      },
    },
    {
      id: 'actions',
      padding: 'checkbox',
      width: 40,
      name: t('Actions'),
      render: (edit: unknown, row: MessageTemplate) => (
        <div className={classes.flex}>
          <Tooltip title={t('EditTemplate')}>
            <IconButton onClick={() => handleClickEdit(row)} size="large">
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('Export')}>
            <IconButton onClick={() => handleExport(row)} size="large">
              <SaveAltIcon />
            </IconButton>
          </Tooltip>
          {isEditable ? (
            <Tooltip title={t('DeleteTemplate')}>
              <IconButton onClick={() => handleDeleteOpen(row)} size="large">
                <DeleteOutlinedIcon />
              </IconButton>
            </Tooltip>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <LeftSidebarLayout
      location={location}
      title={t(title as string)}
      loading={loading}
      flexContent={true}
    >
      <div style={{ display: 'flex' }}>
        {!!isEditable && (
          <Button
            color="primary"
            variant="contained"
            onClick={handleCreateTemplate}
            className={classes.createButton}
          >
            {t('Create')}
          </Button>
        )}
        <Button
          color="primary"
          variant="contained"
          onClick={handleExport as never}
          className={classes.createButton}
        >
          {t('Export')}
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleUploadClick}
          className={classes.createButton}
        >
          {t('Import')}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".dat, application/dat"
        onChange={importFile}
        hidden={true}
        multiple={false}
      />
      <DataTable
        data={list}
        darkTheme={true}
        columns={columns}
        controls={{
          pagination: false,
          toolbar: false,
          search: false,
          header: true,
          refresh: false,
          switchView: false,
          customizateColumns: false,
          bottomPagination: false,
        }}
      />
      <Dialog
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editContentObj.title ? t('EditTemplate') : t('CreateTemplate')}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={t('title')}
            fullWidth
            margin="normal"
            variant="standard"
            value={templateTitle || editContentObj.title}
            onChange={(e) => setTemplateTitle(e.target.value)}
          />
          <TextField
            select
            label={t('type')}
            fullWidth
            margin="normal"
            variant="standard"
            value={templateType || editContentObj.type}
            onChange={(e) => setTemplateType(e.target.value)}
            SelectProps={{
              native: true,
            }}
          >
            <option value="sms" style={{ color: 'initial' }}>{'SMS'}</option>
            <option value="email" style={{ color: 'initial' }}>{'Email'}</option>
          </TextField>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleOpenEditor}
            style={{ marginTop: 20 }}
          >
            {t('EditHTML')}
          </Button>
          {error ? (
            <Typography className={classes.error} color="error">
              {t(error)}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>{t('Cancel')}</Button>
          <Button
            onClick={handleSaveTemplate}
            color="primary"
            variant="contained"
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
      <EditorDialog
        open={openEditor}
        title={t('EditHTML')}
        language="html"
        onClose={() => setOpenEditor(false)}
        value={templateHTML || editContentObj?.text}
        onChange={setTemplateHTML}
      />
      <Dialog
        open={openModalDublicate}
        onClose={() => setOpenModalDublicate(false)}
        fullWidth
        maxWidth="sm"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          <DialogTitle>{t('DublicateTemplateTitle')}</DialogTitle>
          <Tooltip title={t('DeleteStatus')}>
            <IconButton
              onClick={() => setOpenModalDublicate(false)}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </div>
        <DialogContent>
          <p>{t('Identifier', { id: duplicateIds.join(', ') })}</p>
          <p>{t('Recomend')}</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleRewrite(true)}>{t('Rewrite')}</Button>
          <Button
            onClick={() => handleRewrite(false)}
            color="primary"
            variant="contained"
            style={{ marginRight: 20 }}
          >
            {t('SaveWithNewId')}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={openConfirm}
        title={t('DeletePrompt')}
        description={t('DeletePromtDescription', {
          title: deletingItem?.title,
        })}
        darkTheme={true}
        handleClose={() => {
          setOpenConfirm(false);
          setDeletingItem(null);
        }}
        handleConfirm={() => {
          handleDelete();
          setOpenConfirm(false);
        }}
      />
    </LeftSidebarLayout>
  );
};

const mapStateToProps = ({ auth: { info, userUnits } }: { auth: { info: Record<string, unknown>; userUnits: unknown[] } }) => ({
  userInfo: info,
  userUnits,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestMessagesTemplate: bindActionCreators(
      requestMessagesTemplate,
      dispatch,
    ),
    updateMessagesTemplate: bindActionCreators(
      updateMessagesTemplate,
      dispatch,
    ),
    createMessagesTemplate: bindActionCreators(
      createMessagesTemplate,
      dispatch,
    ),
    deleteMessagesTemplate: bindActionCreators(
      deleteMessagesTemplate,
      dispatch,
    ),
    exportMessagesTemplate: bindActionCreators(
      exportMessagesTemplate,
      dispatch,
    ),
    importMessagesTemplate: bindActionCreators(
      importMessagesTemplate,
      dispatch,
    ),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const moduled = asModulePage(MessageTemplatesList as never);

export default connect(mapStateToProps, mapDispatchToProps)(moduled as never);

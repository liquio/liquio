import React from 'react';
import { useTranslate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
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
    position: 'absolute',
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

const MessageTemplatesList = ({
  title,
  loading: loadingOrigin,
  location,
  actions,
  userInfo,
  userUnits,
}) => {
  const t = useTranslate('MessageTemplatesList');
  const classes = useStyles();

  const [loading, setLoading] = React.useState(loadingOrigin);
  const [list, setList] = React.useState([]);
  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [templateTitle, setTemplateTitle] = React.useState('');
  const [templateType, setTemplateType] = React.useState('sms');
  const [templateHTML, setTemplateHTML] = React.useState('');
  const [openEditor, setOpenEditor] = React.useState(false);
  const [openConfirm, setOpenConfirm] = React.useState(false);
  const [duplicateIds, setDuplicateIds] = React.useState([]);
  const [chosenId, setChosenId] = React.useState(null);
  const [editContent, setContent] = React.useState('');
  const [deletingItem, setDeletingItem] = React.useState(null);
  const [error, setError] = React.useState('');
  const [openModalDublicate, setOpenModalDublicate] = React.useState(false);
  const inputRef = React.useRef(null);

  const isEditable = checkAccess(
    { userHasUnit: [1000002] },
    userInfo,
    userUnits,
  );

  const handleClickEdit = (row) => {
    const bodyToEdit = { ...row };
    setChosenId(row.template_id);
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

  const handleSaveTemplate = async () => {
    if (!chosenId && (!templateTitle || !templateHTML)) {
      setError('RequiredField');
      return;
    }

    const newTemplate = {
      title: templateTitle || editContent?.title,
      type: !chosenId
        ? templateType || 'sms'
        : templateType || editContent?.type,
      text: templateHTML || editContent?.text,
    };
    let result = null;

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
    setList(newList);
    setOpenCreateDialog(false);
    setContent('');
    setChosenId(null);
  };

  const handleDeleteOpen = (row) => {
    setOpenConfirm(true);
    setDeletingItem(row);
  };

  const handleDelete = async () => {
    await actions.deleteMessagesTemplate(deletingItem);
    const newList = await actions.requestMessagesTemplate();
    setList(newList);
    setContent('');
    setChosenId(null);
  };

  const handleExport = async (row) => {
    const blob = await actions.exportMessagesTemplate(row);

    if (blob instanceof Error) {
      blob.message === 'Max export limit reached.'
        ? this.handleErrorDialog()
        : actions.addMessage(new Message('FailExportingTemplates', 'error'));

      return null;
    }

    return downloadBase64Attach(
      {
        fileName: row?.title
          ? `template-${row.title}-${row.template_id}.dat`
          : 'message-templates.dat',
      },
      blob,
    );
  };

  const checkDuplicates = (importedTemplates) => {
    const importedIds = importedTemplates.map(
      (template) => template.template_id,
    );
    const duplicateIds = importedIds.filter((id) =>
      list.some((template) => template.template_id === id),
    );
    return duplicateIds;
  };

  const importFile = async ({ target }) => {
    const file = target.files[0];

    parseFile(file, async (importedTemplates) => {
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

  const handleImport = async (file, rewriteTemplateIds = null, withRewrite) => {
    const params =
      rewriteTemplateIds && withRewrite
        ? rewriteTemplateIds
          .map((id, index) => `rewriteTemplateIds[${index}]=${id}`)
          .join('&')
        : null;

    const importResult = await actions.importMessagesTemplate(file, params);
    if (inputRef.current) {
      inputRef.current.value = null;
    }
    setDuplicateIds([]);

    if (importResult instanceof Error) {
      actions.addMessage(new Message('InvalidFile', 'error'));
    } else {
      actions.addMessage(
        new Message('NumberTemplateAlreadyExported', 'success'),
      );
      const newList = await actions.requestMessagesTemplate();
      setList(newList);
    }
  };

  const handleRewrite = async (withRewrite = false) => {
    setOpenModalDublicate(false);
    const file = inputRef.current.files[0];
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

  const columns = [
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
      render: (edit, row) => (
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
      title={t(title)}
      loading={loading}
      flexContent={true}
    >
      <div style={{ display: 'flex' }}>
        {isEditable && (
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
          onClick={handleExport}
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
          {editContent.title ? t('EditTemplate') : t('CreateTemplate')}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={t('title')}
            fullWidth
            margin="normal"
            variant="standard"
            value={templateTitle || editContent.title}
            onChange={(e) => setTemplateTitle(e.target.value)}
          />
          <TextField
            select
            label={t('type')}
            fullWidth
            margin="normal"
            variant="standard"
            value={templateType || editContent.type}
            onChange={(e) => setTemplateType(e.target.value)}
            SelectProps={{
              native: true,
            }}
          >
            <option value="sms">{'SMS'}</option>
            <option value="email">{'Email'}</option>
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
        value={templateHTML || editContent?.text}
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

const mapStateToProps = ({ auth: { info, userUnits } }) => ({
  userInfo: info,
  userUnits,
});

const mapDispatchToProps = (dispatch) => ({
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

const moduled = asModulePage(MessageTemplatesList);

export default connect(mapStateToProps, mapDispatchToProps)(moduled);

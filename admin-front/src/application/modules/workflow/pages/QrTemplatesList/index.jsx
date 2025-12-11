import React from 'react';
import sortArray from 'sort-array';

import { useTranslate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  requestQrTemplates,
  requestQrTemplate,
  createQrTemplate,
  updateQrTemplate,
  deleteQrTemplate,
} from 'application/actions/qrTemplates';

import { addMessage } from 'actions/error';
import LeftSidebarLayout from 'layouts/LeftSidebar';

import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  IconButton,
  Tooltip,
  Button,
  TextField,
  FormHelperText,
} from '@mui/material';

import { makeStyles } from '@mui/styles';
import withStyles from '@mui/styles/withStyles';

import EditIcon from '@mui/icons-material/Edit';
import HtmlIcon from '@mui/icons-material/Html';
import jsonIcon from 'assets/icons/jsonFiolet.svg';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

import DataTable from 'components/DataTable';
import { EditorDialog } from 'components/Editor';
import Message from 'components/Snackbars/Message';
import ConfirmDialog from 'components/ConfirmDialog';

import checkAccess from 'helpers/checkAccess';
import asModulePage from 'hooks/asModulePage';

export const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    marginRight: 23,
    '&:hover': {
      background: theme.listHover,
    },
    '& svg': {
      fill: theme.buttonBg,
      marginRight: 10,
    },
    '& img': {
      marginRight: 10,
    },
  },
}))(Button);

const defaultTemplate = {
  name: 'register',
  method: '',
  html: '<html></html>',
  pdf: '<html></html>',
  jsonMap: '{}',
  options: null,
};

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
});

const useStyles = makeStyles(styles);

const QrTemplatesList = ({
  title,
  location,
  actions,
  userInfo,
  userUnits,
}) => {
  const t = useTranslate('QrTemplatesList');
  const classes = useStyles();

  const [loading, setLoading] = React.useState(false);

  const [list, setList] = React.useState([]);
  const [isRequired, setIsRequired] = React.useState(false);
  const [mode, setMode] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [template, setTemplate] = React.useState(defaultTemplate);
  const [openEditor, setOpenEditor] = React.useState(false);
  const [openConfirm, setOpenConfirm] = React.useState(false);
  const [params, setParams] = React.useState('');
  const [chosenId, setChosenId] = React.useState(null);
  const [deletingItem, setDeletingItem] = React.useState(null);

  const readOnly = checkAccess(
    { userHasUnit: [1000000042] },
    userInfo,
    userUnits,
  );

  const handleClickEdit = async (row) => {
    setChosenId(row.id);
    const result = await actions.requestQrTemplate(row.id);
    setTemplate({
      ...result,
      jsonMap: JSON.stringify(result.jsonMap, null, 4),
    });
    setOpen(true);
  };

  const editJson = () => {
    setMode('json');
    setParams('jsonMap');
    setOpenEditor(true);
  };

  const editHtml = () => {
    setMode('html');
    setParams('html');
    setOpenEditor(true);
  };

  const editPdf = () => {
    setMode('html');
    setParams('pdf');
    setOpenEditor(true);
  };

  const handleDeleteOpen = (row) => {
    setOpenConfirm(true);
    setDeletingItem(row);
  };

  const handleDelete = async () => {
    await actions.deleteQrTemplate(deletingItem.id, template);

    const newList = await actions.requestQrTemplates();

    setList(newList);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setTemplate(defaultTemplate);
    setIsRequired(false);
    setChosenId(null);
  };

  const handleSave = async () => {
    let result = null;

    if (!chosenId) {
      result = await actions.createQrTemplate({
        ...template,
        jsonMap: JSON.parse(template.jsonMap),
      });
    } else {
      result = await actions.updateQrTemplate(chosenId, {
        ...template,
        jsonMap: JSON.parse(template.jsonMap),
      });
    }

    if (result instanceof Error) {
      actions.addMessage(new Message(t(result.message), 'error'));
      return;
    }

    setChosenId(result.id);

    const newList = await actions.requestQrTemplates();

    setList(newList);
  };

  const saveTemplate = async () => {
    if (!template?.method || template?.method === '') {
      setIsRequired(true);
      return null;
    }

    await handleSave();

    handleCloseDialog();
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const result = await actions.requestQrTemplates();

      setLoading(false);

      if (result instanceof Error) {
        actions.addMessage(new Message('ErrorGettingQRTemplates', 'error'));
        return;
      }

      setList(result);
    };

    fetchData();
  }, [actions]);

  sortArray(list, {
    by: 'id',
    order: 'desc',
  });

  const columns = [
    {
      id: 'id',
      name: t('template_id'),
    },
    {
      id: 'name',
      name: t('type'),
    },
    {
      id: 'method',
      name: t('method'),
    },
  ];

  if (!readOnly) {
    columns.push({
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
          <Tooltip title={t('DeleteTemplate')}>
            <IconButton
              onClick={() => handleDeleteOpen(row)}
              className={classes.actionButton}
              size="large"
            >
              <DeleteOutlinedIcon />
            </IconButton>
          </Tooltip>
        </div>
      ),
    });
  }

  return (
    <LeftSidebarLayout
      location={location}
      title={t(title)}
      loading={loading}
      flexContent={true}
    >
      {readOnly ? null : (
        <Button
          color="primary"
          variant="contained"
          onClick={() => setOpen(true)}
          className={classes.createButton}
        >
          {t('Create')}
        </Button>
      )}
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
        open={open}
        onClose={handleCloseDialog}
        scroll="body"
        fullWidth={true}
        maxWidth={'sm'}
      >
        <DialogTitle>{t('QrExcerptSettings')}</DialogTitle>
        <DialogContent>
          <>
            <TextField
              variant="standard"
              value={template.method}
              autoFocus={true}
              label={t('method')}
              onChange={({ target: { value } }) =>
                setTemplate({ ...template, method: value })
              }
            />
            {isRequired ? (
              <FormHelperText error={true}>
                {t('MethodIsRequired')}
              </FormHelperText>
            ) : null}
            <div style={{ marginTop: 35 }}>
              <ColorButton
                variant="contained"
                color="primary"
                onClick={() => editJson()}
              >
                {<img src={jsonIcon} alt={'json icon'} />}
                {t('MapppingFields')}
              </ColorButton>
              <ColorButton
                variant="contained"
                color="primary"
                onClick={() => editHtml()}
              >
                <HtmlIcon />
                {t('Template')}
              </ColorButton>
              <ColorButton
                variant="contained"
                color="primary"
                onClick={() => editPdf()}
              >
                <PictureAsPdfIcon />
                {t('Template')}
              </ColorButton>
            </div>
          </>
        </DialogContent>
        <DialogActions>
          <div style={{ flexGrow: 1 }} />
          <Button onClick={() => handleCloseDialog()}>{t('Cancel')}</Button>
          <Button variant="contained" color="primary" onClick={saveTemplate}>
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
      <EditorDialog
        open={openEditor}
        language={mode}
        title={t('EditTemplate')}
        onClose={() => setOpenEditor(false)}
        value={template[params]}
        handleSave={handleSave}
        onChange={(value) => setTemplate({ ...template, [params]: value })}
        readOnly={readOnly}
      />
      <ConfirmDialog
        open={openConfirm}
        title={t('DeletePrompt')}
        description={t('DeletePromtDescription', {
          title: deletingItem?.method,
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
    requestQrTemplates: bindActionCreators(requestQrTemplates, dispatch),
    requestQrTemplate: bindActionCreators(requestQrTemplate, dispatch),
    updateQrTemplate: bindActionCreators(updateQrTemplate, dispatch),
    createQrTemplate: bindActionCreators(createQrTemplate, dispatch),
    deleteQrTemplate: bindActionCreators(deleteQrTemplate, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const moduled = asModulePage(QrTemplatesList);

export default connect(mapStateToProps, mapDispatchToProps)(moduled);

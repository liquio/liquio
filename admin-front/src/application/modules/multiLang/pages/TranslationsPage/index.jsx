import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { makeStyles } from '@mui/styles';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  IconButton,
  Tooltip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from '@mui/material';
import ExplicitIcon from '@mui/icons-material/Explicit';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import LanguageIcon from '@mui/icons-material/Language';
import { SchemaForm, handleChangeAdapter, validateData } from 'components/JsonSchema';
import ProgressLine from 'components/Preloader/ProgressLine';
import ConfirmDialog from 'components/ConfirmDialog';
import DataTable from 'components/DataTable';
import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import asModulePage from 'hooks/asModulePage';
import useTable from 'services/dataTable/useTable';
import {
  getLanguages,
  createLanguage,
  deleteLanguage,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  exportLanguages,
  exportTexts,
  importLanguages,
  importTexts,
  searchLocalization
} from 'actions/multiLang';
import { addError, addMessage } from 'actions/error';
import DownloadIcon from 'assets/icons/gg_import.svg';
import ExportIcon from 'assets/icons/gg_export.svg';
import withStyles from '@mui/styles/withStyles';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import Message from 'components/Snackbars/Message';
import awaitDelay from 'helpers/awaitDelay';

const useStyles = makeStyles((theme) => ({
  root: {
    paddingTop: 20
  },
  lanCode: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 10,
    marginTop: 20
  },
  langsList: {
    marginBottom: 20
  },
  checkbox: {
    '& svg': {
      fill: theme.palette.primary.main
    }
  },
  addActions: {
    marginTop: 10,
    display: 'flex',
    justifyContent: 'flex-end',
    '& button': {
      margin: 0
    }
  },
  dialogActions: {
    marginRight: 10
  }
}));

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
      fill: theme.buttonBg
    },
    '& img': {
      fill: theme.buttonBg
    }
  }
}))(Button);

const TranslationsPage = ({ loading: loadingProp, location, title }) => {
  const t = useTranslate('TranslationsPage');
  const [open, setOpen] = React.useState(false);
  const [errors, setErrors] = React.useState([]);
  const [langCodes, setLangCodes] = React.useState([]);
  const [langCode, setLangCode] = React.useState({});
  const [deleting, setDeleting] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [openRecord, setOpenRecord] = React.useState(false);
  const [exportDialog, setExportDialog] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [chosenCodes, setChosenCodes] = React.useState([]);
  const [record, setRecord] = React.useState({});
  const [opening, setOpening] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [recordValue, setRecordValue] = React.useState([]);

  const languagesRef = React.useRef();
  const textsRef = React.useRef();

  const dispatch = useDispatch();

  const classes = useStyles();

  const tableProps = useTable({
    dataURL: 'localization-texts-by-keys',
    sourceName: 'localizationTexts',
    autoLoad: true,
    searchFilterField: 'key'
  });

  const schemaLangCode = React.useMemo(
    () => ({
      type: 'object',
      properties: {
        langCode: {
          type: 'string',
          darkTheme: true,
          variant: 'outlined',
          description: t('langCode'),
          noMargin: true
        }
      },
      required: ['langCode']
    }),
    [t]
  );

  const schemaRecord = React.useMemo(() => {
    const schema = {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          darkTheme: true,
          variant: 'outlined',
          description: t('KeyName'),
          mask: 'LANG_***********************************************************',
          changeCase: 'toUpperCase',
          formatChars: {
            '*': '[A-Za-z_0-9.]'
          }
        },
        label: {
          control: 'text.block',
          htmlBlock: `
              <p>
                <span style="color: #fff;font-size: 16px;line-height: 19px;margin-bottom: 0px; font-weight: 500;display: inline-block;">
                  ${t('TranslatesLabel')}:
                </span>
              </p>
            `,
          noMargin: true
        }
      },
      required: ['key']
    };

    langCodes.forEach((item) => {
      schema.properties[item.code] = {
        type: 'string',
        darkTheme: true,
        variant: 'outlined',
        description: item.code,
        notRequiredLabel: '',
        checkRequired: '(a, b, c, value) => Object.keys(value).length < 2'
      };
    });

    return schema;
  }, [t, langCodes]);

  const fetchLocalizationsData = React.useCallback(async () => {
    const codes = await dispatch(getLanguages());
    setLangCodes(codes);
    setChosenCodes(codes.map((item) => item.code));
  }, [dispatch]);

  const handleCreateLocalization = React.useCallback(async () => {
    const validateErrors = validateData(langCode, schemaLangCode);

    setErrors(validateErrors);

    if (validateErrors && validateErrors.length) {
      return;
    }

    try {
      await dispatch(
        createLanguage({
          code: langCode?.langCode,
          name: {},
          isActive: true
        })
      );

      setLangCode({});

      fetchLocalizationsData();
    } catch (error) {
      console.error(error);
      dispatch(addError(new Error(error.message)));
    }
  }, [schemaLangCode, langCode, dispatch, fetchLocalizationsData]);

  const handleDeleteLocalization = React.useCallback(
    async (item) => {
      try {
        setLoading(true);
        await dispatch(deleteLanguage(item));
        setLoading(false);
        setDeleting(false);
        fetchLocalizationsData();
      } catch (error) {
        dispatch(addError(new Error(error.message)));
        setLoading(false);
      }
    },
    [dispatch, fetchLocalizationsData]
  );

  const handleDeleteTranslation = React.useCallback(
    async (lanCode, key) => {
      try {
        setLoading(true);
        await dispatch(deleteTranslation(lanCode, key));
        setLoading(false);
        setDeleting(false);
        tableProps.actions.load();
      } catch (error) {
        dispatch(addError(new Error(error.message)));
        setLoading(false);
      }
    },
    [dispatch, tableProps]
  );

  const handleDeleteItem = React.useCallback(() => {
    if (deleting?.type === 'language') {
      handleDeleteLocalization(deleting?.value?.code);
    } else if (deleting?.type === 'translation') {
      const keys = Object.keys(deleting.value).filter((key) => key !== 'value');

      keys.forEach((languageCode) => {
        handleDeleteTranslation(languageCode, deleting.value.value);
      });
    }
  }, [deleting, handleDeleteLocalization, handleDeleteTranslation]);

  const handleOpenRecord = React.useCallback(
    async (row) => {
      setOpening(row?.value);

      setEditing(true);

      const result = await dispatch(searchLocalization(row?.value));

      setOpening(false);

      const dataToSchema = {
        key: row?.value
      };

      result.forEach((item) => {
        dataToSchema[item?.localizationLanguageCode] = item?.value;
      });

      setOpenRecord(true);
      setRecordValue(result);

      setRecord(dataToSchema);
    },
    [dispatch]
  );

  const handleChangeRecord = React.useCallback(
    (value) => {
      setRecord(value);
    },
    [setRecord]
  );

  const handleCreateTranslation = React.useCallback(async () => {
    const validateErrors = validateData(record, schemaRecord);

    setErrors(validateErrors);

    if (validateErrors && validateErrors.length) {
      return;
    }

    const codesToSave = langCodes
      .filter((item) => record[item.code])
      .map((item) => ({
        localizationLanguageCode: item.code,
        key: record?.key,
        value: record[item.code]
      }));

    setUpdating(true);

    try {
      const saveFunctions = async (item) => {
        if (
          !editing ||
          !recordValue.some((el) => el?.localizationLanguageCode === item?.localizationLanguageCode)
        ) {
          await dispatch(
            createTranslation({
              localizationLanguageCode: item?.localizationLanguageCode,
              key: item?.key,
              value: item?.value
            })
          );
        } else {
          await dispatch(
            updateTranslation(item?.localizationLanguageCode, item?.key, {
              value: item?.value
            })
          );
        }
      };

      for (let i = 0; i < codesToSave.length; i++) {
        await awaitDelay(250);
        await saveFunctions(codesToSave[i], i);
      }

      if (recordValue.length > codesToSave.length) {
        const arrayForDelete = recordValue.filter(
          (el) =>
            !codesToSave.find(
              (item) => item.localizationLanguageCode === el?.localizationLanguageCode
            )
        );
        setLoading(true);
        for (let i = 0; i < arrayForDelete.length; i++) {
          await awaitDelay(250);
          await dispatch(
            deleteTranslation(arrayForDelete[i].localizationLanguageCode, arrayForDelete[i].key)
          );
        }
        setLoading(false);
      }

      tableProps.actions.load();

      setUpdating(false);

      setOpenRecord(false);

      setEditing(false);

      setRecord({});
    } catch (error) {
      dispatch(addError(new Error(error.message)));
      setUpdating(false);
    }
  }, [schemaRecord, record, tableProps, langCodes, editing, dispatch]);

  const handleOpenExport = React.useCallback(() => {
    setExportDialog(true);
  }, []);

  const handleExportLanguage = React.useCallback(async () => {
    if (exporting) return;

    setExporting(true);

    const blob = await dispatch(
      exportLanguages({
        codes: chosenCodes
      })
    );

    if (blob instanceof Error) {
      dispatch(addMessage(new Message('ExportTranslationError', 'error')));
      setExporting(false);
      return;
    }

    const fileName = `languages-${new Date().toISOString()}.bpmn`;

    downloadBase64Attach({ fileName }, blob);

    setExporting(false);

    dispatch(addMessage(new Message('ExportTranslatesSuccess', 'success')));
  }, [dispatch, chosenCodes, tableProps.data, exporting]);

  const handleExportTexts = React.useCallback(async () => {
    if (exporting) return;

    const chosenTexts = tableProps.data
      .filter((item) => tableProps.rowsSelected.includes(item?.key))
      .flatMap((item) => {
        const languages = Object.keys(item).filter((key) => key !== 'key');

        return languages.map((language) => ({
          localizationLanguageCode: language,
          key: item.key
        }));
      });

    setExporting(true);

    const blob = await dispatch(
      exportTexts({
        texts: chosenTexts
      })
    );

    if (blob instanceof Error) {
      dispatch(addMessage(new Message('ImportTranslatesError', 'error')));
      setExporting(false);
      return;
    }

    const fileName = `translations-${new Date().toISOString()}.bpmn`;

    downloadBase64Attach({ fileName }, blob);

    setExporting(false);

    dispatch(addMessage(new Message('ExportTranslatesSuccess', 'success')));
  }, [dispatch, chosenCodes, tableProps.data, tableProps.rowsSelected, exporting]);

  const handleChoseExportLangFile = React.useCallback(() => {
    languagesRef.current.click();
  }, []);

  const handleImportLanguages = React.useCallback(
    async (event) => {
      if (exporting) return;

      const file = event.target.files[0];

      if (!file) return;

      setImporting(true);

      const result = await dispatch(importLanguages(file));

      setImporting(false);

      if (result instanceof Error) {
        dispatch(addMessage(new Message('ImportTranslatesError', 'error')));
        return;
      }

      tableProps.actions.load();

      fetchLocalizationsData();

      event.target.value = '';

      dispatch(addMessage(new Message('ImportTranslatesSuccess', 'success')));
    },
    [dispatch, tableProps, fetchLocalizationsData, exporting]
  );

  const handleChoseExportTextsFile = React.useCallback(() => {
    textsRef.current.click();
  }, []);

  const handleImportTexts = React.useCallback(
    async (event) => {
      if (exporting) return;

      const file = event.target.files[0];

      if (!file) return;

      setImporting(true);

      const result = await dispatch(importTexts(file));

      setImporting(false);

      if (result instanceof Error) {
        dispatch(addMessage(new Message('ImportTranslatesError', 'error')));
        return;
      }

      tableProps.actions.load();

      event.target.value = '';

      dispatch(addMessage(new Message('ImportTranslatesSuccess', 'success')));
    },
    [dispatch, tableProps, exporting]
  );

  React.useEffect(() => {
    fetchLocalizationsData();
  }, [fetchLocalizationsData]);

  const tableData = tableProps?.data?.map(({ key, ...rest }) => {
    return { value: key, ...rest };
  });

  return (
    <LeftSidebarLayout
      location={location}
      loading={loadingProp || tableProps.loading}
      title={t(title)}
    >
      <Content>
        <div className={classes.root}>
          <DataTable
            {...tableProps}
            data={tableData}
            CustomToolbar={() => (
              <>
                {(tableProps.rowsSelected || []).length ? (
                  <Tooltip title={t('ExportTexts')}>
                    <IconButton onClick={handleExportTexts}>
                      {exporting ? <CircularProgress size={20} /> : <ExplicitIcon />}
                    </IconButton>
                  </Tooltip>
                ) : null}

                <ColorButton
                  variant="contained"
                  color="primary"
                  onClick={() => setOpen(true)}
                  startIcon={<AddIcon />}
                >
                  {t('AddLanguage')}
                </ColorButton>

                <ColorButton
                  variant="contained"
                  color="primary"
                  onClick={() => setOpenRecord(true)}
                  startIcon={<AddIcon />}
                >
                  {t('AddTranslation')}
                </ColorButton>

                <ColorButton
                  variant="contained"
                  color="primary"
                  onClick={handleChoseExportTextsFile}
                  startIcon={
                    importing ? (
                      <CircularProgress size={20} />
                    ) : (
                      <img src={DownloadIcon} alt="DownloadIcon" />
                    )
                  }
                >
                  {t('Import')}
                </ColorButton>

                <input
                  ref={textsRef}
                  type="file"
                  accept=".bpmn, application/bpmn"
                  onChange={handleImportTexts}
                  hidden={true}
                  multiple={false}
                />
              </>
            )}
            darkTheme={true}
            columns={[
              {
                id: 'value',
                name: t('KeyName')
              },
              ...langCodes.map((el) => ({
                id: el.code,
                name: el.code.toUpperCase(),
                selector: (row) => row.translations?.[el.code]
              })),
              {
                id: 'actions',
                padding: 'checkbox',
                width: 40,
                disableClick: true,
                name: t('Actions'),
                render: (_, row) => (
                  <div style={{ display: 'flex' }} key={row?.id}>
                    <Tooltip title={t('Update')}>
                      <IconButton onClick={() => handleOpenRecord(row)}>
                        {opening === row?.value ? <CircularProgress size={20} /> : <EditIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('Delete')}>
                      <IconButton
                        onClick={() => {
                          setDeleting({
                            type: 'translation',
                            value: row
                          });
                        }}
                      >
                        <ClearIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                )
              }
            ]}
            checkable={true}
            controls={{
              pagination: true,
              toolbar: true,
              search: true,
              header: true,
              refresh: true,
              switchView: false,
              customizateColumns: false,
              bottomPagination: true
            }}
          />

          <Dialog
            open={exportDialog}
            onClose={() => setExportDialog(false)}
            fullWidth={true}
            maxWidth="sm"
            scroll="body"
          >
            <DialogTitle>{t('ExportDialogTitle')}</DialogTitle>
            <DialogContent>
              <FormGroup>
                {langCodes.map((item) => (
                  <FormControlLabel
                    key={item.code}
                    control={
                      <Checkbox
                        classes={{
                          checked: classes.checkbox
                        }}
                      />
                    }
                    label={item.code}
                    checked={chosenCodes.includes(item.code)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setChosenCodes([...chosenCodes, item.code]);
                      } else {
                        setChosenCodes(chosenCodes.filter((code) => code !== item.code));
                      }
                    }}
                  />
                ))}
              </FormGroup>
            </DialogContent>
            <DialogActions className={classes.dialogActions}>
              <Button onClick={() => setExportDialog(false)}>{t('Cancel')}</Button>
              <Button
                color="primary"
                variant="contained"
                onClick={handleExportLanguage}
                startIcon={
                  exporting ? <CircularProgress style={{ color: '#000' }} size={20} /> : null
                }
              >
                {t('Export')}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            fullWidth={true}
            maxWidth="sm"
            scroll="body"
          >
            <DialogTitle>{t('DialogTitle')}</DialogTitle>
            <DialogContent>
              <div className={classes.langsList}>
                <List>
                  {langCodes.map((item) => (
                    <ListItem key={item.code}>
                      <ListItemIcon>
                        <LanguageIcon />
                      </ListItemIcon>
                      <ListItemText primary={item.code} />
                      <IconButton onClick={() => setDeleting({ type: 'language', value: item })}>
                        <ClearIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </div>

              <SchemaForm
                value={langCode}
                errors={errors}
                schema={schemaLangCode}
                onChange={handleChangeAdapter(langCode, setLangCode, true)}
              />
              <div className={classes.addActions}>
                <Button color="primary" variant="contained" onClick={handleCreateLocalization}>
                  {t('Save')}
                </Button>
              </div>
            </DialogContent>
            <DialogActions className={classes.dialogActions}>
              <ColorButton
                variant="contained"
                color="primary"
                onClick={handleOpenExport}
                startIcon={<img src={ExportIcon} alt="DownloadIcon" />}
              >
                {t('ExportDialogTitle')}
              </ColorButton>

              <ColorButton
                variant="contained"
                color="primary"
                onClick={handleChoseExportLangFile}
                startIcon={
                  importing ? (
                    <CircularProgress size={20} />
                  ) : (
                    <img src={DownloadIcon} alt="DownloadIcon" />
                  )
                }
              >
                {t('Import')}
              </ColorButton>

              <input
                ref={languagesRef}
                type="file"
                accept=".bpmn, application/bpmn"
                onChange={handleImportLanguages}
                hidden={true}
                multiple={false}
              />

              <Button onClick={() => setOpen(false)}>{t('Close')}</Button>
            </DialogActions>
            <ProgressLine loading={exporting} />
          </Dialog>

          <Dialog
            open={openRecord}
            // open={true}

            onClose={() => {
              setOpenRecord(false);
              setRecord({});
            }}
            fullWidth={true}
            scroll="body"
            maxWidth="sm"
          >
            <DialogTitle>
              {t(!record?.createdAt ? 'DialogRecordTitleAdd' : 'DialogRecordTitle')}
            </DialogTitle>
            <DialogContent>
              <SchemaForm
                value={record}
                errors={errors}
                schema={schemaRecord}
                onChange={handleChangeAdapter(record, handleChangeRecord, true)}
              />
              <ProgressLine loading={updating || !langCodes.length} />
            </DialogContent>
            <DialogActions className={classes.dialogActions}>
              <Button
                onClick={() => {
                  setOpenRecord(false);
                  setRecord({});
                }}
              >
                {t('Cancel')}
              </Button>
              <Button color="primary" variant="contained" onClick={handleCreateTranslation}>
                {t('Save')}
              </Button>
            </DialogActions>
          </Dialog>

          <ConfirmDialog
            open={deleting?.value}
            darkTheme={true}
            title={t('DeletePrompt')}
            description={t('DeletePromptDescription', {
              deleting: deleting?.value?.value || deleting?.value?.code
            })}
            loading={loading}
            handleClose={() => setDeleting(false)}
            handleConfirm={() => {
              handleDeleteItem();
            }}
          />
        </div>
      </Content>
    </LeftSidebarLayout>
  );
};

export default asModulePage(TranslationsPage);

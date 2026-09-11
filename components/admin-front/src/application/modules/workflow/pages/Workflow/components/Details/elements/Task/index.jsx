import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { bindActionCreators } from 'redux';
import moment from 'moment';
import {
  Button,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import Preloader from 'components/Preloader';
import { makeStyles } from '@mui/styles';
import {
  SchemaForm,
  handleChangeAdapter,
  validateData,
} from 'components/JsonSchema';
import emptyTask from 'application/modules/workflow/variables/emptyTask';
import taskElementTypes from 'application/modules/workflow/variables/taskElementTypes';
import {
  requestTask,
  changeTaskData,
  saveTaskData,
} from 'application/actions/tasks';
import minUnusedIndex from 'helpers/minUnusedIndex';
import padWithZeroes from 'helpers/padWithZeroes';
import processList from 'services/processList';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import schema from './schema';
import checkAccess from 'helpers/checkAccess';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import evaluate from 'helpers/evaluate';
import waiter from 'helpers/waitForAction';

const HIDDEN_PARAMS = ['deadline', 'setPermissions'];

function deepRemoveCircular() {
  const seen = new WeakMap();

  return function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return undefined; // Remove circular reference
      }
      seen.set(value, true);
    }
    return value;
  };
}

const useStyles = makeStyles((theme) => ({
  button: {
    width: '100%',
    textTransform: 'initial',
    color: '#fff',
    justifyContent: 'space-between',
  },
  actionWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    width: 'calc(100% + 17px)',
    position: 'relative',
    left: -8,
    '&:hover': {
      backgroundColor: '#2e2e2e',
    },
  },
  actionLabel: {
    fontWeight: 500,
    lineHeight: '19px',
    color: '#FFFFFF',
    fontSize: 16,
    textTransform: 'initial',
    textAlign: 'left',
  },
  dialogTitle: {
    paddingBottom: 0,
    padding: 35,
    marginBottom: 35,
    '& h2': {
      fontWeight: 400,
      fontSize: 32,
      lineHeight: '38px',
      letterSpacing: '-0.02em',
      color: '#FFFFFF',
      display: 'flex',
      justifyContent: 'space-between',
    },
  },
  dialogContent: {
    padding: '0 35px',
  },
  dialogPaper: {
    background: theme?.navigator?.sidebarBg,
    width: 515,
    maxWidth: 515,
    [theme.breakpoints.down('lg')]: {
      maxWidth: '100%',
    },
  },
  draftsMethodItem: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 11,
    marginTop: 35,
    padding: '0 15px',
    '& .MuiFormHelperText-root': {
      color: 'rgba(255, 255, 255, 0.6)',
      '&.Mui-error': {
        color: 'rgb(244, 67, 54)',
      },
    },
  },
  dialogActionsRoot: {
    paddingLeft: 50,
    paddingRight: 50,
    paddingTop: 50,
  },
  radioChecked: {
    '&.Mui-checked svg': {
      fill: 'rgb(187, 134, 252)',
    },
  },
  fz14: {
    fontSize: 14,
    lineHeight: '24px',
  },
}));

const periodSchema = (t) => ({
  type: 'object',
  properties: {
    period: {
      type: 'string',
      darkTheme: true,
      variant: 'outlined',
      sample: t('InputExample'),
      noMargin: true,
      width: '75px',
      notRequiredLabel: '',
      maxLength: 5,
      checkValid: [
        {
          isValid:
            "(value) => (value || '').length > 0 && (value || '').length >= 2",
          errorText: t('InvalidValue'),
        },
      ],
    },
  },
});

const actionSchema = (t) => ({
  type: 'object',
  properties: {
    action: {
      type: 'string',
      darkTheme: true,
      variant: 'outlined',
      noMargin: true,
      width: '160px',
      notRequiredLabel: '',
      options: [
        {
          'id': 'create',
          'name': t('Create')
        },
        {
          'id': 'update',
          'name': t('Update')
        }
      ]
    },
  },
});

const calculateSchema = (t) => ({
  type: 'object',
  properties: {
    calculate: {
      type: 'string',
      darkTheme: true,
      rows: 5,
      multiline: true,
      variant: 'outlined',
      placeholder: t('CalculateTitle'),
      sample: t('CalculateDescription'),
      noMargin: true,
      notRequiredLabel: '',
      checkValid: [
        {
          isValid: "(value) => (value || '').length > 0",
          errorText: t('InvalidValue'),
        },
      ],
    },
  },
});

const dateSchema = (t) => ({
  type: 'object',
  properties: {
    date: {
      type: 'string',
      darkTheme: true,
      variant: 'outlined',
      notRequiredLabel: '',
      noMargin: true,
      width: '150px',
      control: 'date',
      checkValid: [
        {
          isValid:
            "(value) => (value || '').length > 0 && (value || '').length === 10",
          errorText: t('InvalidValue'),
        },
      ],
    },
  },
});

const timeSchema = (t) => ({
  type: 'object',
  properties: {
    time: {
      type: 'string',
      darkTheme: true,
      variant: 'outlined',
      notRequiredLabel: '',
      noMargin: true,
      width: '75px',
      mask: '99:99',
      placeholder: '00:00',
      checkValid: [
        {
          isValid:
            "(value) => (value || '').length > 0 && (value || '').length === 5",
          errorText: t('InvalidValue'),
        },
      ],
    },
  },
});

const TaskElement = (props) => {
  const {
    actions,
    onChange,
    t,
    handleSave,
    busy,
    workflow,
    modeler,
    selectionId,
    actualTaskList,
    element,
    userInfo,
    userUnits,
    setBusy,
  } = props;

  const [draftsModalOpen, setDraftsModalOpen] = React.useState(false);
  const [deleteType, setDeleteType] = React.useState('period');
  const [draftsData, setDraftsData] = React.useState({});
  const [errors, setErrors] = React.useState([]);
  const classes = useStyles();

  const getTaskId = ({ businessObject: { id } }) =>
    parseInt(id.split('-').pop(), 10);

  const getTaskData = () => {
    const taskId = getTaskId(element);

    const task = actualTaskList[taskId];

    return task;
  };

  const getTaskSettings = () => {
    const task = getTaskData();

    const copiedTask = JSON.parse(JSON.stringify(task, deepRemoveCircular()));

    HIDDEN_PARAMS.forEach((param) => {
      delete copiedTask.taskTemplateEntity.jsonSchema[param];
    });

    return copiedTask;
  };

  const handleChangeSettings = (newTask) => {
    const task = getTaskData();

    const updatedSettings = {
      ...newTask.taskTemplateEntity.jsonSchema,
    };

    HIDDEN_PARAMS.forEach((param) => {
      if (updatedSettings[param]) {
        actions.addMessage(new Message(t(`${param}_exists`), 'warning'));
      }

      updatedSettings[param] = task.taskTemplateEntity.jsonSchema[param];
    });

    task.taskTemplateEntity.jsonSchema = updatedSettings;

    handleChange(task);
  };

  const handleChange = (task) => {
    actions.changeTaskData(getTaskId(element), task);
    onChange && onChange();
  };

  const handleChangeDeleteType = (event) => {
    setDraftsData({});
    setDeleteType(event.target.value);
  };

  const handleSaveDeleteDraftSettings = () => {
    let validateErrors = [];

    switch (deleteType) {
      case 'period':
        validateErrors = validateData(draftsData, periodSchema(t));
        break;
      case 'time':
        validateErrors = validateData(draftsData, dateSchema(t)).concat(
          validateData(draftsData, timeSchema(t)),
        );
        break;
      case 'calculate':
        validateErrors = validateData(draftsData, calculateSchema(t));
        break;
      default:
        validateErrors = [];
        break;
    }

    setErrors(validateErrors);

    if (validateErrors && validateErrors.length) {
      return;
    }

    const newTask = { ...getTaskData() };

    const updatedSettings = {
      ...newTask.taskTemplateEntity.jsonSchema,
    };

    switch (deleteType) {
      case 'period':
        const actionProp = draftsData?.action === 'create' ? 'deleteDraftAfterCreateAt' : 'deleteDraftAfterUpdateAt';
        delete updatedSettings.deleteDraftAt;
        delete updatedSettings.deleteDraftCalculated;
        delete updatedSettings.deleteDraftAfterCreateAt;
        delete updatedSettings.deleteDraftAfterUpdateAt;
        updatedSettings[actionProp] = draftsData.period;
        if (!(draftsData.period || '').length) {
          delete updatedSettings[actionProp];
        }
        break;
      case 'time':
        const { date, time } = draftsData;
        const expDate = moment(`${date} ${time}`, 'DD.MM.YYYY HH:mm').valueOf();
        delete updatedSettings.deleteDraftCalculated;
        delete updatedSettings.deleteDraftAfterCreateAt;
        delete updatedSettings.deleteDraftAfterUpdateAt;
        updatedSettings.deleteDraftAt = `() => { return ${expDate};}`;
        if (
          !(draftsData.date || '').length &&
          !(draftsData.time || '').length
        ) {
          delete updatedSettings.deleteDraftAt;
        }
        break;
      case 'calculate':
        delete updatedSettings.deleteDraftAfterCreateAt;
        delete updatedSettings.deleteDraftAfterUpdateAt;
        updatedSettings.deleteDraftCalculated = true;
        updatedSettings.deleteDraftAt = draftsData.calculate;
        if (!(draftsData.calculate || '').length) {
          delete updatedSettings.deleteDraftAt;
          delete updatedSettings.deleteDraftCalculated;
        }
        break;
      default:
        break;
    }

    newTask.taskTemplateEntity.jsonSchema = updatedSettings;

    handleChange(newTask);
    setDraftsModalOpen(false);
  };

  const setDefaultDraftsData = (task) => {
    const settings = task.taskTemplateEntity.jsonSchema;

    const { deleteDraftAt, deleteDraftAfterCreateAt, deleteDraftCalculated, deleteDraftAfterUpdateAt } =
      settings;

    if (deleteDraftAfterCreateAt || deleteDraftAfterUpdateAt) {
      const periodTime = deleteDraftAfterCreateAt || deleteDraftAfterUpdateAt;
      setDeleteType('period');
      setDraftsData({ period: periodTime, action: deleteDraftAfterCreateAt ? 'create' : 'update' });
      return;
    }

    if (deleteDraftAt && deleteDraftCalculated) {
      setDeleteType('calculate');
      setDraftsData({ calculate: deleteDraftAt });
      return;
    }

    if (deleteDraftAt) {
      setDeleteType('time');
      const result = evaluate(deleteDraftAt);
      const date = moment(result).format('DD.MM.YYYY');
      const time = moment(result).format('HH:mm');
      setDraftsData({ date, time });
      return;
    }
  };

  React.useEffect(() => {
    const isLocalId = (id) =>
      taskElementTypes.some((type) => {
        const suffix = type.split(':').pop();
        return id.indexOf(suffix) === 0;
      });

    const getNextTaskId = (element) => {
      const ids = modeler
        .get('elementRegistry')
        .getAll()
        .filter(
          ({ type, id }) =>
            taskElementTypes.includes(type) && id !== element.businessObject.id,
        )
        .filter(({ businessObject: { id } }) => !isLocalId(id))
        .map(getTaskId)
        .map(String)
        .map((taskId) => taskId.replace(workflow.id, ''))
        .map((numStr) => parseInt(numStr, 10));

      return workflow.id + padWithZeroes(minUnusedIndex(ids, 1), 3);
    };

    const loadTask = async () => {
      const taskId = getTaskId(element);

      if (actualTaskList[taskId]) {
        setDefaultDraftsData(actualTaskList[taskId]);
        return;
      }

      if (isLocalId(element.businessObject.id)) {
        const nextTaskId = getNextTaskId(element);
        element.businessObject.id = ['task', nextTaskId].join('-');
        element.businessObject.name = t('NewTask');
        onChange(element.businessObject);
        return;
      }

      if (!processList.has('requestTask', taskId)) {
        if (busy) return;

        setBusy(true);

        waiter.addAction(
          'requestTask' + taskId,
          async () => {
            const task = await processList.set(
              'requestTask',
              actions.requestTask,
              taskId,
            );

            if (task instanceof Error && task.message === '404 not found') {
              await actions.saveTaskData(emptyTask(taskId, { t, workflow }));
            } else {
              setDefaultDraftsData(task);
            }
            setBusy(false);
          },
          250,
        );
      }
    };

    processList.hasOrSet('requestTask-init', loadTask);
  }, [
    busy,
    setBusy,
    selectionId,
    modeler,
    workflow,
    actions,
    actualTaskList,
    element,
    onChange,
    t,
  ]);

  const task = getTaskData();

  if (!task) {
    return <Preloader />;
  }

  const renderDivider = (
    <SchemaForm
      schema={{
        type: 'object',
        properties: {
          divider: {
            control: 'divider',
            darkTheme: true,
            margin: 12,
          },
        },
      }}
    />
  );

  const isEditable = checkAccess(
    { userHasUnit: [1000002] },
    userInfo,
    userUnits,
  );

  return (
    <>
      <SchemaForm
        value={task}
        onChange={handleChangeAdapter(
          task,
          handleChange,
          false,
          {},
          {
            clean: { emptyStrings: false },
          },
        )}
        handleSave={handleSave}
        busy={busy}
        readOnly={!isEditable}
        schema={{
          type: 'object',
          properties: {
            documentTemplateEntity: {
              type: 'object',
              properties: {
                jsonSchemaRaw: {
                  control: 'schema.editor',
                  description: t('Schema'),
                  additionDescription: ` ${props?.workflow?.id} ${props?.workflow?.name}`,
                  darkTheme: true,
                  noMargin: true,
                  disableScrollBody: true,
                  workflowTemplateId: props?.workflow?.id,
                  taskTemplateId: task.taskTemplateEntity.id,
                },
                divider1: {
                  control: 'divider',
                  darkTheme: true,
                  margin: 15,
                },
                htmlTemplate: {
                  control: 'code.editor',
                  mode: 'html',
                  description: t('DocumentHtmlSchema'),
                  darkTheme: true,
                  noMargin: true,
                  validate: false,
                },
              },
            },
          },
        }}
      />

      {renderDivider}

      <SchemaForm
        value={task}
        onChange={handleChangeAdapter(
          task,
          handleChange,
          true,
          {},
          {
            clean: { emptyArrays: false },
          },
        )}
        handleSave={handleSave}
        busy={busy}
        readOnly={!isEditable}
        schema={{
          type: 'object',
          properties: {
            taskTemplateEntity: {
              type: 'object',
              properties: {
                jsonSchema: {
                  type: 'object',
                  properties: {
                    setPermissions: {
                      control: 'code.editor',
                      description: t('PerformerUsers'),
                      mode: 'json',
                      darkTheme: true,
                      validate: true,
                      noMargin: true,
                      asJsonObject: true,
                      defaultValue: [],
                    },
                  },
                },
              },
            },
          },
        }}
      />

      {renderDivider}

      <SchemaForm
        value={getTaskSettings()}
        onChange={handleChangeAdapter(
          getTaskSettings(),
          handleChangeSettings,
          true,
        )}
        handleSave={handleSave}
        busy={busy}
        readOnly={!isEditable}
        schema={{
          type: 'object',
          properties: {
            taskTemplateEntity: {
              type: 'object',
              properties: {
                jsonSchema: {
                  control: 'code.editor',
                  description: t('TaskJsonSchema'),
                  mode: 'json',
                  darkTheme: true,
                  noMargin: true,
                  validate: true,
                  asJsonObject: true,
                },
              },
            },
          },
        }}
      />

      {renderDivider}

      <SchemaForm
        value={task}
        onChange={handleChangeAdapter(
          task,
          handleChange,
          true,
          {},
          {
            clean: { emptyStrings: true },
          },
        )}
        handleSave={handleSave}
        busy={busy}
        readOnly={!isEditable}
        schema={{
          type: 'object',
          properties: {
            taskTemplateEntity: {
              type: 'object',
              properties: {
                jsonSchema: {
                  type: 'object',
                  properties: {
                    deadline: {
                      control: 'code.editor',
                      description: t('Deadline'),
                      mode: 'javascript',
                      darkTheme: true,
                      validate: false,
                      noMargin: true,
                    },
                  },
                },
              },
            },
          },
        }}
      />

      {renderDivider}

      <Button
        onClick={() => setDraftsModalOpen(true)}
        className={classes.actionWrapper}
        disabled={!isEditable}
        endIcon={<MoreHorizIcon />}
      >
        <Typography className={classes.actionLabel}>
          {t('DraftsDeleteAuto')}
        </Typography>
      </Button>

      {renderDivider}

      <SchemaForm
        value={task}
        handleSave={handleSave}
        busy={busy}
        readOnly={!isEditable}
        onChange={handleChangeAdapter(task, handleChange, false)}
        schema={schema(t)}
      />

      <Dialog
        open={draftsModalOpen}
        onClose={() => setDraftsModalOpen(false)}
        fullWidth={true}
        maxWidth="sm"
        scroll="body"
        classes={{
          paper: classNames(classes.dialogPaper),
        }}
      >
        <DialogTitle
          classes={{
            root: classNames(classes.dialogTitle),
          }}
        >
          {t('DraftsDeleteAuto')}
        </DialogTitle>

        <DialogContent
          classes={{
            root: classNames(classes.dialogContent),
          }}
        >
          <RadioGroup value={deleteType} onChange={handleChangeDeleteType}>
            <FormControlLabel
              value={'period'}
              control={<Radio className={classes.radioChecked} />}
              label={t('DeleteByPeriod')}
            />
            <FormControlLabel
              value={'time'}
              control={<Radio className={classes.radioChecked} />}
              label={t('DeleteByTime')}
            />
            <FormControlLabel
              value={'calculate'}
              control={<Radio className={classes.radioChecked} />}
              label={t('ByFunction')}
            />
          </RadioGroup>

          {deleteType === 'period' ? (
            <div className={classes.draftsMethodItem}>
              <Typography className={classes.fz14}>
                {t('DeleteDraftsAt')}
              </Typography>

              <SchemaForm
                errors={errors}
                value={draftsData}
                schema={periodSchema(t)}
                onChange={handleChangeAdapter(draftsData, setDraftsData, true)}
              />

              <Typography className={classes.fz14}>
                {t('After')}
              </Typography>

              <SchemaForm
                errors={errors}
                value={draftsData}
                schema={actionSchema(t)}
                onChange={handleChangeAdapter(draftsData, setDraftsData, true)}
              />
            </div>
          ) : null}

          {deleteType === 'time' ? (
            <div className={classes.draftsMethodItem}>
              <Typography className={classes.fz14}>
                {t('DeleteDrafts')}
              </Typography>
              <SchemaForm
                value={draftsData}
                errors={errors}
                onChange={handleChangeAdapter(draftsData, setDraftsData, true)}
                schema={dateSchema(t)}
              />
              <Typography className={classes.fz14}>{t('At')}</Typography>
              <SchemaForm
                value={draftsData}
                errors={errors}
                onChange={handleChangeAdapter(
                  draftsData,
                  setDraftsData,
                  true,
                  {},
                  {
                    clean: { emptyStrings: true },
                  },
                )}
                schema={timeSchema(t)}
              />
            </div>
          ) : null}

          {deleteType === 'calculate' ? (
            <div className={classes.draftsMethodItem}>
              <SchemaForm
                errors={errors}
                value={draftsData}
                schema={calculateSchema(t)}
                onChange={handleChangeAdapter(draftsData, setDraftsData, true)}
              />
            </div>
          ) : null}
        </DialogContent>
        <DialogActions
          classes={{
            root: classNames(classes.dialogActionsRoot),
          }}
        >
          <Button
            onClick={() => setDraftsModalOpen(false)}
            className={classes.closeDialog}
          >
            {t('Close')}
          </Button>

          <Button
            color="primary"
            variant="contained"
            onClick={handleSaveDeleteDraftSettings}
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

TaskElement.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  actualTaskList: PropTypes.object,
  element: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  workflow: PropTypes.object,
  selectionId: PropTypes.string,
  modeler: PropTypes.object,
};

TaskElement.defaultProps = {
  actualTaskList: {},
  workflow: {},
  selectionId: null,
  modeler: null,
};

const mapStateToProps = ({
  tasks: { actual },
  auth: { info: userInfo, userUnits },
}) => ({
  actualTaskList: actual,
  userInfo,
  userUnits,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestTask: bindActionCreators(requestTask, dispatch),
    saveTaskData: bindActionCreators(saveTaskData, dispatch),
    changeTaskData: bindActionCreators(changeTaskData, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const translated = translate('WorkflowAdminPage')(TaskElement);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

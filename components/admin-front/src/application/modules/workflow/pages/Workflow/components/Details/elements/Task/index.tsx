import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { bindActionCreators, Dispatch } from 'redux';
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
import PreloaderRaw from 'components/Preloader';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
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

const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;

const HIDDEN_PARAMS = ['deadline', 'setPermissions'];

function deepRemoveCircular() {
  const seen = new WeakMap();

  return function (key: string, value: unknown) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return undefined; // Remove circular reference
      }
      seen.set(value, true);
    }
    return value;
  };
}

type AppTheme = Theme & { navigator?: { sidebarBg?: string } };

const useStyles = makeStyles((theme: AppTheme) => ({
  button: {
    width: '100%',
    textTransform: 'initial' as const,
    color: '#fff',
    justifyContent: 'space-between',
  },
  actionWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    width: 'calc(100% + 17px)',
    position: 'relative' as const,
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
    textTransform: 'initial' as const,
    textAlign: 'left' as const,
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

const periodSchema = (t: (key: string) => string) => ({
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

const actionSchema = (t: (key: string) => string) => ({
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

const calculateSchema = (t: (key: string) => string) => ({
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

const dateSchema = (t: (key: string) => string) => ({
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

const timeSchema = (t: (key: string) => string) => ({
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

interface BpmnBusinessObject {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface BpmnElement {
  id: string;
  businessObject: BpmnBusinessObject;
}

interface ElementRegistryEntry {
  type: string;
  id: string;
  businessObject: BpmnBusinessObject;
}

interface ElementRegistry {
  getAll(): ElementRegistryEntry[];
}

interface TaskEntity {
  taskTemplateEntity: {
    id?: string | number;
    jsonSchema: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface DraftsData {
  period?: string;
  action?: string;
  date?: string;
  time?: string;
  calculate?: string;
  [key: string]: unknown;
}

interface TaskElementProps {
  actions: {
    requestTask: (taskId: number) => Promise<TaskEntity | Error>;
    saveTaskData: (data: unknown) => Promise<unknown>;
    changeTaskData: (taskId: number, data: unknown) => unknown;
    addMessage: (message: unknown) => void;
  };
  onChange?: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  handleSave?: boolean;
  busy?: boolean;
  workflow: { id?: string | number; name?: string };
  modeler?: BpmnJsInstance | null;
  selectionId?: string | null;
  actualTaskList: Record<string, TaskEntity>;
  element: BpmnElement;
  userInfo: Record<string, unknown>;
  userUnits: unknown[];
  setBusy: (busy: boolean) => void;
}

const TaskElement = (props: TaskElementProps) => {
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
  const [draftsData, setDraftsData] = React.useState<DraftsData>({});
  const [errors, setErrors] = React.useState<unknown[]>([]);
  const classes = useStyles();

  const getTaskId = ({ businessObject: { id } }: { businessObject: { id: string } }) =>
    parseInt(id.split('-').pop() as string, 10);

  const getTaskData = () => {
    const taskId = getTaskId(element);

    const task = actualTaskList[taskId];

    return task;
  };

  const getTaskSettings = () => {
    const task = getTaskData();

    const copiedTask = JSON.parse(JSON.stringify(task, deepRemoveCircular() as never)) as TaskEntity;

    HIDDEN_PARAMS.forEach((param) => {
      delete copiedTask.taskTemplateEntity.jsonSchema[param];
    });

    return copiedTask;
  };

  const handleChangeSettings = (newTask: TaskEntity) => {
    const task = getTaskData();

    const updatedSettings: Record<string, unknown> = {
      ...(newTask.taskTemplateEntity.jsonSchema as Record<string, unknown>),
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

  const handleChange = (task: TaskEntity) => {
    actions.changeTaskData(getTaskId(element), task);
    onChange && onChange();
  };

  const handleChangeDeleteType = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftsData({});
    setDeleteType(event.target.value);
  };

  const handleSaveDeleteDraftSettings = () => {
    let validateErrors: unknown[] = [];

    switch (deleteType) {
      case 'period':
        validateErrors = validateData(draftsData, periodSchema(t) as never);
        break;
      case 'time':
        validateErrors = (validateData(draftsData, dateSchema(t) as never) as unknown[]).concat(
          validateData(draftsData, timeSchema(t) as never) as unknown[],
        );
        break;
      case 'calculate':
        validateErrors = validateData(draftsData, calculateSchema(t) as never);
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

    const updatedSettings: Record<string, unknown> = {
      ...(newTask.taskTemplateEntity.jsonSchema as Record<string, unknown>),
    };

    switch (deleteType) {
      case 'period': {
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
      }
      case 'time': {
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
      }
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

  const setDefaultDraftsData = (task: TaskEntity) => {
    const settings = task.taskTemplateEntity.jsonSchema as {
      deleteDraftAt?: string;
      deleteDraftAfterCreateAt?: string;
      deleteDraftCalculated?: boolean;
      deleteDraftAfterUpdateAt?: string;
    };

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
      const date = moment(result as never).format('DD.MM.YYYY');
      const time = moment(result as never).format('HH:mm');
      setDraftsData({ date, time });
      return;
    }
  };

  React.useEffect(() => {
    const isLocalId = (id: string) =>
      taskElementTypes.some((type) => {
        const suffix = type.split(':').pop() as string;
        return id.indexOf(suffix) === 0;
      });

    const getNextTaskId = (element: BpmnElement) => {
      const ids = (modeler?.get('elementRegistry') as ElementRegistry)
        .getAll()
        .filter(
          ({ type, id }) =>
            taskElementTypes.includes(type) && id !== element.businessObject.id,
        )
        .filter(({ businessObject: { id } }) => !isLocalId(id))
        .map(getTaskId as never)
        .map(String)
        .map((taskId: string) => taskId.replace(workflow.id as string, ''))
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
        onChange?.();
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
              actions.requestTask as never,
              taskId,
            );

            if (task instanceof Error && task.message === '404 not found') {
              await actions.saveTaskData(emptyTask(taskId, { t, workflow: workflow as { id: string | number } }));
            } else {
              setDefaultDraftsData(task as TaskEntity);
            }
            setBusy(false);
          },
          250,
        );
      }
    };

    processList.hasOrSet('requestTask-init', loadTask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    userUnits as never,
  );

  return (
    <>
      <SchemaForm
        value={task}
        onChange={handleChangeAdapter(
          task,
          handleChange as never,
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
          handleChange as never,
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
          handleChangeSettings as never,
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
          handleChange as never,
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
        onChange={handleChangeAdapter(task, handleChange as never, false)}
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
                onChange={handleChangeAdapter(draftsData, setDraftsData as never, true)}
              />

              <Typography className={classes.fz14}>
                {t('After')}
              </Typography>

              <SchemaForm
                errors={errors}
                value={draftsData}
                schema={actionSchema(t)}
                onChange={handleChangeAdapter(draftsData, setDraftsData as never, true)}
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
                onChange={handleChangeAdapter(draftsData, setDraftsData as never, true)}
                schema={dateSchema(t)}
              />
              <Typography className={classes.fz14}>{t('At')}</Typography>
              <SchemaForm
                value={draftsData}
                errors={errors}
                onChange={handleChangeAdapter(
                  draftsData,
                  setDraftsData as never,
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
                onChange={handleChangeAdapter(draftsData, setDraftsData as never, true)}
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
            className={(classes as Record<string, string>).closeDialog}
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

interface TaskElementState {
  tasks: { actual: Record<string, TaskEntity> };
  auth: { info: Record<string, unknown>; userUnits: unknown[] };
}

const mapStateToProps = ({
  tasks: { actual },
  auth: { info: userInfo, userUnits },
}: TaskElementState) => ({
  actualTaskList: actual,
  userInfo,
  userUnits,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestTask: bindActionCreators(requestTask, dispatch),
    saveTaskData: bindActionCreators(saveTaskData, dispatch),
    changeTaskData: bindActionCreators(changeTaskData, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const translated = translate('WorkflowAdminPage')(TaskElement as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

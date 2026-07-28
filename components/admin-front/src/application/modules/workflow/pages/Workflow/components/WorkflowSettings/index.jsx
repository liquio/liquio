/* eslint-disable no-template-curly-in-string */
import React from 'react';
import PropTypes from 'prop-types';
import FileSaver from 'file-saver';
import classNames from 'classnames';
import cleanDeep from 'clean-deep';

import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';
import { saveSvgAsPng } from 'save-svg-as-png';

import {
  Button,
  CircularProgress,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import Switch from '@mui/material/Switch';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';

import { exportWorkflow } from 'actions/workflow';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';

import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';

import Editor from 'components/Editor';
import Select from 'components/JsonSchema/elements/Select';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import StringElement from 'components/JsonSchema/elements/StringElement';

import WorkflowCategorySelect from '../WorkflowCategorySelect';
import styles from './styles';

const blockTaskFunc = '() => false;';

const defaultStatusesValue = ({
  type,
  label,
  description,
}) => `(documents, events) => ([
  {
    type: "${type || 'doing|done|rejected'}",
    label: "${label || ''}",
    description: "${description || ''}",
    isStatusesTab: false
  }
]);
`;

const getCustomBody = (workflow) => ({
  hidden: workflow?.data?.entryTaskTemplateIds[0].hidden,
  block:
    (workflow?.data?.entryTaskTemplateIds[0].id || '').slice(0, 12) ===
    blockTaskFunc,
  disabledText: workflow?.data?.disabledText,
  userAccess: workflow?.data?.entryTaskTemplateIds[0].id,
  isOnlyOneDraftAllowed: workflow?.data?.isOnlyOneDraftAllowed || false,
  oneDraftAllowedMessage: workflow?.data?.oneDraftAllowedMessage,
});

const WorkflowSettings = ({
  t,
  classes,
  actions,
  workflow,
  handleChangeWorkflow,
  taskTemplates,
  events,
  workflowStatuses,
  numberTemplates,
  workflowSchema,
  errors,
  setErrors,
  unitSettingsSchema,
  modeler,
  handleSave,
  isPristine,
}) => {
  const [exporting, setExporting] = React.useState(false);
  const [openOwners, handleOpenOwners] = React.useState(false);
  const [openStatuses, handleOpenStatuses] = React.useState(false);
  const [exportType, handleExportChangeType] = React.useState('xml');
  const [originStatuses, handleSetStatuses] = React.useState(
    workflow?.data?.statuses,
  );
  const [customFields, handleCustomFields] = React.useState(
    getCustomBody(workflow),
  );
  const [expendMode, handleExpendMode] = React.useState(() => {
    if (!workflow?.data?.statuses.length) {
      return false;
    }

    const expand = (workflow?.data?.statuses || []).filter(
      ({ calculate }) => !!calculate,
    );

    const savedStatuses = workflow?.data?.statuses || [];

    return expand.length === savedStatuses.length;
  });

  const [editorErrors, onValidate] = React.useState([]);
  const [statusErrors, setStatusErrors] = React.useState({});

  const eventsMapped = events.map((el) => ({ ...el, type: 'event' }));
  const tasksMapped = taskTemplates.map((el) => ({ ...el, type: 'task' }));
  const taskOrEventTemplateIdArray = tasksMapped
    .concat(eventsMapped)
    .map(({ id, type, name }) => ({
      id: JSON.stringify({ id, type, name, sourceId: id }),
      sourceId: id,
      type,
      name: `${type}-${id} ${name}`,
    }));

  React.useEffect(() => {
    handleCustomFields(getCustomBody(workflow));
  }, [workflow]);

  const handleAddEntryTasks = () => {
    const workflowUpdated = { ...workflow };

    workflowUpdated.data.entryTaskTemplateIds.push({
      hidden: false,
    });

    handleChangeWorkflow(workflowUpdated);
  };

  const handleChangeBlockStart = ({ block, disabledText }) => {
    const workflowUpdated = { ...workflow };
    const customFieldsUpdated = { ...customFields, block };
    const currentValue = workflowUpdated.data.entryTaskTemplateIds[0].id;

    if (block) {
      workflowUpdated.data.disabledText = disabledText;
      workflowUpdated.data.entryTaskTemplateIds[0].id =
        blockTaskFunc + '\n//' + currentValue;
      customFieldsUpdated.userAccess = blockTaskFunc;
    } else {
      const enabledTaskFunc = `() => ${workflow.id}001;`;

      const lines = currentValue.match(
        /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm,
      ) || [enabledTaskFunc];

      let prevFunc = lines[0].replace('\n//', '');

      if (prevFunc === blockTaskFunc) {
        prevFunc = enabledTaskFunc;
      }

      workflowUpdated.data.entryTaskTemplateIds[0].id =
        prevFunc + '\n//' + currentValue;

      customFieldsUpdated.userAccess = prevFunc;
    }

    handleChangeWorkflow(workflowUpdated);
    handleCustomFields(customFieldsUpdated);
  };

  const handleChangeIsOnlyOneDraftAllowed = ({
    isOnlyOneDraftAllowed,
    oneDraftAllowedMessage,
  }) => {
    const workflowUpdated = { ...workflow };
    const customFieldsUpdated = { ...customFields };

    workflowUpdated.data.isOnlyOneDraftAllowed = isOnlyOneDraftAllowed;
    workflowUpdated.data.oneDraftAllowedMessage = oneDraftAllowedMessage;
    customFieldsUpdated.isOnlyOneDraftAllowed = isOnlyOneDraftAllowed;
    customFieldsUpdated.oneDraftAllowedMessage = oneDraftAllowedMessage;

    handleChangeWorkflow(workflowUpdated);
    handleCustomFields(customFieldsUpdated);
  };

  const handleChangeHidden = ({ hidden }) => {
    const workflowUpdated = { ...workflow };

    workflowUpdated.data.entryTaskTemplateIds[0].hidden = hidden;

    handleCustomFields({
      ...customFields,
      hidden: hidden,
    });

    handleChangeWorkflow(workflowUpdated);
  };

  const handleChangeUserAccess = ({ userAccess }) => {
    const workflowUpdated = { ...workflow };

    workflowUpdated.data.entryTaskTemplateIds[0].id = userAccess;

    handleCustomFields({
      ...customFields,
      userAccess: userAccess,
    });

    handleChangeWorkflow(workflowUpdated);
  };

  const handleAddStatuses = () => {
    const workflowUpdated = { ...workflow };

    workflowUpdated.data.statuses.push({});

    handleChangeWorkflow(workflowUpdated);
  };

  const handleOpenStatus = () => {
    if (!(workflow?.data?.statuses || []).length) {
      handleAddStatuses();
    } else {
      const { statuses } = workflow.data;

      const mappedStatuses = statuses.map((status) => {
        const { taskTemplateId, eventTemplateId } = status;

        if (taskTemplateId) {
          const taskId = taskOrEventTemplateIdArray.find((el) => {
            return el.type === 'task' && el.sourceId === taskTemplateId;
          });

          if (taskId) {
            status.taskOrEventTemplateId = taskId.id;
          }
        }

        if (eventTemplateId) {
          const eventId = taskOrEventTemplateIdArray.find((el) => {
            return el.type === 'event' && el.sourceId === eventTemplateId;
          });

          if (eventId) {
            status.taskOrEventTemplateId = eventId.id;
          }
        }

        return {
          ...status,
        };
      });

      const workflowUpdated = { ...workflow };

      workflowUpdated.data.statuses = mappedStatuses;

      handleChangeWorkflow(workflowUpdated);
    }

    handleOpenStatuses(true);
  };

  const handleChangeStatus = (statuses) => {
    const mappedStatuses = statuses.map(
      ({ taskOrEventTemplateId, ...rest }) => {
        if (!taskOrEventTemplateId) {
          return cleanDeep({
            calculate: rest?.calculate,
            statusId: rest?.statusId,
            label: rest?.label,
            description: rest?.description,
            taskOrEventTemplateId,
            taskTemplateId: undefined,
            eventTemplateId: undefined,
          });
        }

        const parsed = JSON.parse(taskOrEventTemplateId);

        return cleanDeep({
          calculate: rest?.calculate,
          statusId: rest?.statusId,
          label: rest?.label,
          description: rest?.description,
          taskOrEventTemplateId,
          taskTemplateId:
            parsed?.type === 'task' ? parsed?.sourceId : undefined,
          eventTemplateId:
            parsed?.type === 'event' ? parsed?.sourceId : undefined,
        });
      },
    );

    const timelineSteps = {
      steps: mappedStatuses
        .filter(({ calculate }) => !calculate)
        .map(({ taskTemplateId, eventTemplateId, description, label }) =>
          cleanDeep({
            taskTemplateId,
            eventTemplateId,
            description,
            label,
          }),
        ),
    };

    const workflowUpdated = { ...workflow };

    workflowUpdated.data.statuses = mappedStatuses;
    workflowUpdated.data.timeline = timelineSteps;

    handleChangeWorkflow(workflowUpdated);
  };

  const handleSaveStatuses = () => {
    if (expendMode) {
      const workflowUpdated = { ...workflow };
      workflowUpdated.data.timeline = {};
      handleChangeWorkflow(workflowUpdated);
    }

    const labelRequired = workflow?.data?.statuses.findIndex(
      (status) =>
        !status.calculate && !status.label && Object.keys(status).length !== 0,
    );

    if (labelRequired !== -1 || editorErrors.length) {
      setErrors(errors);
      setStatusErrors({ label: labelRequired });
      return;
    }
    handleSetStatuses(workflow.data.statuses);
    setErrors([]);
    setStatusErrors({});

    handleOpenStatuses(false);

    handleSave();
  };

  const undoStatuses = () => {
    const workflowUpdated = { ...workflow };

    workflowUpdated.data.statuses = originStatuses;

    handleSetStatuses(originStatuses);

    handleChangeWorkflow(workflowUpdated);

    setErrors([]);

    handleOpenStatuses(false);
  };

  const handleExportSchema = async () => {
    try {
      switch (exportType) {
        case 'xml': {
          const xmlBlob = new Blob([workflow?.xmlBpmnSchema], {
            type: 'application/octet-stream',
          });

          FileSaver.saveAs(xmlBlob, `${workflow.name}.xml`);
          break;
        }
        case 'svg': {
          modeler.saveSVG({ format: true }, function (error, svg) {
            if (error) return;

            const svgBlob = new Blob([svg], {
              type: 'image/svg+xml',
            });

            FileSaver.saveAs(svgBlob, `${workflow.name}.svg`);
          });
          break;
        }
        case 'png': {
          modeler.saveSVG({ format: true }, function (error, svg) {
            if (error) return;

            const container = document.createElement('div');
            container.innerHTML = svg;

            const viewBox = container
              .querySelector('svg')
              .getAttribute('viewBox');
            const width = container.querySelector('svg').getAttribute('width');
            const height = container
              .querySelector('svg')
              .getAttribute('height');

            saveSvgAsPng(
              container.querySelector('svg'),
              `${workflow.name}.png`,
              {
                backgroundColor: '#fff',
                width: width,
                height: height,
                left: viewBox.split(' ')[0],
                top: viewBox.split(' ')[1],
              },
            );
          });
          break;
        }
        case 'bpmn': {
          if (exporting) return;

          setExporting(true);

          const blob = await actions.exportWorkflow(workflow?.id);

          setExporting(false);

          FileSaver.saveAs(blob, `${workflow.name}.bpmn`);
          break;
        }
        default: {
          break;
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleDeleteStatus = (index) => {
    const workflowUpdated = { ...workflow };

    workflowUpdated.data.statuses.splice(index, 1);

    handleChangeWorkflow(workflowUpdated);
  };

  const handleChangeStatusesMode = () => {
    const activeValue = !expendMode;

    const workflowUpdated = { ...workflow };
    const statuses = workflowUpdated?.data?.statuses || [];

    if (!activeValue) {
      const statusesDeleteFields = statuses.map((item) => {
        delete item.calculate;
        delete item.isStatusesTab;
        return item;
      });

      handleChangeStatus(statusesDeleteFields);
    } else {
      const statusesAddFields = statuses.map((item) => {
        item.calculate = getStatusEditorValue(item);
        delete item.label;
        delete item.description;
        return item;
      });

      handleChangeStatus(statusesAddFields);
    }

    handleExpendMode(activeValue);
  };

  const handleChangeStatusEditor =
    ({ index }) =>
      (calculate) => {
        const workflowUpdated = { ...workflow };

        const status = workflowUpdated?.data?.statuses[index];

        const { taskOrEventTemplateId, taskTemplateId, eventTemplateId } = status;

        const updatedStatusInfo = cleanDeep({
          taskTemplateId,
          eventTemplateId,
          taskOrEventTemplateId,
          calculate,
        });

        workflowUpdated.data.statuses[index] = updatedStatusInfo;

        handleChangeWorkflow(workflowUpdated);
      };

  const getStatusEditorValue = (status) => {
    const { calculate, label, description, statusId } = status;

    if (!calculate) {
      return defaultStatusesValue({
        type: workflowStatuses.find(({ id }) => statusId === id)?.name || '',
        label,
        description,
      });
    }

    return calculate;
  };

  const handleChangeStatusField =
    ({ name, index }) =>
      (value) => {
        const workflowUpdated = { ...workflow };

        workflowUpdated.data.statuses[index][name] = value;

        handleChangeStatus(workflowUpdated.data.statuses);
      };

  const handleChangeCategory = (value) => {
    const workflowUpdated = { ...workflow };

    workflowUpdated.workflowTemplateCategoryId = value;

    handleChangeWorkflow(workflowUpdated);
  };

  const changeStatusPlace = (index, position) => {
    const workflowUpdated = { ...workflow };
    const arrayStatus = workflowUpdated.data.statuses;
    const startIndex = position === 'up' ? index - 1 : index + 1;
    arrayStatus[index] = arrayStatus.splice(
      startIndex,
      1,
      arrayStatus[index],
    )[0];
    handleChangeStatus(arrayStatus);
  };

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

  return (
    <>
      <SchemaForm
        errors={errors}
        value={workflow}
        onChange={handleChangeAdapter(
          workflow,
          handleChangeWorkflow,
          true,
          workflowSchema,
        )}
        schema={{
          type: 'object',
          properties: {
            isActive: {
              control: 'toggle',
              darkTheme: true,
              noMargin: true,
              fullWidth: true,
              reverseValue: true,
              onText: t('StopProcess'),
              labelPlacement: 'end',
            },
          },
        }}
      />

      <SchemaForm
        errors={errors}
        value={customFields}
        onChange={handleChangeAdapter(
          customFields,
          handleChangeBlockStart,
          true,
        )}
        schema={{
          type: 'object',
          properties: {
            block: {
              control: 'toggle',
              darkTheme: true,
              noMargin: true,
              fullWidth: true,
              onText: t('BlockStart'),
              labelPlacement: 'end',
            },
            divider1: {
              control: 'divider',
              darkTheme: true,
              margin: 12,
              checkHidden:
                '(value, step, documentData, parentData) => !parentData.block',
            },
            label: {
              control: 'text.block',
              htmlBlock: `
                <span style="color: #fff;font-size: 16px;line-height: 19px;margin-bottom: 8px; font-weight: 500;display: inline-block;">
                  ${t('DisabledText')}
                </span>
              `,
              checkHidden:
                '(value, step, documentData, parentData) => !parentData.block',
            },
            disabledText: {
              type: 'string',
              darkTheme: true,
              variant: 'outlined',
              noMargin: true,
              multiline: true,
              rows: 3,
              notRequiredLabel: '',
              checkHidden:
                '(value, step, documentData, parentData) => !parentData.block',
            },
            divider2: {
              control: 'divider',
              darkTheme: true,
              margin: 12,
              checkHidden:
                '(value, step, documentData, parentData) => !parentData.block',
            },
          },
        }}
      />

      <SchemaForm
        errors={errors}
        value={customFields}
        onChange={handleChangeAdapter({}, handleChangeHidden, true)}
        schema={{
          type: 'object',
          properties: {
            hidden: {
              control: 'toggle',
              darkTheme: true,
              noMargin: true,
              fullWidth: true,
              onText: t('HideInCabinet'),
              labelPlacement: 'end',
            },
          },
        }}
      />

      {renderDivider}

      <SchemaForm
        errors={errors}
        value={customFields}
        onChange={handleChangeAdapter(
          {},
          handleChangeUserAccess,
          true,
          workflowSchema,
        )}
        handleSave={handleSave}
        schema={{
          type: 'object',
          properties: {
            userAccess: {
              control: 'code.editor',
              description: t('AccessRools'),
              mode: 'javascript',
              darkTheme: true,
              validate: true,
              noMargin: true,
            },
          },
        }}
      />

      {renderDivider}

      <Button className={classes.actionWrapper} onClick={handleOpenStatus}>
        <Typography
          className={classNames(classes.actionLabel, classes.biggerLabel)}
        >
          {t('WorkflowStatuses')}
        </Typography>
        <MoreHorizOutlinedIcon />
      </Button>

      {renderDivider}

      <Dialog
        open={openStatuses}
        onClose={() => undoStatuses()}
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
          {t('WorkflowStatuses')}
        </DialogTitle>

        <DialogContent>
          <>
            <FormGroup className={classes.switchWrapper}>
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    name="expendMode"
                    checked={expendMode}
                    onChange={handleChangeStatusesMode}
                  />
                }
                labelPlacement="start"
                label={t('WorkflowStatusesExpand')}
              />
            </FormGroup>

            {(workflow?.data?.statuses || []).map((status, index) => (
              <>
                {workflow?.data?.statuses.length > 1 ? (
                  <div className={classes.deleteButtonContainer}>
                    <Tooltip title={t('DeleteStatus')}>
                      <IconButton
                        onClick={() => handleDeleteStatus(index)}
                        size="large"
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                ) : null}
                {expendMode &&
                  workflow?.data?.statuses.length > 1 &&
                  index > 0 ? (
                  <div className={classes.deleteButtonContainer}>
                    <Tooltip title={t('UpStatus')}>
                      <IconButton
                        onClick={() => changeStatusPlace(index, 'up')}
                        size="large"
                      >
                        <KeyboardArrowUpIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                ) : null}
                {expendMode &&
                  workflow?.data?.statuses.length > 1 &&
                  index < workflow?.data?.statuses.length - 1 ? (
                  <div className={classes.deleteButtonContainer}>
                    <Tooltip title={t('DownStatus')}>
                      <IconButton
                        onClick={() => changeStatusPlace(index, 'down')}
                        size="large"
                      >
                        <KeyboardArrowDownIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                ) : null}

                <div
                  className={classNames({
                    [classes.statusWrapper]: true,
                    [classes.firstStatus]: index === 0,
                  })}
                >
                  {expendMode ? (
                    <>
                      <Select
                        options={taskOrEventTemplateIdArray}
                        description={t('StatusTargetTemplate')}
                        darkTheme={true}
                        variant={'outlined'}
                        value={status?.taskOrEventTemplateId}
                        onChange={handleChangeStatusField({
                          name: 'taskOrEventTemplateId',
                          index,
                        })}
                      />

                      <Typography className={classes.editorLabel}>
                        {t('WorkflowStatusesExpandDescription')}
                      </Typography>

                      <Editor
                        width={'100%'}
                        height={200}
                        language="javascript"
                        value={getStatusEditorValue(status)}
                        onChange={handleChangeStatusEditor({
                          index,
                        })}
                        onValidate={(validateErrors) => {
                          onValidate(
                            validateErrors.filter(
                              ({ severity }) => severity > 1, // filter out warnings
                            ),
                          );
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div className={classes.statusWrapper}>
                        <Select
                          options={taskOrEventTemplateIdArray}
                          description={t('StatusTargetTemplate')}
                          darkTheme={true}
                          variant={'outlined'}
                          value={status?.taskOrEventTemplateId}
                          onChange={handleChangeStatusField({
                            name: 'taskOrEventTemplateId',
                            status,
                            index,
                          })}
                        />
                      </div>

                      <div className={classes.statusWrapper}>
                        <Select
                          options={workflowStatuses}
                          description={t('WorkflowStatus')}
                          darkTheme={true}
                          variant={'outlined'}
                          value={status?.statusId}
                          onChange={handleChangeStatusField({
                            name: 'statusId',
                            index,
                          })}
                        />
                      </div>

                      <StringElement
                        value={status?.label}
                        darkTheme={true}
                        variant={'outlined'}
                        description={t('WorkflowTimelineLabel')}
                        notRequiredLabel={''}
                        onChange={handleChangeStatusField({
                          name: 'label',
                          index,
                        })}
                        error={
                          statusErrors?.label === index
                            ? {
                              keyword: '',
                              message: t('RequiredField'),
                            }
                            : null
                        }
                      />

                      <StringElement
                        value={status?.description}
                        darkTheme={true}
                        multiline={true}
                        cutTags={false}
                        rows={5}
                        noMargin={true}
                        variant={'outlined'}
                        description={t('WorkflowTimelineDescription')}
                        notRequiredLabel={''}
                        onChange={handleChangeStatusField({
                          name: 'description',
                          index,
                        })}
                      />
                    </>
                  )}
                </div>
              </>
            ))}
          </>
        </DialogContent>
        <DialogActions
          classes={{
            root: classNames(classes.dialogActionsRoot),
          }}
        >
          <Button
            color="primary"
            variant="contained"
            onClick={() => handleAddStatuses()}
          >
            <AddOutlinedIcon className={classes.icon} />
            {t('AddStatus')}
          </Button>

          <div style={{ flexGrow: 1 }} />

          <Button onClick={undoStatuses} className={classes.closeDialog}>
            {t('Close')}
          </Button>

          <Button
            color="primary"
            variant="contained"
            onClick={handleSaveStatuses}
            disabled={isPristine}
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>

      <SchemaForm
        schema={{
          type: 'object',
          properties: {
            label: {
              control: 'text.block',
              htmlBlock: `
                <span style="color: #fff;font-size: 16px;line-height: 19px;margin-bottom: 8px;font-weight: 500;display: inline-block;">
                  ${t('NumberTemplate')}
                </span>
              `,
            },
          },
        }}
      />

      <SchemaForm
        value={workflow}
        errors={errors}
        onChange={handleChangeAdapter(
          workflow,
          handleChangeWorkflow,
          true,
          workflowSchema,
        )}
        schema={{
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                numberTemplateId: {
                  control: 'select',
                  options: numberTemplates,
                  darkTheme: true,
                  noMargin: true,
                  variant: 'outlined',
                },
              },
            },
          },
        }}
      />

      {renderDivider}

      <Button
        className={classNames({
          [classes.actionWrapper]: true,
          [classes.actionWrapperMargin]: true,
          [classes.noMargin]: workflow?.data?.entryTaskTemplateIds.length === 1,
        })}
        onClick={handleAddEntryTasks}
      >
        <Typography
          className={classNames({
            [classes.actionLabel]: true,
            [classes.biggerLabel]: true,
          })}
        >
          {t('WorkflowEntryTask')}
        </Typography>
        <AddOutlinedIcon />
      </Button>

      {(workflow?.data?.entryTaskTemplateIds || []).length === 1 ? null : (
        <SchemaForm
          value={workflow}
          errors={errors}
          onChange={handleChangeAdapter(
            workflow,
            handleChangeWorkflow,
            true,
            workflowSchema,
          )}
          schema={{
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  entryTaskTemplateIds: {
                    control: 'table',
                    type: 'array',
                    notRequiredLabel: '',
                    allowEmpty: true,
                    darkTheme: true,
                    noMargin: true,
                    toolbar: false,
                    onText: t('ShowInCreateTaskDialog'),
                    offText: t('HideInCreateTaskDialog'),
                    hiddenRows: [workflow?.data?.entryTaskTemplateIds[0].name],
                    headerCellStyle: {
                      display: 'none',
                    },
                    items: {
                      name: {
                        type: 'string',
                        description: '',
                        width: 134,
                        maxLength: 255,
                        darkTheme: true,
                        noMargin: true,
                        padding: 'none',
                        variant: 'outlined',
                        cellStyle: {
                          minWidth: 'unset',
                          border: 'none',
                          paddingRight: 5,
                          paddingBottom: 15,
                        },
                      },
                      hidden: {
                        control: 'toggle',
                        darkTheme: true,
                        fullWidth: true,
                        noMargin: true,
                        labelPlacement: 'start',
                        description: '',
                        eyeIcon: true,
                        width: 43,
                        padding: 'none',
                        cellStyle: {
                          minWidth: 'unset',
                          border: 'none',
                          paddingBottom: 15,
                        },
                      },
                      id: {
                        control: 'code.editor',
                        description: '',
                        darkTheme: true,
                        noMargin: true,
                        mode: 'javascript',
                        padding: 'none',
                        cellStyle: {
                          minWidth: 'unset',
                          border: 'none',
                          paddingBottom: 15,
                        },
                      },
                    },
                    required: [],
                  },
                },
              },
            },
          }}
        />
      )}

      {renderDivider}

      <SchemaForm
        schema={{
          type: 'object',
          properties: {
            label: {
              control: 'text.block',
              htmlBlock: `
                            <span style="color: #fff;font-size: 16px;line-height: 19px;margin-bottom: 8px; font-weight: 500;display: inline-block;">
                                ${t('Deadline')}
                            </span>
                        `,
            },
          },
        }}
      />

      <SchemaForm
        errors={errors}
        value={workflow}
        onChange={handleChangeAdapter(
          workflow,
          handleChangeWorkflow,
          true,
          workflowSchema,
        )}
        schema={{
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                deadline: {
                  type: 'string',
                  helperText: `<span style="color: rgba(255, 255, 255, 0.6);font-size: 11px;">${t(
                    'DeadlineSample',
                  )}</span>`,
                  darkTheme: true,
                  noMargin: true,
                  multiline: true,
                  rows: 3,
                  maxLength: 10,
                  notRequiredLabel: '',
                  variant: 'outlined',
                },
              },
            },
          },
        }}
      />

      {workflow?.workflowTemplateCategoryId && (
        <>
          {renderDivider}
          <WorkflowCategorySelect
            value={workflow?.workflowTemplateCategoryId}
            onChange={handleChangeCategory}
          />
        </>
      )}

      {renderDivider}

      <SchemaForm
        errors={errors}
        value={customFields}
        onChange={handleChangeAdapter(
          customFields,
          handleChangeIsOnlyOneDraftAllowed,
          true,
        )}
        handleSave={handleSave}
        schema={{
          type: 'object',
          properties: {
            isOnlyOneDraftAllowed: {
              control: 'toggle',
              darkTheme: true,
              noMargin: true,
              fullWidth: true,
              onText: t('isOnlyOneDraftAllowed'),
              labelPlacement: 'end',
            },
            margin: {
              control: 'text.block',
              htmlBlock: '<div style="margin-bottom: 8px;" />',
              checkHidden:
                '(value, step, documentData, parentData) => !parentData.isOnlyOneDraftAllowed',
            },
            oneDraftAllowedMessage: {
              control: 'code.editor',
              description: t('DisabledText'),
              mode: 'html',
              darkTheme: true,
              validate: true,
              noMargin: true,
              defaultHtmlValue: false,
              checkHidden:
                '(value, step, documentData, parentData) => !parentData.isOnlyOneDraftAllowed',
            },
          },
        }}
      />

      {renderDivider}

      <Button
        className={classes.actionWrapper}
        onClick={() => handleOpenOwners(!openOwners)}
      >
        <Typography className={classes.actionLabel}>
          {t('ProcessOwners')}
        </Typography>
        <KeyboardArrowDownOutlinedIcon />
      </Button>

      {openOwners ? (
        <SchemaForm
          value={workflow}
          onChange={handleChangeAdapter(
            workflow,
            handleChangeWorkflow,
            true,
            workflowSchema,
          )}
          schema={unitSettingsSchema}
          handleSave={handleSave}
        />
      ) : null}

      {renderDivider}

      <SchemaForm
        schema={{
          type: 'object',
          properties: {
            label: {
              control: 'text.block',
              htmlBlock: `
                            <span style="color: #fff;font-size: 16px;line-height: 19px;margin-bottom: 8px;font-weight: 500;display: inline-block;">
                                ${t('ExportBlockTitle')}
                            </span>
                        `,
            },
          },
        }}
      />

      <div className={classes.exportBlockWrapper}>
        <SchemaForm
          value={{ exportType }}
          onChange={(name, value) => handleExportChangeType(value)}
          schema={{
            type: 'object',
            properties: {
              exportType: {
                control: 'select',
                options: [
                  {
                    id: 'xml',
                    name: 'XML',
                  },
                  {
                    id: 'png',
                    name: 'PNG',
                  },
                  {
                    id: 'svg',
                    name: 'SVG',
                  },
                  {
                    id: 'bpmn',
                    name: 'BPMN',
                  },
                ],
                width: 110,
                darkTheme: true,
                noMargin: true,
                allowDelete: false,
                variant: 'outlined',
              },
            },
          }}
        />

        <Button onClick={handleExportSchema} className={classes.exportButton}>
          {exporting ? (
            <CircularProgress size={16} className={classes.fillSvg} />
          ) : null}
          {t('Export')}
        </Button>
      </div>
    </>
  );
};

WorkflowSettings.propTypes = {
  workflow: PropTypes.object,
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  workflowSchema: PropTypes.object.isRequired,
  onClose: PropTypes.func,
  onChange: PropTypes.func,
  isPristine: PropTypes.bool,
};

WorkflowSettings.defaultProps = {
  workflow: {},
  onClose: () => null,
  onChange: () => null,
  isPristine: false,
};

const styled = withStyles(styles)(WorkflowSettings);

const mapDispatchToProps = (dispatch) => ({
  actions: {
    exportWorkflow: bindActionCreators(exportWorkflow, dispatch),
  },
});

const translated = translate('WorkflowAdminPage')(styled);

export default connect(null, mapDispatchToProps)(translated);

import React, { useCallback } from 'react';
import { translate } from 'react-translate';
import { history } from 'store';
import { bindActionCreators } from 'redux';
import { connect, useDispatch } from 'react-redux';
import uuid from 'uuid-random';
import {
  IconButton,
  Tooltip,
  FormGroup,
  Checkbox,
  Typography,
  Button,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import RepeatIcon from '@mui/icons-material/Repeat';
import ReportOffOutlinedIcon from '@mui/icons-material/ReportOffOutlined';
import DataTable from 'components/DataTable';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import useTable from 'services/dataTable/useTable';
import urlHashParams from 'helpers/urlHashParams';
import asModulePage from 'hooks/asModulePage';
import { addError , addMessage } from 'actions/error';
import {
  restartWorkflowIds,
  restartProcessFromPoint,
  checkAsNotError,
 requestWorkflowProcessBrief } from 'actions/workflowProcess';
import { requestWorkflows, requestWorkflow } from 'actions/workflow';
import endPoint from 'application/endPoints/journal';
import dataTableSettings from 'modules/workflow/pages/JournalList/variables/dataTableSettings';
import ConfirmDialog from 'components/ConfirmDialog';
import Message from 'components/Snackbars/Message';
import toCamelCase from 'helpers/toCamelCase';
import flatten from 'helpers/flatten';
import queueFactory from 'helpers/queueFactory';
import gatewayElementTypes from 'application/modules/workflow/variables/gatewayElementTypes';
import eventElementTypes from 'application/modules/workflow/variables/eventElementTypes';
import taskElementTypes from 'application/modules/workflow/variables/taskElementTypes';
import { toUnderscoreObject } from 'helpers/toUnderscore';
import checkAccess from 'helpers/checkAccess';

const styles = (theme) => ({
  checked: {
    '& svg': {
      fill: theme.palette.primary.main,
    },
  },
  centerWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 10,
  },
  selectedHeader: {
    display: 'flex',
    alignItems: 'center',
    '& > button': {
      marginLeft: 10,
    },
  },
  iconButton: {
    marginRight: 0,
    marginLeft: 5,
  },
});

const useStyles = makeStyles(styles);

const ProcessesListPage = ({
  t,
  title,
  location,
  userUnits,
  userInfo,
  importActions,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [chosenRestartPoint, setChosenRestartPoint] = React.useState([]);
  const [rowsSelected, stateOnRowsSelect] = React.useState([]);
  const [allowedFilters, setAllowedFilters] = React.useState();
  const [elasticError, setElasticError] = React.useState();
  const [workflows, setWorkflows] = React.useState([]);
  const [valuePoint, setPointValue] = React.useState({});
  const [helperText, setHelperText] = React.useState('');
  const [restartFromPoint, setRestartFromPoint] = React.useState(null);
  const [allSelectedTriggered, setAllSelected] = React.useState(false);
  const [workflowProcessBrief, setWorkflowProcessBrief] = React.useState(null);
  const [workflowIdMap, setWorkflowIdMap] = React.useState(new Map());
  const [showDialog, setShowDialog] = React.useState(false);
  const [proccesWithErrors, setProccesWithErrors] = React.useState([]);
  const [finishedProcesses, setFinishedProcesses] = React.useState(0);

  const isEditable = checkAccess(
    { userHasUnit: [1000003, 100003, 1000001] },
    userInfo,
    userUnits,
  );

  const classes = useStyles();

  const queue = React.useMemo(() => queueFactory.get('subscribeQueue'), []);

  const dispatch = useDispatch();

  const tableData = useTable(endPoint, {
    filters: urlHashParams(),
    onLoad: ({ meta = {} } = {}) => {
      if (meta.errorMessage && meta.allowedFilters && !allowedFilters) {
        setElasticError(meta.errorMessage);
        setAllowedFilters(
          meta.allowedFilters
            .map(toCamelCase)
            .map((value) => value.charAt(0).toLowerCase() + value.slice(1)),
        );
      }
    },
  });

  const emptyPointsToRestart = !tableData?.filters?.workflowTemplateId || false;

  React.useEffect(() => {
    if (!tableData.error) {
      return;
    }

    dispatch(addError(new Error('FailFetchingRows')));
  }, [dispatch, t, tableData.error]);

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await importActions.requestWorkflows('short=true');
      if (result instanceof Error) return;
      setWorkflows(result);
    };

    fetchData();
  }, [importActions]);

  const onRowsSelect = useCallback(
    (rows) => {
      stateOnRowsSelect(rows);
      setWorkflowProcessBrief(false);
      const workflowIdMap = new Map();
      const proccesWithErrors = [];
      rows.forEach((processId) => {
        const item = tableData.data.find((row) => row.id === processId);
        if (!item) return;
        workflowIdMap.set(item.id, item.workflowTemplateId);
        if (item.hasUnresolvedErrors) {
          proccesWithErrors.push(item.id);
        }
      });
      setProccesWithErrors(proccesWithErrors);
      setWorkflowIdMap(workflowIdMap);
    },
    [tableData.data, stateOnRowsSelect],
  );

  React.useEffect(() => {
    onRowsSelect([]);
    setFinishedProcesses(0);
    setAllSelected(false);
    setWorkflowProcessBrief(false);
  }, [onRowsSelect, tableData.filters]);

  const onRowsSelectAll = (checked) => {
    if (checked.length) {
      onRowsSelect(checked);
      setAllSelected(true);
    } else {
      onRowsSelect([]);
      setAllSelected(false);
      setWorkflowProcessBrief(false);
    }
  };

  const startRestartProcess = async () => {
    if (loading) return;

    setLoading(true);

    const result = await importActions.restartWorkflowIds(rowsSelected);

    if (result instanceof Error) {
      importActions.addMessage(new Message(t('ErrorRestart'), 'error'));
      return;
    }

    importActions.addMessage(
      new Message(t('RestartSuccessSuccess'), 'success'),
    );

    setOpen(false);
    setLoading(false);
  };

  const handleCloseRestart = () => {
    setLoading(false);
    setOpen(false);
    setShowDialog(false);
    setRestartFromPoint(null);
    setHelperText('');
    setPointValue({});
  };

  const handleCheckAsNotError = () => {
    if (loading) return;

    setLoading(true);

    queue.removeAllListeners('end');

    queue.on('end', () => {
      handleCloseRestart();
      importActions.addMessage(
        new Message(t('CheckAsNotErrorSuccess'), 'success'),
      );
    });

    proccesWithErrors.forEach((processId) => {
      queue.push(async () => {
        await checkAsNotError(processId)(dispatch);
        setFinishedProcesses((prev) => prev + 1);
      });
    });

    queue.push(async () => await tableData.actions.load());
  };

  const startRestartFromPointProcess = () => {
    if (loading) return;

    setLoading(true);

    queue.on('end', () => {
      handleCloseRestart();
      importActions.addMessage(
        new Message(t('RestartSuccessSuccess'), 'success'),
      );
    });

    rowsSelected.forEach((processId) => {
      queue.push(async () => {
        const body = {
          ...valuePoint,
        };

        Object.keys(body).forEach((key) => {
          body[key] = parseInt(body[key].split('-').pop(), 10);
        });

        await restartProcessFromPoint(processId, {
          ...body,
          workflowTemplateId: workflowIdMap.get(processId),
          workflowId: processId,
          userId: 'system',
        })(dispatch);
      });
    });

    queue.push(async () => await tableData.actions.load());
  };

  const restartProcesses = () => {
    if (loading) return;

    if (restartFromPoint) {
      if (!Object.keys(valuePoint).length) {
        setHelperText(t('RequiredField'));
        return;
      }
      startRestartFromPointProcess();
    } else {
      startRestartProcess();
    }
  };

  const CustomToolbar = () =>
    rowsSelected.length ? (
      <>
        {isEditable && (
          <Tooltip title={t('RestartProcessTooltip')}>
            <IconButton
              className={classes.iconButton}
              onClick={() => {
                setOpen(true);
                getPointsFromLogs();
              }}
              size="large"
            >
              <RepeatIcon />
            </IconButton>
          </Tooltip>
        )}
        {proccesWithErrors.length ? (
          <Tooltip title={t('CheckAsNotError')}>
            <IconButton
              onClick={() => {
                setShowDialog(true);
              }}
              size="large"
            >
              <ReportOffOutlinedIcon />
            </IconButton>
          </Tooltip>
        ) : null}
      </>
    ) : null;

  const getPointsFromLogs = async () => {
    const workflowTemplateId = tableData?.filters?.workflowTemplateId;

    if (!workflowTemplateId) return;

    setLoading(true);

    const diagram = (await requestWorkflow(workflowTemplateId)(dispatch))
      .xmlBpmnSchema;

    setLoading(false);

    const xmlDoc = new DOMParser().parseFromString(diagram, 'text/xml');

    const parseFromXml = (elementType) => {
      const elements = [];

      (elementType || []).forEach((event) => {
        const elementName = event.split(':')[1];
        const elementNameUpdated =
          elementName.charAt(0).toLowerCase() + elementName.slice(1);
        const elementsArray = xmlDoc.querySelectorAll(elementNameUpdated);
        elements.push(Array.from(elementsArray));
      });

      const element = flatten(elements).map((domElement) => ({
        id: domElement.id,
        name: domElement.getAttribute('name'),
      }));

      return element;
    };

    const events = parseFromXml(eventElementTypes);
    const tasks = parseFromXml(taskElementTypes);
    const gateways = parseFromXml(gatewayElementTypes);

    const dataToRender = {
      taskTemplateId: tasks,
      eventTemplateId: events,
      gatewayTemplateId: gateways,
    };

    setChosenRestartPoint(dataToRender);
  };

  const handleChangePoint = (event, type) =>
    setPointValue({
      [type]: event.target.value,
    });

  const handleSelectAll = async () => {
    if (workflowProcessBrief) {
      onRowsSelect([]);
      setAllSelected(false);
      setWorkflowProcessBrief(false);
      setFinishedProcesses(0);
      return;
    }

    if (loading) return;

    setLoading(true);

    const workflowsToRestart = await importActions.requestWorkflowProcessBrief({
      brief_info: true,
      filters: toUnderscoreObject(tableData.filters),
    });

    onRowsSelect(workflowsToRestart.map(({ id }) => id));

    const workflowIdMap = new Map();
    workflowsToRestart.forEach((item) => {
      workflowIdMap.set(item.id, item.workflowTemplateId);
    });
    const proccesWithErrors = [];
    workflowsToRestart.forEach((item) => {
      if (item.hasUnresolvedErrors) {
        proccesWithErrors.push(item.id);
      }
    });
    setProccesWithErrors(proccesWithErrors);

    setWorkflowIdMap(workflowIdMap);
    setWorkflowProcessBrief(true);
    setLoading(false);
  };

  const CustomToolbarHelper = () => (
    <>
      {allSelectedTriggered ? (
        <div className={classes.centerWrapper}>
          <Typography className={classes.selectedHeader}>
            <span>
              {t('AllSelected', {
                count: rowsSelected.length,
              })}
            </span>
            <Button onClick={handleSelectAll}>
              {t(
                !workflowProcessBrief ? 'AllSelectedAction' : 'ClearSelection',
              )}
            </Button>
          </Typography>
        </div>
      ) : null}
    </>
  );

  return (
    <LeftSidebarLayout
      title={t(title)}
      location={location}
      loading={tableData.loading}
    >
      <DataTable
        {...dataTableSettings({
          t,
          userUnits,
          userInfo,
          CustomToolbar,
          allowedFilters,
          darkTheme: true,
          workflows,
        })}
        {...tableData}
        rowsSelected={rowsSelected}
        CustomToolbarHelper={CustomToolbarHelper}
        actions={{
          ...tableData.actions,
          onRowsSelect,
          onRowsSelectAll,
        }}
        onRowClick={(rowData, row, event) => {
          const { id } = rowData;
          if (event.ctrlKey || event.metaKey) {
            window.open(`/workflow/journal/${id}`, '_blank');
          } else {
            history.push(`/workflow/journal/${id}`);
          }
        }}
      />

      <ConfirmDialog
        open={open}
        title={t('RestartPrompt')}
        description={
          workflowProcessBrief
            ? t('RestartPromptAllDescription')
            : t('RestartPromptDescription', {
                count: `(${rowsSelected.length})`,
              })
        }
        handleClose={handleCloseRestart}
        handleConfirm={restartProcesses}
        darkTheme={true}
        loading={loading}
      >
        {emptyPointsToRestart ? (
          <Typography>{t('restartFromPointDescription')}</Typography>
        ) : (
          <>
            <FormGroup
              style={{
                marginTop: 20,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={restartFromPoint}
                    onChange={(event) => {
                      setRestartFromPoint(event.target.checked);
                    }}
                    classes={{
                      checked: classes.checked,
                    }}
                    name="restartFromPoint"
                  />
                }
                label={t('RestartProcessFromPointTooltip')}
              />
            </FormGroup>
            {restartFromPoint ? (
              <FormControl component="fieldset" error={helperText.length}>
                {(Object.keys(chosenRestartPoint || {}) || []).map((type) => (
                  <RadioGroup
                    key={uuid()}
                    aria-label={type}
                    name={type}
                    value={valuePoint[type]}
                    onChange={(event) => handleChangePoint(event, type)}
                  >
                    {(chosenRestartPoint[type] || []).map(({ id, name }) => (
                      <FormControlLabel
                        key={uuid()}
                        value={id}
                        control={
                          <Radio
                            color="secondary"
                            classes={{
                              checked: classes.checked,
                            }}
                          />
                        }
                        label={t(type, {
                          value: `${id}, ${name}`,
                        })}
                      />
                    ))}
                  </RadioGroup>
                ))}
                <FormHelperText>{helperText}</FormHelperText>
              </FormControl>
            ) : null}
          </>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={showDialog}
        darkTheme={true}
        handleClose={() => setShowDialog(false)}
        handleConfirm={handleCheckAsNotError}
        title={t('CheckAsNotErrorMassTitle')}
        description={
          loading
            ? t('CheckAsNotErrorMassProcessing', {
                count: `${proccesWithErrors.length}`,
                value: `${finishedProcesses}`,
              })
            : t('CheckAsNotErrorMassDescription', {
                count: `${proccesWithErrors.length}`,
              })
        }
        disabled={loading}
        loading={loading}
      />

      <ConfirmDialog
        darkTheme={true}
        open={!!elasticError}
        title={t('ElasticError')}
        description={t(elasticError)}
        handleClose={setElasticError}
      />
    </LeftSidebarLayout>
  );
};

const mapStateToProps = ({ auth: { userUnits, info } }) => ({
  userUnits,
  userInfo: info,
});

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    restartWorkflowIds: bindActionCreators(restartWorkflowIds, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    requestWorkflows: bindActionCreators(requestWorkflows, dispatch),
    requestWorkflow: bindActionCreators(requestWorkflow, dispatch),
    requestWorkflowProcessBrief: bindActionCreators(
      requestWorkflowProcessBrief,
      dispatch,
    ),
  },
});

const modulePage = asModulePage(ProcessesListPage);
const translated = translate('ProcessesListPage')(modulePage);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

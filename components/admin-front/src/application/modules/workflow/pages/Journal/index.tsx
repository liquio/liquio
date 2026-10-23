import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { history } from 'store';
import {
  Button,
  Toolbar,
  Chip,
  Tooltip,
  FormGroup,
  FormControlLabel,
  Switch,
  Typography,
  Popover,
  MenuList,
  MenuItem,
  Paper,
  ClickAwayListener,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import DoNotDisturbAltIcon from '@mui/icons-material/DoNotDisturbAlt';
import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import ModulePage, { type ModulePageProps } from 'components/ModulePage';
import ErrorScreenRaw from 'components/ErrorScreen';
import DataTableRaw from 'components/DataTable';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import StringElementRaw from 'components/JsonSchema/elements/StringElement';
import checkAccess from 'helpers/checkAccess';
import dataTableSettings from 'application/modules/workflow/pages/Journal/variables/dataTableSettings';
import {
  requestWorkflowProcess,
  restartProcess,
  checkAsNotError,
} from 'application/actions/workflowProcess';
import {
  requestWorkflowProcessLogs,
  stopLoops,
} from 'application/actions/workflowProcessLogs';
import findPathDeep from 'deepdash/findPathDeep';
import { getDeletedSign } from 'actions/workflow';
import { searchUsers } from 'actions/users';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ErrorScreen = ErrorScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: import('@mui/material/styles').Theme) => ({
  toolbar: {
    padding: 4,
    flexWrap: 'wrap' as const,
    marginTop: 20,
    marginBottom: 15,
    minHeight: 'auto',
    [theme.breakpoints.down('xl')]: {
      marginBottom: 30,
    },
    '& > .MuiFormGroup-root': {
      marginLeft: 15,
    },
  },
  flexGrow: {
    flexGrow: 1,
  },
  toggle: {
    paddingTop: 20,
  },
  search: {
    marginLeft: 15,
  },
  link: {
    color: 'inherit',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  item: {
    color: 'inherit',
    display: 'inline',
  },
  dropDownIcon: {
    display: 'inline-block',
    position: 'relative' as const,
    top: 7,
  },
  root: {
    [theme.breakpoints.down('xl')]: {
      marginTop: 5,
    },
  },
  backBtn: {
    color: '#fff',
    borderColor: '#fff',
  },
  icon: {
    marginRight: 5,
  },
});

const colors: Record<string, string> = {
  1: '#3a9ae6',
  2: '#60b52a',
  3: '#bf3229',
  null: '#848788',
};

interface WorkflowProcessRecord {
  number?: string | number;
  workflowTemplateId?: string | number;
  workflowStatusId?: string | number;
  lastStepLabel?: string;
  isFinal?: boolean;
  hasUnresolvedErrors?: boolean;
  workflowTemplate?: { name?: string; xmlBpmnSchema?: string };
  [key: string]: unknown;
}

interface LogEntry {
  type: string;
  details: { workflowId?: string | number; documentId?: string | number; deletedSign?: unknown[]; [key: string]: unknown };
  [key: string]: unknown;
}

interface DeletedSignature {
  signatureType?: string;
  signatureCreatedBy?: string | number;
  documentId?: string | number;
  createdAt?: string;
  signatureName?: string;
  [key: string]: unknown;
}

interface Unit {
  id: number;
  [key: string]: unknown;
}

interface ProcessesListPageProps extends ModulePageProps {
  classes: Record<string, string>;
  loading?: boolean;
  location: unknown;
  dispatch: Dispatch;
  match: { params: { processId: string } };
  workflowProcess: Record<string, WorkflowProcessRecord>;
  workflowProcessLogs: Record<string, LogEntry[]>;
  userUnits: Unit[];
  userInfo: Record<string, unknown>;
  actions: {
    requestWorkflowProcess: (id: string) => Promise<WorkflowProcessRecord | Error>;
    requestWorkflowProcessLogs: (id: string) => Promise<{ logs: LogEntry[] } | Error>;
    restartProcess: (id: string) => Promise<unknown>;
    checkAsNotError: (id: string) => Promise<unknown>;
    stopLoops: (id: string) => Promise<{ isAccepted?: boolean } | Error>;
    getDeletedSign: (id?: string | number) => Promise<{ signatureRemovalHistory?: DeletedSignature[] } | unknown>;
  };
}

interface ProcessesListPageState {
  error: Error | null;
  checked: boolean;
  search: string;
  anchorEl: HTMLElement | null;
  showDialog: boolean;
  tableData: LogEntry[] | null;
}

class ProcessesListPage extends ModulePage<ProcessesListPageProps> {
  state: ProcessesListPageState = {
    error: null,
    checked: false,
    search: '',
    anchorEl: null,
    showDialog: false,
    tableData: null,
  };

  componentDidMount() {
    this.init();
  }

  // `ModulePage.componentDidUpdate` declares zero parameters; this override
  // needs `prevProps`/`prevState` (to detect the route's `processId` and the
  // `checked` toggle changing), so both are optional here to satisfy the
  // base class's override-compatibility check, then asserted present below —
  // React always calls this with both, same precedent as `Unit/index.tsx`
  // (see TYPESCRIPT.md, "users" batch).
  componentDidUpdate(prevProps?: ProcessesListPageProps, prevState?: ProcessesListPageState) {
    super.componentDidUpdate();
    const {
      match: {
        params: { processId: oldProcessId },
      },
    } = prevProps as ProcessesListPageProps;
    const {
      match: {
        params: { processId: newProcessId },
      },
    } = this.props;

    if (newProcessId !== oldProcessId) {
      this.init();
    }
    const { checked: newCheckedState } = this.state;
    const { checked: oldCheckedState } = prevState as ProcessesListPageState;

    if (newCheckedState !== oldCheckedState) {
      this.init();
    }
  }

  init = async () => {
    const {
      actions,
      workflowProcess,
      workflowProcessLogs,
      match: {
        params: { processId },
      },
    } = this.props;

    if (!workflowProcess[processId]) {
      const process = await actions.requestWorkflowProcess(processId);

      if (process instanceof Error) {
        this.setState({ error: process });
      }
    }

    let logs: { logs: LogEntry[] } | Error | null = null;

    if (!workflowProcessLogs[processId]) {
      logs = await actions.requestWorkflowProcessLogs(processId);

      if (logs instanceof Error) {
        this.setState({ error: logs });
      }
    }

    await this.getTableData((logs as { logs?: LogEntry[] })?.logs);
  };

  handleRestartProcess = async () => {
    const {
      actions,
      match: {
        params: { processId },
      },
    } = this.props;

    this.handleMenuClose();
    await actions.restartProcess(processId);
    actions.requestWorkflowProcessLogs(processId);
    window.location.reload();
  };

  handleCheckAsNotError = async () => {
    const {
      actions,
      match: {
        params: { processId },
      },
    } = this.props;

    this.handleMenuClose();
    this.setState({ showDialog: false });
    const result = await actions.checkAsNotError(processId);
    if (!(result instanceof Error)) {
      actions.requestWorkflowProcessLogs(processId);
      window.location.reload();
    }
  };

  getTableData = async (list?: LogEntry[]) => {
    const { actions, dispatch, userUnits, userInfo } = this.props;

    const hasAccess = checkAccess(
      { userHasUnit: [1000003] },
      userInfo,
      userUnits as never,
    );

    const listData = this.getListToDisplay(list) as LogEntry[] | undefined;

    const fetchData = async (workflowId: string | number) => {
      const result = (await actions.getDeletedSign(workflowId)) as { signatureRemovalHistory?: DeletedSignature[] };

      if (
        Array.isArray(result?.signatureRemovalHistory) &&
        result?.signatureRemovalHistory.length
      ) {
        let documentSignature = result?.signatureRemovalHistory.filter(
          (signature) => signature.signatureType === 'documentSignature',
        );

        if (documentSignature && documentSignature.length) {
          const ids = [
            ...new Set(
              documentSignature.map(
                (signature) => signature.signatureCreatedBy,
              ),
            ),
          ];

          const usersData = (await searchUsers(
            {
              ids,
            },
            '?brief_info=true',
          )(dispatch as never)) as { id: string | number; name?: string }[];

          if (usersData) {
            documentSignature = documentSignature.map((signature) => ({
              ...signature,
              signatureName:
                usersData.find(
                  (user) => user.id === signature.signatureCreatedBy,
                )?.name || '',
            }));
          }

          (listData || []).forEach((item) => {
            item.details.deletedSign = (documentSignature as DeletedSignature[])
              .filter(
                (signature) => signature.documentId === item.details.documentId,
              )
              .sort((a, b) => (new Date(a.createdAt as string) as unknown as number) - (new Date(b.createdAt as string) as unknown as number));
          });
        }
      }

      this.setState({ tableData: listData as LogEntry[] });
    };

    if (listData?.length) {
      const workflowId = listData[0]?.details?.workflowId;

      if (workflowId && hasAccess) {
        await fetchData(workflowId);
      } else {
        this.setState({ tableData: listData });
      }
    }
  };

  componentGetTitle = () => {
    const {
      t,
      workflowProcess,
      match: {
        params: { processId },
      },
    } = this.props;

    if (!workflowProcess[processId]) {
      return t?.('Loading') as string;
    }

    const proc = workflowProcess[processId];

    const tWithParams = t as unknown as ((key: string, params?: Record<string, unknown>) => string) | undefined;

    const title = ([] as string[])
      .concat(
        tWithParams?.('ProcessListPageTitle', {
          number: proc?.number,
          name: proc?.workflowTemplate?.name,
        }) as string,
      )
      .join(' ');

    return title;
  };

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event && event.target && event.target.checked;
    this.setState({ checked });
  };

  handleSearch = (value: string) => this.setState({ search: value });

  isEditable = () => {
    const { userUnits, userInfo } = this.props;
    return checkAccess(
      { unitHasAccessTo: 'navigation.process.editable' },
      userInfo || {},
      (userUnits || {}) as never,
    );
  };

  handleMenuOpen = ({ currentTarget }: React.MouseEvent<HTMLElement>) =>
    this.setState({ anchorEl: currentTarget });

  handleMenuClose = () => this.setState({ anchorEl: null });

  handleStopLoops = async () => {
    const {
      actions,
      match: {
        params: { processId },
      },
    } = this.props;

    this.handleMenuClose();

    const result = await actions.stopLoops(processId);

    if ((result as { isAccepted?: boolean }).isAccepted) {
      window.location.reload();
    }
  };

  loopArray = (array?: LogEntry[]) => {
    const { search } = this.state;

    if (!array) return;

    const filtered = array.filter((item) =>
      findPathDeep(item, (value: unknown, key: string | number) => {
        const matchable = (val: unknown) => ((val || '') + '').toLocaleLowerCase();
        const match = (origin: unknown, comparing: unknown) =>
          matchable(origin).indexOf(matchable(comparing)) !== -1;
        return match(value, search) || match(key, search);
      }),
    );

    return filtered;
  };

  getListToDisplay = (list?: LogEntry[]) => {
    const {
      workflowProcessLogs,
      match: {
        params: { processId },
      },
    } = this.props;

    const { checked, search } = this.state;

    if (search && search.length) {
      return this.loopArray(workflowProcessLogs[processId]);
    }

    const source = workflowProcessLogs[processId] || list || [];

    const dataWithoutMessages = source.filter(
      ({ type }) =>
        type !== 'workflow_incoming_message' &&
        type !== 'workflow_outgoing_message',
    );

    return checked ? workflowProcessLogs[processId] : dataWithoutMessages;
  };

  renderLabel = () => {
    const {
      t,
      workflowProcess,
      match: {
        params: { processId },
      },
    } = this.props;

    const statusLabels: Record<string, string> = {
      1: t?.('Doing') as string,
      2: t?.('Done') as string,
      3: t?.('Rejected') as string,
      null: t?.('NoStatus') as string,
    };

    const proc = workflowProcess[processId];

    return (
      <>
        {proc && proc.workflowStatusId ? (
          <Chip
            style={{
              cursor: 'inherit',
              backgroundColor: colors[proc.workflowStatusId as string],
              color: 'white',
              margin: '0 10px',
            }}
            label={statusLabels[proc.workflowStatusId as string]}
          />
        ) : null}
        {proc && proc.workflowStatusId && proc && proc.lastStepLabel ? (
          <Chip
            style={{
              cursor: 'inherit',
              backgroundColor: colors[proc.workflowStatusId as string],
              color: 'white',
              margin: '0 10px',
            }}
            label={proc.lastStepLabel}
          />
        ) : null}
        {proc ? (
          <Chip
            style={{
              cursor: 'inherit',
              backgroundColor: proc.isFinal ? colors[2] : colors['null'],
              color: 'white',
              margin: '0 10px',
            }}
            label={proc.isFinal ? t?.('isFinal') : t?.('isNotFinal')}
          />
        ) : null}
        {proc && proc.hasUnresolvedErrors ? (
          <Chip
            style={{
              cursor: 'inherit',
              backgroundColor: '#bf3229',
              color: 'white',
              margin: '0 10px',
            }}
            label={t?.('HasError')}
          />
        ) : null}
      </>
    );
  };

  checkIfLoopsExists = () => {
    const {
      workflowProcess,
      match: {
        params: { processId },
      },
    } = this.props;

    try {
      const proc = workflowProcess[processId];

      const parser = new DOMParser();

      const xmlDoc = parser.parseFromString(
        proc?.workflowTemplate?.xmlBpmnSchema as string,
        'text/xml',
      );

      const elements = Array.from(
        xmlDoc.getElementsByTagName('bpmn2:process')[0]?.children,
      );

      const hasLoop = (currentNodeId: string, visitedNodes: string[]): boolean => {
        if (visitedNodes.includes(currentNodeId)) {
          return true;
        }

        visitedNodes.push(currentNodeId);

        const currentActivity = elements.find(
          (element) => element.getAttribute('id') === currentNodeId,
        ) as Element;

        const outgoing = Array.from(
          currentActivity.getElementsByTagName('bpmn2:outgoing'),
        );

        if (outgoing.length) {
          const outgoingIds = outgoing.map((outgoing) => outgoing.innerHTML);

          for (const outgoingId of outgoingIds) {
            if (hasLoop(outgoingId, [...visitedNodes])) {
              return true;
            }
          }
        }

        return false;
      };

      const loops: string[] = [];
      const visitedNodes: string[] = [];

      (elements || []).forEach((element) => {
        const elementId = element.getAttribute('id') as string;

        if (hasLoop(elementId, visitedNodes)) {
          loops.push(elementId);
        }
      });

      return loops.length > 0;
    } catch {
      return false;
    }
  };

  renderContent = () => {
    // Read at call time rather than module scope: `components/JsonSchema`
    // is part of the Editor/UserSettings/JsonSchema/CodeEditDialog circular
    // import chain documented in TYPESCRIPT.md — a module-top-level read
    // can run while that module is still mid-evaluation.
    const StringElement = StringElementRaw as unknown as React.ComponentType<Record<string, unknown>>;
    const {
      t,
      classes,
      workflowProcess,
      workflowProcessLogs,
      match: {
        params: { processId },
      },
    } = this.props;

    const { error, checked, search, anchorEl, showDialog, tableData } =
      this.state;
    const proc = workflowProcess[processId];

    if (error) return <ErrorScreen darkTheme={true} error={error} />;

    const editable = this.isEditable();

    const workflowTemplateId = proc && proc.workflowTemplateId;

    const hasLoops = this.checkIfLoopsExists();

    return (
      <>
        <Toolbar className={classes.toolbar}>
          <Button
            onClick={() => history.push('/workflow/journal')}
            className={classes.backBtn}
          >
            <ArrowBackIcon />
            {t?.('BackButton')}
          </Button>

          {this.renderLabel()}

          <div className={classes.flexGrow} />

          {editable && proc && proc.hasUnresolvedErrors ? (
            <div className={classes.root}>
              <Button
                variant="outlined"
                onClick={this.handleMenuOpen}
                className={classes.backBtn}
                endIcon={anchorEl ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
              >
                <Typography variant="body1" className={classes.item}>
                  {t?.('ActionsWithProcess')}
                </Typography>
              </Button>
              <Popover
                open={!!anchorEl}
                anchorEl={anchorEl}
                onClose={this.handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
              >
                <ClickAwayListener onClickAway={this.handleMenuClose}>
                  <Paper>
                    <MenuList classes={{ root: (classes as { menuListRoot?: string }).menuListRoot }}>
                      {editable ? (
                        <MenuItem onClick={this.handleRestartProcess}>
                          <AutorenewIcon className={classes.icon} />
                          {t?.('RestartProcessButton')}
                        </MenuItem>
                      ) : null}
                      <MenuItem
                        onClick={() => this.setState({ showDialog: true })}
                      >
                        <ArrowBackIcon className={classes.icon} />
                        {t?.('CheckAsNotError')}
                      </MenuItem>

                      <MenuItem onClick={this.handleStopLoops}>
                        <DoNotDisturbAltIcon className={classes.icon} />
                        {t?.('ClearLoops')}
                      </MenuItem>
                    </MenuList>
                  </Paper>
                </ClickAwayListener>
              </Popover>
            </div>
          ) : (
            <>
              {hasLoops ? (
                <MenuItem onClick={this.handleStopLoops}>
                  <DoNotDisturbAltIcon className={classes.icon} />
                  {t?.('ClearLoops')}
                </MenuItem>
              ) : null}
            </>
          )}

          <ConfirmDialog
            open={showDialog}
            darkTheme={true}
            handleClose={() => this.setState({ showDialog: false })}
            handleConfirm={this.handleCheckAsNotError}
            title={t?.('CheckAsNotErrorTitle')}
            description={t?.('CheckAsNotErrorDescription')}
          />
        </Toolbar>
        <Toolbar className={classes.toolbar}>
          <StringElement
            className={classes.search}
            onChange={this.handleSearch}
            value={search}
            description={t?.('SearchLabel')}
            type="search"
            variant="outlined"
            darkTheme={true}
            required={true}
            noMargin={true}
          />

          <div className={classes.flexGrow} />

          {editable ? (
            <Tooltip title={t?.('ShowMessagesTooltip')}>
              <FormGroup row={true}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={checked}
                      onChange={this.handleChange}
                      color="primary"
                    />
                  }
                  label={t?.('ShowMessages')}
                />
              </FormGroup>
            </Tooltip>
          ) : null}
        </Toolbar>
        <DataTable
          {...dataTableSettings({
            t: t as (key: string) => string,
            processId,
            editable: editable as boolean,
            search,
            workflowTemplateId,
            logs: workflowProcessLogs[processId],
            checked,
          } as never)}
          data={tableData}
        />
      </>
    );
  };

  render = () => {
    const {
      loading,
      location,
      t,
      workflowProcess,
      match: {
        params: { processId },
      },
    } = this.props;

    const proc = workflowProcess[processId];
    const tWithParams = t as unknown as ((key: string, params?: Record<string, unknown>) => string) | undefined;

    return (
      <LeftSidebarLayout
        location={location}
        title={tWithParams?.('ProcessListPageTitle', {
          number: proc?.number,
          name: proc?.workflowTemplate?.name,
        })}
        loading={loading}
      >
        {this.renderContent()}
      </LeftSidebarLayout>
    );
  };
}

interface ConnectedState {
  workflowProcess: { list: Record<string, WorkflowProcessRecord> };
  workflowProcessLogs: Record<string, LogEntry[]>;
  auth: { userUnits: Unit[]; info: Record<string, unknown> };
}

const mapStateToProps = ({
  workflowProcess: { list },
  workflowProcessLogs,
  auth: { userUnits, info },
}: ConnectedState) => ({
  workflowProcess: list,
  workflowProcessLogs,
  userUnits,
  userInfo: info,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    restartProcess: bindActionCreators(restartProcess, dispatch),
    requestWorkflowProcess: bindActionCreators(
      requestWorkflowProcess,
      dispatch,
    ),
    requestWorkflowProcessLogs: bindActionCreators(
      requestWorkflowProcessLogs,
      dispatch,
    ),
    checkAsNotError: bindActionCreators(checkAsNotError, dispatch),
    stopLoops: bindActionCreators(stopLoops, dispatch),
    getDeletedSign: bindActionCreators(getDeletedSign, dispatch),
  },
});

const styled = withStyles(styles)(ProcessesListPage as never);
const translated = translate('ProcessesListPage')(styled as never);
export default connect(mapStateToProps as never, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

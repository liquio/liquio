import React from 'react';
import { bindActionCreators } from 'redux';
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
import LeftSidebarLayout from 'layouts/LeftSidebar';
import ModulePage from 'components/ModulePage';
import ErrorScreen from 'components/ErrorScreen';
import DataTable from 'components/DataTable';
import ConfirmDialog from 'components/ConfirmDialog';
import StringElement from 'components/JsonSchema/elements/StringElement';
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

const styles = (theme) => ({
  toolbar: {
    padding: 4,
    flexWrap: 'wrap',
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
    position: 'relative',
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

const colors = {
  1: '#3a9ae6',
  2: '#60b52a',
  3: '#bf3229',
  null: '#848788',
};

class ProcessesListPage extends ModulePage {
  state = {
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

  componentDidUpdate(prevProps, prevState) {
    super.componentDidUpdate(prevProps);
    const {
      match: {
        params: { processId: oldProcessId },
      },
    } = prevProps;
    const {
      match: {
        params: { processId: newProcessId },
      },
    } = this.props;

    if (newProcessId !== oldProcessId) {
      this.init();
    }
    const { checked: newCheckedState } = this.state;
    const { checked: oldCheckedState } = prevState;

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

    let logs = null;

    if (!workflowProcessLogs[processId]) {
      logs = await actions.requestWorkflowProcessLogs(processId);

      if (logs instanceof Error) {
        this.setState({ error: logs });
      }
    }

    await this.getTableData(logs?.logs);
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

  getTableData = async (list) => {
    const { actions, dispatch, userUnits, userInfo } = this.props;

    const hasAccess = checkAccess(
      { userHasUnit: [1000003] },
      userInfo,
      userUnits,
    );

    const listData = this.getListToDisplay(list);

    const fetchData = async (workflowId) => {
      const result = await actions.getDeletedSign(workflowId);

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

          const usersData = await searchUsers(
            {
              ids,
            },
            '?brief_info=true',
          )(dispatch);

          if (usersData) {
            documentSignature = documentSignature.map((signature) => ({
              ...signature,
              signatureName:
                usersData.find(
                  (user) => user.id === signature.signatureCreatedBy,
                )?.name || '',
            }));
          }

          listData.forEach((item) => {
            item.details.deletedSign = documentSignature
              .filter(
                (signature) => signature.documentId === item.details.documentId,
              )
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });
        }
      }

      this.setState({ tableData: listData });
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

  componentGetTitle() {
    const {
      t,
      workflowProcess,
      match: {
        params: { processId },
      },
    } = this.props;

    if (!workflowProcess[processId]) {
      return t('Loading');
    }

    const proc = workflowProcess[processId];

    const title = []
      .concat(
        t('ProcessListPageTitle', {
          number: proc?.number,
          name: proc?.workflowTemplate?.name,
        }),
      )
      .join(' ');

    return title;
  }

  handleChange = (event) => {
    const checked = event && event.target && event.target.checked;
    this.setState({ checked });
  };

  handleSearch = (value) => this.setState({ search: value });

  isEditable = () => {
    const { userUnits, userInfo } = this.props;
    return checkAccess(
      { unitHasAccessTo: 'navigation.process.editable' },
      userInfo || {},
      userUnits || {},
    );
  };

  handleMenuOpen = ({ currentTarget }) =>
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

    if (result.isAccepted) {
      window.location.reload();
    }
  };

  loopArray = (array) => {
    const { search } = this.state;

    if (!array) return;

    const filtered = array.filter((item) =>
      findPathDeep(item, (value, key) => {
        const matchable = (val) => ((val || '') + '').toLocaleLowerCase();
        const match = (origin, comparing) =>
          matchable(origin).indexOf(matchable(comparing)) !== -1;
        return match(value, search) || match(key, search);
      }),
    );

    return filtered;
  };

  getListToDisplay = (list) => {
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

    const statusLabels = {
      1: t('Doing'),
      2: t('Done'),
      3: t('Rejected'),
      null: t('NoStatus'),
    };

    const proc = workflowProcess[processId];

    return (
      <>
        {proc && proc.workflowStatusId ? (
          <Chip
            style={{
              cursor: 'inherit',
              backgroundColor: colors[proc.workflowStatusId],
              color: 'white',
              margin: '0 10px',
            }}
            label={statusLabels[proc.workflowStatusId]}
          />
        ) : null}
        {proc && proc.workflowStatusId && proc && proc.lastStepLabel ? (
          <Chip
            style={{
              cursor: 'inherit',
              backgroundColor: colors[proc.workflowStatusId],
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
            label={proc.isFinal ? t('isFinal') : t('isNotFinal')}
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
            label={t('HasError')}
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
        proc?.workflowTemplate?.xmlBpmnSchema,
        'text/xml',
      );

      const elements = Array.from(
        xmlDoc.getElementsByTagName('bpmn2:process')[0]?.children,
      );

      const hasLoop = (currentNodeId, visitedNodes) => {
        if (visitedNodes.includes(currentNodeId)) {
          return true;
        }

        visitedNodes.push(currentNodeId);

        const currentActivity = elements.find(
          (element) => element.getAttribute('id') === currentNodeId,
        );

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

      const loops = [];
      const visitedNodes = [];

      (elements || []).forEach((element) => {
        const elementId = element.getAttribute('id');

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
            {t('BackButton')}
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
                  {t('ActionsWithProcess')}
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
                    <MenuList classes={{ root: classes.menuListRoot }}>
                      {editable ? (
                        <MenuItem onClick={this.handleRestartProcess}>
                          <AutorenewIcon className={classes.icon} />
                          {t('RestartProcessButton')}
                        </MenuItem>
                      ) : null}
                      <MenuItem
                        onClick={() => this.setState({ showDialog: true })}
                      >
                        <ArrowBackIcon className={classes.icon} />
                        {t('CheckAsNotError')}
                      </MenuItem>

                      <MenuItem onClick={this.handleStopLoops}>
                        <DoNotDisturbAltIcon className={classes.icon} />
                        {t('ClearLoops')}
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
                  {t('ClearLoops')}
                </MenuItem>
              ) : null}
            </>
          )}

          <ConfirmDialog
            open={showDialog}
            darkTheme={true}
            handleClose={() => this.setState({ showDialog: false })}
            handleConfirm={this.handleCheckAsNotError}
            title={t('CheckAsNotErrorTitle')}
            description={t('CheckAsNotErrorDescription')}
          />
        </Toolbar>
        <Toolbar className={classes.toolbar}>
          <StringElement
            className={classes.search}
            onChange={this.handleSearch}
            value={search}
            description={t('SearchLabel')}
            type="search"
            variant="outlined"
            darkTheme={true}
            required={true}
            noMargin={true}
          />

          <div className={classes.flexGrow} />

          {editable ? (
            <Tooltip title={t('ShowMessagesTooltip')}>
              <FormGroup row={true}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={checked}
                      onChange={this.handleChange}
                      color="primary"
                    />
                  }
                  label={t('ShowMessages')}
                />
              </FormGroup>
            </Tooltip>
          ) : null}
        </Toolbar>
        <DataTable
          {...dataTableSettings({
            t,
            processId,
            editable,
            search,
            workflowTemplateId,
            logs: workflowProcessLogs[processId],
            checked,
          })}
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

    return (
      <LeftSidebarLayout
        location={location}
        title={t('ProcessListPageTitle', {
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

const mapStateToProps = ({
  workflowProcess: { list },
  workflowProcessLogs,
  auth: { userUnits, info },
}) => ({
  workflowProcess: list,
  workflowProcessLogs,
  userUnits,
  userInfo: info,
});

const mapDispatchToProps = (dispatch) => ({
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

const styled = withStyles(styles)(ProcessesListPage);
const translated = translate('ProcessesListPage')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

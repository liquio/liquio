import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';

import withStyles from '@mui/styles/withStyles';
import BugReport from '@mui/icons-material/BugReport';
import { Tooltip, IconButton, Button, CircularProgress } from '@mui/material';

import Editor from 'components/Editor';
import FullScreenDialog from 'components/FullScreenDialog';
import ProgressLine from 'components/Preloader/ProgressLine';

import { addError } from 'actions/error';
import { requestWorkflow } from 'application/actions/workflow';
import { requestEvent, saveEventData } from 'application/actions/events';
import { requestGateway, saveGatewayData } from 'application/actions/gateways';
import { restartProcessFromPoint } from 'application/actions/workflowProcess';

const styles = {
  root: {
    height: 200,
    width: 600,
    backgroundColor: '#141414',
    color: '#F8F8F8',
    cursor: 'pointer',
  },
  debugAction: {
    position: 'absolute',
    zIndex: 10000,
    bottom: 50,
    right: 50,
  },
  actionText: {
    color: '#fff',
    marginLeft: 5,
  },
  debugActionRoot: {
    color: '#fff',
    border: '2px solid #fff',
  },
  dialog: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    '& .ace_editor': {
      flex: 1,
    },
  },
  header: {
    padding: 0,
    backgroundColor: '#232323',
    minHeight: 32,
    justifyContent: 'flex-end',
  },
  title: {
    flexGrow: 1,
    color: '#E2E2E2',
    padding: '0 10px',
  },
  button: {
    color: '#E2E2E2!important',
  },
  paper: {
    position: 'fixed',
    background: '#fff',
    zIndex: 1000,
    maxHeight: 300,
    overflow: 'auto',
  },
  editor: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  tabs: {
    backgroundColor: '#232323',
    margin: 0,
  },
  tab: {
    color: '#fff',
  },
  editorWrap: {
    minHeight: '50vh',
  },
  icon: {
    fill: '#404040',
    marginRight: 10,
  },
};

const renderEditor = ({ value, onChange, onValidate, readOnly }) => (
  <Editor
    height="100%"
    width="100%"
    value={value}
    language="json"
    onChange={onChange}
    readOnly={readOnly}
    onValidate={onValidate}
  />
);

const types = ['event', 'gateway'];

const Debug = (props) => {
  const {
    t,
    classes,
    type,
    logs,
    details,
    processId,
    workflowTemplateId,
    actions,
  } = props;
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isValid, setValidState] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [origin, setOriginValue] = React.useState({});
  const [debugResult, setDebugResult] = React.useState('');

  if (!types.includes(type) && !types.includes(details?.serviceName))
    return null;

  let { eventTemplateId, gatewayTemplateId } = details;

  if (!eventTemplateId && !gatewayTemplateId && details?.serviceName) {
    eventTemplateId = details?.data?.queueMessage?.eventTemplateId;
    gatewayTemplateId = details?.data?.queueMessage?.gatewayTemplateId;
  }

  if (!eventTemplateId && !gatewayTemplateId) return null;

  const opedDialog = async () => {
    setLoading(true);

    await actions.requestWorkflow(workflowTemplateId);

    const result = eventTemplateId
      ? await actions.requestEvent(eventTemplateId)
      : await actions.requestGateway(gatewayTemplateId);

    setOriginValue(result);
    setValue(JSON.stringify(result.jsonSchema, null, 4));

    setLoading(false);
    setOpen(true);
  };

  const closeDialog = async () => setOpen(false);

  const restartProcess = async () => {
    const messages = logs
      .filter(({ type }) => type === 'workflow_outgoing_message')
      .map(({ details: { data } }) => data);
    let message = {};

    if (eventTemplateId) {
      message = messages.filter(
        ({ eventTemplateId: eventId }) => eventTemplateId === eventId,
      );
    } else {
      message = messages.filter(
        ({ gatewayTemplateId: gatewayId }) => gatewayTemplateId === gatewayId,
      );
    }

    const result = await actions.restartProcess(processId, {
      debug: true,
      ...message[0],
    });

    return result;
  };

  const lastEditString = (lastWorkflowHistory) => {
    const getName = (src) => {
      const { name } = src;

      if (name) return name;

      const { firstName, lastName, middleName } = src;
      return `${firstName} ${lastName} ${middleName}`;
    };

    const string = t('WorkflowOldVersionErrorDetailed', {
      person: getName(lastWorkflowHistory.meta),
      time: moment(lastWorkflowHistory.updatedAt).fromNow(),
    });

    return string;
  };

  const checkValid = (error) => setValidState(!error.length);

  const savingErrorMessage = (result) => {
    if (result.message === 'Header Last-Workflow-History-Id expired.') {
      const error = new Error('WorkflowOldVersionError');

      const { details } = result.response;

      if (details) {
        const { lastWorkflowHistory } = details.pop();

        if (!lastWorkflowHistory) return;

        error.details = lastEditString(lastWorkflowHistory);
      }
      actions.addError(error);
      return;
    }
    actions.addError('FailSavingDebugData');
  };

  const handleChange = async () => {
    if (!open) return;

    if (!isValid) {
      setDebugResult(JSON.stringify({ error: t('CheckSchema') }, null, 4));
      return;
    }

    setLoading(true);
    // const jsonSchema = JSON.parse(value);

    const body = {
      ...origin,
      // jsonSchema: eventTemplateId ? JSON.stringify(jsonSchema) : jsonSchema,
      workflowTemplateId,
    };

    const savingResult = eventTemplateId
      ? await actions.saveEventData(body)
      : await actions.saveGatewayData(body);

    if (savingResult instanceof Error) {
      savingErrorMessage(savingResult);
      setLoading(false);
      return;
    }

    const result = await restartProcess();
    setDebugResult(JSON.stringify(result, null, 4));
    setLoading(false);
  };

  return (
    <>
      <Tooltip title={t('WorkflowLogDebug')}>
        <IconButton onClick={opedDialog} size="large">
          {loading ? <CircularProgress size={24} /> : <BugReport />}
        </IconButton>
      </Tooltip>
      <FullScreenDialog open={open} onClose={closeDialog}>
        <div className={classes.dialog}>
          <div className={classes.editorWrap}>
            {renderEditor({
              value,
              onChange: setValue,
              onValidate: checkValid,
            })}
          </div>
          <ProgressLine loading={loading} />
          <div className={classes.editorWrap}>
            {renderEditor({
              value: debugResult,
              onChange: null,
              onValidate: null,
              readOnly: true,
            })}
          </div>
          <div className={classes.debugAction}>
            <Button
              disabled={loading}
              onClick={handleChange}
              variant="contained"
              color="primary"
            >
              {loading ? (
                <CircularProgress size={24} className={classes.icon} />
              ) : (
                <BugReport className={classes.icon} />
              )}
              {t('Execute')}
            </Button>
          </div>
        </div>
      </FullScreenDialog>
    </>
  );
};

Debug.propTypes = {
  classes: PropTypes.object.isRequired,
  details: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  processId: PropTypes.string.isRequired,
};

Debug.defaultProps = {};

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestWorkflow: bindActionCreators(requestWorkflow, dispatch),
    requestGateway: bindActionCreators(requestGateway, dispatch),
    saveGatewayData: bindActionCreators(saveGatewayData, dispatch),
    requestEvent: bindActionCreators(requestEvent, dispatch),
    saveEventData: bindActionCreators(saveEventData, dispatch),
    restartProcess: bindActionCreators(restartProcessFromPoint, dispatch),
    addError: bindActionCreators(addError, dispatch),
  },
});
const translated = translate('ProcessesListPage')(Debug);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(styled);

import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import withStyles from '@mui/styles/withStyles';

import DataTable from 'components/DataTable';
import TimeLabel from 'components/Label/Time';
import toCamelCase from 'helpers/toCamelCase';
import { loadWorkflowLogs } from 'application/actions/workflow';

const styles = {
  container: {
    maxHeight: 200,
    overflow: 'hidden'
  }
};

class WorkflowLogs extends React.Component {
  state = {};

  componentDidMount() {
    this.init();
  }

  componentDidUpdate({ workflowId: oldWorkflowId }) {
    const { workflowId: newWorkflowId } = this.props;

    if (newWorkflowId !== oldWorkflowId) {
      this.init();
    }
  }

  init = () => {
    const { actions, workflowId, logs } = this.props;

    if (!logs[workflowId]) {
      actions.loadWorkflowLogs(workflowId);
    }
  };

  render() {
    const { t, logs, workflowId } = this.props;

    return (
      <DataTable
        data={logs[workflowId]}
        columns={[
          {
            id: 'createdAt',
            width: 160,
            sortable: 'true',
            padding: 'checkbox',
            name: t('CreatedAt'),
            render: (value) => <TimeLabel date={value} />
          },
          {
            id: 'type',
            name: t('WorkflowLogType'),
            render: (value) => t(toCamelCase(value))
          },
          {
            id: 'details',
            name: t('WorkflowLogDetails'),
            render: (value) => <pre>{JSON.stringify(value, null, 4)}</pre>
          },
          {
            id: 'warnings',
            sortable: false,
            name: t('WorkflowLogWarnings'),
            render: (value) => <pre>{JSON.stringify(value, null, 4)}</pre>
          }
        ]}
        controls={{
          pagination: false,
          toolbar: false,
          search: false,
          header: true,
          refresh: true,
          switchView: false
        }}
      />
    );
  }
}

WorkflowLogs.propTypes = {};

WorkflowLogs.defaultProps = {};

const mapStateToProps = ({ workflow: { logs } }) => ({ logs });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    loadWorkflowLogs: bindActionCreators(loadWorkflowLogs, dispatch)
  }
});

const styled = withStyles(styles)(WorkflowLogs);
const translated = translate('WorkflowLogs')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

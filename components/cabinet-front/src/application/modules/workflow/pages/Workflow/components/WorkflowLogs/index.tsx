import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import withStyles from '@mui/styles/withStyles';

import DataTableRaw from 'components/DataTable';
import TimeLabelRaw from 'components/Label/Time';
import toCamelCase from 'helpers/toCamelCase';
import { loadWorkflowLogs } from 'application/actions/workflow';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  container: {
    maxHeight: 200,
    overflow: 'hidden'
  }
};

interface WorkflowLogEntry {
  createdAt?: string;
  type?: string;
  details?: unknown;
  warnings?: unknown;
  [key: string]: unknown;
}

interface WorkflowLogsProps {
  t: (key: string) => string;
  logs: Record<string, WorkflowLogEntry[]>;
  workflowId: string | number;
  actions: { loadWorkflowLogs: (workflowId: string | number) => void };
}

class WorkflowLogs extends React.Component<WorkflowLogsProps> {
  componentDidMount() {
    this.init();
  }

  componentDidUpdate({ workflowId: oldWorkflowId }: WorkflowLogsProps) {
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
            render: (value: string) => <TimeLabel date={value} />
          },
          {
            id: 'type',
            name: t('WorkflowLogType'),
            render: (value: string) => t(toCamelCase(value))
          },
          {
            id: 'details',
            name: t('WorkflowLogDetails'),
            render: (value: unknown) => <pre>{JSON.stringify(value, null, 4)}</pre>
          },
          {
            id: 'warnings',
            sortable: false,
            name: t('WorkflowLogWarnings'),
            render: (value: unknown) => <pre>{JSON.stringify(value, null, 4)}</pre>
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

interface WorkflowLogsState {
  workflow: { logs: Record<string, WorkflowLogEntry[]> };
}

const mapStateToProps = ({ workflow: { logs } }: WorkflowLogsState) => ({ logs });

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    loadWorkflowLogs: bindActionCreators(loadWorkflowLogs, dispatch)
  }
});

const styled = withStyles(styles)(WorkflowLogs as never);
const translated = translate('WorkflowLogs')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

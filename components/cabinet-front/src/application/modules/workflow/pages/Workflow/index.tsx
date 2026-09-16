import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';

import { loadWorkflow, loadWorkflowTemplate } from 'application/actions/workflow';
import { downloadFile } from 'application/actions/files';
import ModulePage, { type ModulePageProps } from 'components/ModulePage';
import WorkflowLogsRaw from 'modules/workflow/pages/Workflow/components/WorkflowLogs';
import WorkflowLayoutRaw from 'modules/workflow/pages/Workflow/components/WorkflowLayout';

const WorkflowLogs = WorkflowLogsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const WorkflowLayout = WorkflowLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface WorkflowData {
  id?: string | number;
  name?: string;
  workflowTemplateId?: string | number;
  timeline?: unknown[];
  files?: unknown[];
  [key: string]: unknown;
}

interface WorkflowTemplate {
  name?: string;
  [key: string]: unknown;
}

interface WorkflowPageProps extends ModulePageProps {
  workflows: Record<string, WorkflowData>;
  origins: Record<string, WorkflowData>;
  templates: Record<string, WorkflowTemplate>;
  fileStorage: Record<string, unknown>;
  location: { pathname: string };
  match: { params: { workflowId?: string } };
  actions: {
    loadWorkflow: (workflowId: string) => Promise<WorkflowData | Error>;
    loadWorkflowTemplate: (templateId: string | number) => Promise<unknown>;
    downloadFile: (...args: unknown[]) => unknown;
  };
}

interface WorkflowPageState {
  error: boolean;
  busy?: boolean;
}

class WorkflowPage extends ModulePage<WorkflowPageProps> {
  state: WorkflowPageState = {
    error: false
  };

  componentGetTitle = (): string => {
    const { template } = this.getData(this.props);
    return (template && template.name) as string;
  };

  async componentDidMount() {
    const { busy } = this.state;
    const { actions } = this.props;

    if (busy) {
      return;
    }

    this.setState({ busy: true }, async () => {
      const { templates } = this.props;
      const data = this.getData(this.props);

      const { workflowId } = data;

      this.setState({ busy: true });
      const workflow = data.workflow || (await actions.loadWorkflow(workflowId as string));

      if (workflow instanceof Error || !workflow) {
        this.setState({ busy: false, error: true });
        return;
      }

      if (!templates[workflow.workflowTemplateId as string] && workflow) {
        await actions.loadWorkflowTemplate(workflow.workflowTemplateId as string);
      }

      this.setState({ busy: false });
    });
  }

  getData = (props: WorkflowPageProps) => {
    const {
      workflows,
      origins,
      templates,
      match: {
        params: { workflowId }
      }
    } = props;

    let workflow;
    let origin;
    let template;

    if (workflowId) {
      workflow = workflows[workflowId];
      origin = origins[workflowId];
      if (workflow) {
        template = templates[workflow.workflowTemplateId as string];
      }
    }

    return { workflowId, workflow, origin, template };
  };

  render() {
    const { t, location, actions, fileStorage } = this.props;
    const { workflow, template } = this.getData(this.props);
    const { error } = this.state;

    return (
      <WorkflowLayout
        error={error}
        location={location}
        title={workflow?.name ? workflow?.name : template ? template.name : t?.('Loading')}
        workflow={workflow}
        loading={!workflow || !template}
        debugTools={{
          WorkflowLogs: () => <WorkflowLogs workflowId={workflow && workflow.id} />
        }}
        fileStorage={fileStorage || {}}
        actions={{
          handleDownloadFile: actions.downloadFile
        }}
      />
    );
  }
}

interface WorkflowPageState_ {
  workflow: { actual: Record<string, WorkflowData>; origin: Record<string, WorkflowData> };
  workflowTemplate: { actual: Record<string, WorkflowTemplate> };
  files: { list: Record<string, unknown> };
}

const mapStateToProps = ({ workflow, workflowTemplate, files }: WorkflowPageState_) => ({
  workflows: workflow.actual,
  origins: workflow.origin,
  templates: workflowTemplate.actual,
  fileStorage: files.list
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    loadWorkflow: bindActionCreators(loadWorkflow, dispatch),
    loadWorkflowTemplate: bindActionCreators(loadWorkflowTemplate, dispatch),
    downloadFile: bindActionCreators(downloadFile, dispatch)
  }
});

const translated = translate('WorkflowPage')(WorkflowPage as never);
export default connect(mapStateToProps as never, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;

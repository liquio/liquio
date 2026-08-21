import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';

import { loadWorkflow, loadWorkflowTemplate } from 'application/actions/workflow';
import { downloadFile } from 'application/actions/files';
import ModulePage from 'components/ModulePage';
import WorkflowLogs from 'modules/workflow/pages/Workflow/components/WorkflowLogs';
import WorkflowLayout from 'modules/workflow/pages/Workflow/components/WorkflowLayout';

class WorkflowPage extends ModulePage {
  state = {
    error: false
  };

  componentGetTitle() {
    const { template } = this.getData(this.props);
    return template && template.name;
  }

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
      const workflow = data.workflow || (await actions.loadWorkflow(workflowId));

      if (workflow instanceof Error || !workflow) {
        this.setState({ busy: false, error: true });
        return;
      }

      if (!templates[workflow.workflowTemplateId] && workflow) {
        await actions.loadWorkflowTemplate(workflow.workflowTemplateId);
      }

      this.setState({ busy: false });
    });
  }

  getData = (props) => {
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
        template = templates[workflow.workflowTemplateId];
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
        title={workflow?.name ? workflow?.name : template ? template.name : t('Loading')}
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

const mapStateToProps = ({ workflow, workflowTemplate, files }) => ({
  workflows: workflow.actual,
  origins: workflow.origin,
  templates: workflowTemplate.actual,
  fileStorage: files.list
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    loadWorkflow: bindActionCreators(loadWorkflow, dispatch),
    loadWorkflowTemplate: bindActionCreators(loadWorkflowTemplate, dispatch),
    downloadFile: bindActionCreators(downloadFile, dispatch)
  }
});

const translated = translate('WorkflowPage')(WorkflowPage);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

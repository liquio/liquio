import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button } from '@mui/material';

import { createTask } from 'application/actions/task';
import { history } from 'store';

interface RejectWorkflowProps {
  t: (key: string) => string;
  params: string;
  actions: { createTask: (data: { copyFrom: string }) => Promise<unknown> };
}

interface RejectWorkflowState {
  busy: boolean;
}

class RejectWorkflow extends React.Component<RejectWorkflowProps, RejectWorkflowState> {
  state: RejectWorkflowState = { busy: false };

  handleClick = async () => {
    const { actions, params: copyFrom } = this.props;

    this.setState({ busy: true });
    try {
      const task = (await actions.createTask({ copyFrom })) as { id: string | number };
      history.push(`/tasks/${task.id}`);
    } catch (e) {
      this.setState({ busy: false });
    }
  };

  render() {
    const { t } = this.props;
    const { busy } = this.state;
    return (
      <Button variant="contained" color="primary" onClick={this.handleClick} disabled={busy}>
        {t('CloneWorkflow')}
      </Button>
    );
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    createTask: bindActionCreators(createTask, dispatch)
  }
});

const translated = translate('SmartMessage')(RejectWorkflow as never);
export default connect(() => ({}), mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import withStyles from '@mui/styles/withStyles';

import { getUncreatedTaskId } from 'application/actions/task';
import PreloaderRaw from 'components/Preloader';

const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  wrapper: {
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }
};

interface UncreatedTaskProps {
  actions: { getUncreatedTaskId: (workflowId: string, taskTemplateId: string) => Promise<{ taskId: string | number }> };
  history: { push: (url: string) => void };
  classes?: Record<string, string>;
}

class UncreatedTask extends React.Component<UncreatedTaskProps> {
  static defaultProps = {
    classes: {}
  };

  getRequestParams = () => {
    const { pathname } = window.location;
    const splitPath = pathname.split('/');
    const workflowId = splitPath[3];
    const taskTemplateId = splitPath[4];

    return {
      workflowId,
      taskTemplateId
    };
  };

  redirectUser = async () => {
    const { actions, history } = this.props;
    const { workflowId, taskTemplateId } = this.getRequestParams();
    const result = await actions.getUncreatedTaskId(workflowId, taskTemplateId);
    try {
      const { taskId } = result;
      history.push(`/tasks/${taskId}`);
    } catch (e) {
      history.push('/tasks');
    }
  };

  componentDidMount = () => this.redirectUser();

  render = () => {
    const { classes } = this.props;

    return (
      <div className={classes?.wrapper}>
        <Preloader />
      </div>
    );
  };
}

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getUncreatedTaskId: bindActionCreators(getUncreatedTaskId, dispatch)
  }
});
const styled = withStyles(styles)(UncreatedTask as never);
export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

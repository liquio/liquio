import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import withStyles from '@mui/styles/withStyles';

import { getUncreatedTaskId } from 'application/actions/task';
import Preloader from 'components/Preloader';

const styles = {
  wrapper: {
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }
};

class UncreatedTask extends React.Component {
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
      <div className={classes.wrapper}>
        <Preloader />
      </div>
    );
  };
}

UncreatedTask.propTypes = {
  actions: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
  classes: PropTypes.object
};

UncreatedTask.defaultProps = {
  classes: {}
};

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    getUncreatedTaskId: bindActionCreators(getUncreatedTaskId, dispatch)
  }
});
const styled = withStyles(styles)(UncreatedTask);
export default connect(mapStateToProps, mapDispatchToProps)(styled);

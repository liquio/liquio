import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import withStyles from '@mui/styles/withStyles';

import { checkTaskSigners } from 'application/actions/task';
import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import isCyrillic from 'helpers/isCyrillic';

const styles = {
  wrapper: {
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }
};

class MultisignTask extends React.Component {
  state = { error: null };

  getRequestParams = () => {
    const { pathname, search } = window.location;
    const splitPath = pathname.split('/');
    const taskId = splitPath[2];
    const queryPath = search.split('=');
    const multisignPath = queryPath[1];

    return {
      taskId,
      multisignPath
    };
  };

  redirectUser = async () => {
    const { t, actions, history } = this.props;
    const { taskId, multisignPath } = this.getRequestParams();

    const result = await actions.checkTaskSigners(taskId, multisignPath);

    if (result instanceof Error) {
      this.setState({
        error: new Error(isCyrillic(result.message) ? result.message : t(result.message))
      });
      return;
    } else {
      history.push(`/tasks/${taskId}`);
    }
  };

  componentDidMount = () => this.redirectUser();

  render = () => {
    const { classes, t, location } = this.props;
    const { error } = this.state;

    if (error) {
      return (
        <LeftSidebarLayout location={location} title={t('ErrorDialogTitle')}>
          <ErrorScreen error={error} />
        </LeftSidebarLayout>
      );
    }

    return (
      <div className={classes.wrapper}>
        <Preloader />
      </div>
    );
  };
}

MultisignTask.propTypes = {
  actions: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
  classes: PropTypes.object
};

MultisignTask.defaultProps = {
  classes: {}
};

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    checkTaskSigners: bindActionCreators(checkTaskSigners, dispatch)
  }
});
const styled = withStyles(styles)(MultisignTask);
const translated = translate('TaskPage')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

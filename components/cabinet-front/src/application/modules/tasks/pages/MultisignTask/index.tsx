import React from 'react';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import withStyles from '@mui/styles/withStyles';

import { checkTaskSigners } from 'application/actions/task';
import PreloaderRaw from 'components/Preloader';
import ErrorScreenRaw from 'components/ErrorScreen';
import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import isCyrillic from 'helpers/isCyrillic';

const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ErrorScreen = ErrorScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;
const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  wrapper: {
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }
};

interface MultisignTaskProps {
  t: (key: string) => string;
  actions: { checkTaskSigners: (taskId: string, multisignPath: string) => Promise<unknown> };
  history: { push: (url: string) => void };
  classes?: Record<string, string>;
  location: unknown;
}

interface MultisignTaskState {
  error: Error | null;
}

class MultisignTask extends React.Component<MultisignTaskProps, MultisignTaskState> {
  static defaultProps = {
    classes: {}
  };

  state: MultisignTaskState = { error: null };

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
      <div className={classes?.wrapper}>
        <Preloader />
      </div>
    );
  };
}

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    checkTaskSigners: bindActionCreators(checkTaskSigners, dispatch)
  }
});
const styled = withStyles(styles)(MultisignTask as never);
const translated = translate('TaskPage')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

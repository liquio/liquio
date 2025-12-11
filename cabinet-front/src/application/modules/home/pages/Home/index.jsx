import { connect } from 'react-redux';

import checkAccess from 'helpers/checkAccess';
import getModules from 'modules/index';

import { showServiceMessage } from 'actions/error';
import { bindActionCreators } from 'redux';
import { getConfig } from '../../../../../core/helpers/configLoader';

const unitSort = (a, b) => {
  const aWeight = a.priority || 0;
  const bWeight = b.priority || 0;

  if (aWeight > bWeight) {
    return -1;
  }

  if (aWeight < bWeight) {
    return 1;
  }

  return 0;
};

const HomePage = ({ actions, userUnits, userInfo, history, onboardingTaskId }) => {
  const config = getConfig();

  const DEFAULT_ROUTE = config.defaultRoute ? config.defaultRoute : '/messages';

  const priorityUnit = (userUnits || [])
    .filter(({ menuConfig: { defaultRoute } }) => defaultRoute)
    .sort(unitSort)[0];
  const defaultRoute =
    priorityUnit && priorityUnit.menuConfig && priorityUnit.menuConfig.defaultRoute
      ? priorityUnit.menuConfig.defaultRoute
      : DEFAULT_ROUTE;

  if (history.location.pathname !== defaultRoute && !onboardingTaskId) {
    const route = []
      .concat(...getModules().map(({ routes }) => routes))
      .filter(Boolean)
      .find(({ path }) => path === defaultRoute);

    const hasAccess = route && route.access ? checkAccess(route.access, userInfo, userUnits) : true;

    if (!hasAccess) {
      actions.showServiceMessage(new Error('User without needed role.'));
      return null;
    }

    history.replace(defaultRoute);
  }

  return null;
};

const mapStateToProps = ({
  auth: {
    userUnits,
    info,
    info: { onboardingTaskId }
  }
}) => ({ userUnits, userInfo: info, onboardingTaskId });

const mapDispatch = (dispatch) => ({
  actions: {
    showServiceMessage: bindActionCreators(showServiceMessage, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatch)(HomePage);

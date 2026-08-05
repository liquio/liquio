import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as actions from 'services/dataTable/actions';

export const mapStateToProps = (state, { endPoint: { sourceName } }) =>
  state[sourceName];

export const mapDispatchToProps = (dispatch, { endPoint }) => ({
  actions: Object.keys(actions)
    .concat(Object.keys(endPoint.actions || {}))
    .filter((value, index, self) => {
      return self.indexOf(value) === index;
    })
    .reduce(
      (acc, action) => ({
        ...acc,
        [action]: bindActionCreators(
          acc[action] || actions[action](endPoint),
          dispatch,
        ),
      }),
      endPoint.actions || {},
    ),
});

export default (component) =>
  connect(mapStateToProps, mapDispatchToProps)(component);

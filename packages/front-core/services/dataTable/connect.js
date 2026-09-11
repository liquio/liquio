import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as actions from 'services/dataTable/actions';

export const mapStateToProps =
  ({ sourceName }) =>
  (state) =>
    state[sourceName];

export const mapDispatchToProps = (endPoint) => (dispatch) => ({
  actions: Object.keys(actions)
    .concat(Object.keys(endPoint.actions || {}))
    .filter((value, index, self) => self.indexOf(value) === index)
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

export default (endPoint) => (component) =>
  connect(mapStateToProps(endPoint), mapDispatchToProps(endPoint))(component);

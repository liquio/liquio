import { connect } from 'react-redux';

export default (Component) =>
  connect(({ auth: { info, ...rest } }) => ({ ...rest, userInfo: info }))(
    Component,
  );

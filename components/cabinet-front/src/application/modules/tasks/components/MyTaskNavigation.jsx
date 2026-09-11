import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import Item from 'layouts/components/Navigator/Item';
import processList from 'services/processList';
import { getMyUnreadTaskCount } from 'application/actions/task';

class MyTaskNavigation extends React.Component {
  componentDidMount() {
    const {
      actions,
      location: { pathname }
    } = this.props;

    if (pathname === '/tasks/my-tasks' && !processList.has('getMyUnreadTaskCount')) {
      processList.set('getMyUnreadTaskCount', actions.getMyUnreadTaskCount);
    }
  }

  render() {
    const {
      unreadMyCount,
      location: { pathname }
    } = this.props;

    return (
      <Item
        menuItem={{
          id: 'InboxTasks',
          title: 'InboxTasks',
          path: '/tasks/my-tasks',
          uiFilter: 'tasks.my.opened',
          pathname,
          badge: unreadMyCount
        }}
      />
    );
  }
}

const mapStateToProps = ({ task }) => task;
const mapDispatchToProps = (dispatch) => ({
  actions: {
    getMyUnreadTaskCount: bindActionCreators(getMyUnreadTaskCount, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(MyTaskNavigation);

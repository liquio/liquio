import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import Item from 'layouts/components/Navigator/Item';
import processList from 'services/processList';
import { getUnitUnreadTaskCount } from 'application/actions/task';

class UnitTaskNavigation extends React.Component {
  componentDidMount() {
    const { actions } = this.props;

    if (!processList.has('getUnitUnreadTaskCount')) {
      processList.set('getUnitUnreadTaskCount', actions.getUnitUnreadTaskCount);
    }
  }

  render() {
    const {
      unreadUnitCount,
      location: { pathname }
    } = this.props;

    return (
      <Item
        menuItem={{
          id: 'UnitInboxTasks',
          title: 'UnitInboxTasks',
          path: '/tasks/unit-tasks',
          uiFilter: 'tasks.unit.opened',
          pathname,
          badge: unreadUnitCount
        }}
      />
    );
  }
}

const mapStateToProps = ({ task }) => task;
const mapDispatchToProps = (dispatch) => ({
  actions: {
    getUnitUnreadTaskCount: bindActionCreators(getUnitUnreadTaskCount, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(UnitTaskNavigation);

import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import CategoryHeader from 'layouts/components/Navigator/CategoryHeader';
import processList from 'services/processList';
import { getUnreadInboxCount } from 'application/actions/inbox';
import { ReactComponent as InsertDriveFileIcon } from 'assets/img/modulesIcons/insert-drive-outlined.svg';

class InboxNavigation extends React.Component {
  componentDidMount() {
    const {
      actions,
      location: { pathname }
    } = this.props;

    if (pathname === '/inbox' && !processList.has('getUnreadInboxCount')) {
      processList.set('getUnreadInboxCount', actions.getUnreadInboxCount);
    }
  }

  render() {
    const {
      unreadCount,
      location: { pathname }
    } = this.props;

    return (
      <CategoryHeader
        id="Inbox"
        path="/workflow/inbox"
        pathname={pathname}
        badge={unreadCount}
        icon={<InsertDriveFileIcon />}
      />
    );
  }
}

const mapStateToProps = ({ inbox }) => inbox;
const mapDispatchToProps = (dispatch) => ({
  actions: {
    getUnreadInboxCount: bindActionCreators(getUnreadInboxCount, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(InboxNavigation);

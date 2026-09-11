import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import CategoryHeader from 'layouts/components/Navigator/CategoryHeader';
import { getUnreadMessageCount } from 'application/actions/messages';
import { ReactComponent as MessageOutlinedIcon } from 'assets/img/modulesIcons/message-outlined.svg';

const MessageNavigation = (props) => {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [pathname, setPathname] = React.useState('');

  React.useEffect(() => {
    setUnreadCount(props.unreadCount);
    setPathname(props.location.pathname);
  }, [props.unreadCount, props.location.pathname]);

  return (
    <CategoryHeader
      id="Messages"
      path="/messages"
      pathname={pathname}
      badge={unreadCount}
      icon={<MessageOutlinedIcon />}
    />
  );
};

MessageNavigation.propTypes = {
  location: PropTypes.object,
  unreadCount: PropTypes.number
};

MessageNavigation.defaultProps = {
  location: { pathname: '' },
  unreadCount: 0
};

const mapStateToProps = ({ messages: { unreadCount } }) => ({ unreadCount });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    getUnreadMessageCount: bindActionCreators(getUnreadMessageCount, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(MessageNavigation);

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { Badge, IconButton } from '@mui/material';
import NotificationIcon from '@mui/icons-material/NotificationImportant';

import { history } from 'store';

const MessageNotify = ({ unreadCount }) => (
  <IconButton onClick={() => history.push('/messages')}>
    <Badge badgeContent={unreadCount} color="primary">
      <NotificationIcon />
    </Badge>
  </IconButton>
);

MessageNotify.propTypes = {
  unreadCount: PropTypes.number
};

MessageNotify.defaultProps = {
  unreadCount: 0
};

const mapStateToProps = ({ messages: { unreadCount } }) => ({ unreadCount });

const translated = translate('MessagesNotify')(MessageNotify);
export default connect(mapStateToProps)(translated);

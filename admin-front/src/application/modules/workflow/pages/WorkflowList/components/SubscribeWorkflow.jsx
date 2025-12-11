import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { subscribeToProcess, unSubscribeToProcess } from 'actions/workflow';

const SubscribeWorkflow = ({
  t,
  actions,
  workflow,
  userInfo,
  subscribeEnabled,
}) => {
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();

  const subscribed = (workflow?.errorsSubscribers || []).find(
    ({ id }) => id === userInfo?.userId,
  );

  const handleSubscribe = async () => {
    setLoading(true);
    if (subscribed) {
      await unSubscribeToProcess(workflow?.id)(dispatch);
    } else {
      await subscribeToProcess(workflow?.id)(dispatch);
    }
    setLoading(false);
    actions.load();
  };

  const ItemIcon = () =>
    subscribed ? <NotificationsOffIcon /> : <NotificationsNoneIcon />;

  if (!subscribeEnabled) return null;

  return (
    <>
      <MenuItem onClick={handleSubscribe}>
        <ListItemIcon>
          {loading ? <CircularProgress size={24} /> : <ItemIcon />}
        </ListItemIcon>
        <ListItemText
          primary={t(subscribed ? 'UnSubscribeWorkflow' : 'SubscribeWorkflow')}
        />
      </MenuItem>
    </>
  );
};

SubscribeWorkflow.propTypes = {
  t: PropTypes.func.isRequired,
  workflow: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  userInfo: PropTypes.object.isRequired,
  subscribeEnabled: PropTypes.bool.isRequired,
};

export default translate('WorkflowListAdminPage')(SubscribeWorkflow);

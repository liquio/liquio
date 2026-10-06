import React from 'react';
import { translate } from 'react-translate';
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

interface Subscriber {
  id?: string | number;
}

interface WorkflowLike {
  id?: string | number;
  errorsSubscribers?: Subscriber[];
}

interface SubscribeWorkflowProps {
  t: (key: string) => string;
  actions: { load: () => void };
  workflow: WorkflowLike;
  userInfo: { userId?: string | number };
  subscribeEnabled: boolean;
}

const SubscribeWorkflow = ({
  t,
  actions,
  workflow,
  userInfo,
  subscribeEnabled,
}: SubscribeWorkflowProps) => {
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();

  const subscribed = (workflow?.errorsSubscribers || []).find(
    ({ id }) => id === userInfo?.userId,
  );

  const handleSubscribe = async () => {
    setLoading(true);
    if (subscribed) {
      await unSubscribeToProcess(workflow?.id as string | number)(dispatch as never);
    } else {
      await subscribeToProcess(workflow?.id as string | number)(dispatch as never);
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

export default translate('WorkflowListAdminPage')(SubscribeWorkflow as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

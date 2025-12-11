import React from 'react';
import { Button } from '@mui/material';

import { ReactComponent as VisibilityIconAlt } from 'components/FileDataTable/assets/ic_visibility.svg';

const TableToolbar = ({ t, data, rowsSelected, actions }) => {
  const unreadMessages = data
    .filter(({ id }) => rowsSelected.includes(id))
    .filter(({ isRead }) => isRead === false)
    .map(({ id }) => id);

  if (!unreadMessages.length) {
    return null;
  }

  return (
    <Button
      startIcon={<VisibilityIconAlt />}
      aria-label={t('MarkAllAsRead')}
      onClick={() => Promise.all(unreadMessages.map(actions.markInboxRead)).then(actions.load)}
    >
      {t('MarkAllAsRead')}
    </Button>
  );
};

export default TableToolbar;

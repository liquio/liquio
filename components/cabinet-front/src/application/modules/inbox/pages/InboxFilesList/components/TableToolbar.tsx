import React from 'react';
import { Button } from '@mui/material';

import { ReactComponent as VisibilityIconAlt } from 'components/FileDataTable/assets/ic_visibility.svg';

interface InboxRow {
  id: string;
  isRead?: boolean;
}

interface TableToolbarProps {
  t: (key: string) => string;
  data: InboxRow[];
  rowsSelected: string[];
  actions: {
    markInboxRead: (id: string) => Promise<unknown>;
    load: () => void;
  };
}

const TableToolbar = ({ t, data, rowsSelected, actions }: TableToolbarProps) => {
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

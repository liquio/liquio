import React from 'react';
import { translate } from 'react-translate';
import { Typography, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import { formatUserName } from 'helpers/userName';
import { ReactComponent as UserIcon } from 'assets/img/account-circle.svg';

const styles = (theme: Theme & { categoryWrapperActive?: string }) => ({
  emptyList: {
    textAlign: 'center' as const,
    color: theme?.palette?.text?.secondary
  },
  avatarRoot: {
    minWidth: 'unset',
    width: 40,
    height: 40,
    background: theme.categoryWrapperActive,
    borderRadius: '50%',
    marginRight: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  itemRoot: {
    paddingLeft: 0,
    paddingRight: 0,
    '&:hover': {
      backgroundColor: 'transparent'
    }
  },
  listRoot: {
    paddingTop: 0,
    paddingBottom: 0
  }
});

interface PerformerUserListProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  task: { performerUserNames?: string[] };
}

const PerformerUserList = ({ t, classes, task: { performerUserNames } }: PerformerUserListProps) => {
  if (!Array.isArray(performerUserNames) || !performerUserNames.length) {
    return (
      <Typography variant="body1" className={classes.emptyList}>
        {t('Nobody')}
      </Typography>
    );
  }

  return (
    <List classes={{ root: classes.listRoot }}>
      {performerUserNames.map((performerUserName) => (
        <ListItem key={performerUserName} classes={{ root: classes.itemRoot }}>
          <ListItemAvatar classes={{ root: classes.avatarRoot }}>
            <UserIcon />
          </ListItemAvatar>
          <ListItemText primary={formatUserName(performerUserName)} />
        </ListItem>
      ))}
    </List>
  );
};

const styled = withStyles(styles)(PerformerUserList as never);

export default translate('TaskPage')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

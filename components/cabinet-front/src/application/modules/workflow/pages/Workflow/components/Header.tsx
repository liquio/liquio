import React from 'react';
import { translate } from 'react-translate';
import { Chip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import classNames from 'classnames';

import humanDateFormat from 'helpers/humanDateFormat';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import { Content } from 'layouts/LeftSidebar';
import { ReactComponent as CalendarIcon } from 'modules/messages/pages/Message/assets/ic_calendar.svg';

const getStatusColor = (theme: Theme, workflowStatusId: number | null): string | undefined =>
  ({
    1: theme?.palette?.warning?.light,
    2: theme?.palette?.success?.light,
    3: theme?.palette?.error?.light,
    null: (theme?.palette?.action as { selected?: string })?.selected
  })[workflowStatusId as unknown as string];

const getStatusTextColor = (theme: Theme, workflowStatusId: number | null): string | undefined =>
  ({
    1: theme?.palette?.warning?.contrastText || theme?.palette?.text?.primary,
    2: theme?.palette?.success?.contrastText || theme?.palette?.text?.primary,
    3: theme?.palette?.error?.contrastText || theme?.palette?.text?.primary,
    null: theme?.palette?.text?.primary
  })[workflowStatusId as unknown as string];

interface HeaderStyleProps {
  workflow?: { workflowStatusId?: number | null };
}

const styles = (theme: Theme) => ({
  chip: {
    marginRight: 20,
    marginBottom: 10,
    border: 'none',
    textTransform: 'inherit' as const,
    cursor: 'inherit'
  },
  activeChip: {
    cursor: 'pointer'
  },
  time: {
    textAlign: 'center' as const
  },
  statusChip: {
    backgroundColor: ({ workflow }: HeaderStyleProps) => getStatusColor(theme, workflow?.workflowStatusId as number),
    color: ({ workflow }: HeaderStyleProps) => getStatusTextColor(theme, workflow?.workflowStatusId as number)
  }
});

interface WorkflowInfo {
  link?: string;
  name?: string;
}

interface WorkflowData {
  entryTaskFinishedAt?: string;
  info?: WorkflowInfo[];
  workflowStatusId?: number | null;
}

interface HeaderProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  workflow?: WorkflowData;
  timeline?: { label: string }[];
}

const Header = ({ t, classes, workflow = {}, timeline = [] }: HeaderProps) => (
  <Content>
    {timeline.length ? (
      <Chip
        color="primary"
        label={capitalizeFirstLetter(timeline[timeline.length - 1].label)}
        className={classNames(classes.chip, classes.statusChip)}
      />
    ) : null}
    <Chip
      icon={<CalendarIcon />}
      label={t('CreatedAt', {
        time: humanDateFormat(workflow.entryTaskFinishedAt as never)
      })}
      className={classes.chip}
      variant="outlined"
    />
    {(workflow.info || []).map((info, key) => (
      <a key={key} href={info.link} target="_blank" rel="noopener noreferrer">
        <Chip
          icon={<InfoIcon />}
          label={capitalizeFirstLetter(info.name as string)}
          className={classNames(classes.chip, classes.activeChip)}
          variant="outlined"
        />
      </a>
    ))}
  </Content>
);

const translated = translate('WorkflowPage')(Header as never);
export default withStyles(styles as never)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

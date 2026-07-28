import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import InfoIcon from '@mui/icons-material/Info';
import classNames from 'classnames';

import humanDateFormat from 'helpers/humanDateFormat';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import { Content } from 'layouts/LeftSidebar';
import { ReactComponent as CalendarIcon } from 'modules/messages/pages/Message/assets/ic_calendar.svg';

const getStatusColor = (theme, workflowStatusId) => ({
  1: theme?.palette?.warning?.light,
  2: theme?.palette?.success?.light,
  3: theme?.palette?.error?.light,
  null: theme?.palette?.action?.selected
}[workflowStatusId]);

const getStatusTextColor = (theme, workflowStatusId) => ({
  1: theme?.palette?.warning?.contrastText || theme?.palette?.text?.primary,
  2: theme?.palette?.success?.contrastText || theme?.palette?.text?.primary,
  3: theme?.palette?.error?.contrastText || theme?.palette?.text?.primary,
  null: theme?.palette?.text?.primary
}[workflowStatusId]);

const styles = (theme) => ({
  chip: {
    marginRight: 20,
    marginBottom: 10,
    border: 'none',
    textTransform: 'inherit',
    cursor: 'inherit'
  },
  activeChip: {
    cursor: 'pointer'
  },
  time: {
    textAlign: 'center'
  },
  statusChip: {
    backgroundColor: ({ workflow }) => getStatusColor(theme, workflow?.workflowStatusId),
    color: ({ workflow }) => getStatusTextColor(theme, workflow?.workflowStatusId)
  }
});

const Header = ({ t, classes, workflow, timeline }) => (
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
        time: humanDateFormat(workflow.entryTaskFinishedAt)
      })}
      className={classes.chip}
      variant="outlined"
    />
    {(workflow.info || []).map((info, key) => (
      <a key={key} href={info.link} target="_blank" rel="noopener noreferrer">
        <Chip
          icon={<InfoIcon />}
          label={capitalizeFirstLetter(info.name)}
          className={classNames(classes.chip, classes.activeChip)}
          variant="outlined"
        />
      </a>
    ))}
  </Content>
);

Header.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  workflow: PropTypes.object,
  timeline: PropTypes.array
};

Header.defaultProps = {
  workflow: {},
  timeline: []
};

const translated = translate('WorkflowPage')(Header);
export default withStyles(styles)(translated);

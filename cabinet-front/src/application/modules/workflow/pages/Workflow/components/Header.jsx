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

const colors = {
  1: '#FFD79D',
  2: '#AEE9D1',
  3: '#FED3D1',
  null: '#E4E5E7'
};

const styles = () => ({
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
  }
});

const Header = ({ t, classes, workflow, workflow: { workflowStatusId }, timeline }) => (
  <Content>
    {timeline.length ? (
      <Chip
        color="primary"
        label={capitalizeFirstLetter(timeline[timeline.length - 1].label)}
        className={classes.chip}
        style={{
          backgroundColor: colors[workflowStatusId]
        }}
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

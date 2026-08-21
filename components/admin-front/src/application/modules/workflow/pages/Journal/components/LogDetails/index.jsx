import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Toolbar, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import toCamelCase from 'helpers/toCamelCase';
import RenderOneLine from 'helpers/renderOneLine';
import HighlightText from 'components/HighlightText';
import MessagesDetails from './MessageDetails';
import ElementDetails from './ElementDetails';
import ErrorDetails from './ErrorDetails';

const styles = {
  errorLabel: {
    color: '#f44336',
  },
  warningLabel: {
    color: '#ffa500',
  },
  ids: {
    paddingLeft: 5,
  },
};

const ERROR_LOG_TYPES = ['error', 'warning'];
const ELEMENT_LOG_TYPES = ['task', 'event', 'gateway'];
const MESSAGE_LOG_TYPES = [
  'workflow_incoming_message',
  'workflow_outgoing_message',
];

const LogDetails = ({
  t,
  search,
  classes,
  processId,
  log,
  log: { type },
  checked,
}) => {
  let details = null;

  if (ELEMENT_LOG_TYPES.includes(type)) {
    details = (
      <ElementDetails
        processId={processId}
        log={log}
        search={search}
        checked={checked}
      />
    );
  }

  if (MESSAGE_LOG_TYPES.includes(type)) {
    details = <MessagesDetails processId={processId} log={log} />;
  }

  if (ERROR_LOG_TYPES.includes(type)) {
    details = (
      <ErrorDetails
        log={log}
        search={search}
        styles={type && type === 'warning' ? classes.warningLabel : null}
      />
    );
  }

  const renderTitle = () => {
    const title = t(toCamelCase(type));

    const sequences = log?.details?.sequences || [];

    const sequencesText = sequences
      .map(({ sourceRef, targetRef }) => `${sourceRef} → ${targetRef}`)
      .join(', ');

    return (
      <RenderOneLine
        title={`${title} ${sequencesText}`}
        minWidthDefault={'unset'}
      />
    );
  };

  return (
    <Toolbar disableGutters={true}>
      <Typography
        variant="body2"
        className={classNames({
          [classes.oneRowRender]: true,
          [classes.errorLabel]: type && type === 'error',
          [classes.warningLabel]: type && type === 'warning',
        })}
      >
        <HighlightText highlight={search} text={renderTitle()} />
      </Typography>
      {details}
    </Toolbar>
  );
};

LogDetails.propTypes = {
  t: PropTypes.func.isRequired,
  processId: PropTypes.string.isRequired,
  log: PropTypes.object.isRequired,
};

const translated = translate('ProcessesListPage')(LogDetails);
const styled = withStyles(styles)(translated);

export default styled;

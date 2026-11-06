import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Toolbar, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import toCamelCase from 'helpers/toCamelCase';
import RenderOneLineRaw from 'helpers/renderOneLine';
import HighlightTextRaw from 'components/HighlightText';
import MessagesDetailsRaw from './MessageDetails';
import ElementDetailsRaw from './ElementDetails';
import ErrorDetailsRaw from './ErrorDetails';

const RenderOneLine = RenderOneLineRaw as unknown as React.ComponentType<Record<string, unknown>>;
const HighlightText = HighlightTextRaw as unknown as React.ComponentType<Record<string, unknown>>;
const MessagesDetails = MessagesDetailsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ElementDetails = ElementDetailsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ErrorDetails = ErrorDetailsRaw as unknown as React.ComponentType<Record<string, unknown>>;

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

interface LogRecord {
  type: string;
  details?: { sequences?: { sourceRef: string; targetRef: string }[]; [key: string]: unknown };
  [key: string]: unknown;
}

interface LogDetailsProps {
  t: (key: string) => string;
  search?: string;
  classes: Record<string, string>;
  processId: string | number;
  log: LogRecord;
  checked?: boolean;
}

const LogDetails = ({
  t,
  search,
  classes,
  processId,
  log,
  log: { type },
  checked,
}: LogDetailsProps) => {
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

const translated = translate('ProcessesListPage')(LogDetails as never);
const styled = withStyles(styles)(translated as never);

export default styled as unknown as React.ComponentType<Record<string, unknown>>;

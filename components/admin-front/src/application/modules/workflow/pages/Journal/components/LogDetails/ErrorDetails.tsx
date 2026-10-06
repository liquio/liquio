import React from 'react';
import classNames from 'classnames';
import { translate } from 'react-translate';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import HighlightTextRaw from 'components/HighlightText';
import toCamelCase from 'helpers/toCamelCase';

const HighlightText = HighlightTextRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  errorLabel: {
    color: '#f44336',
  },
  ids: {
    paddingLeft: 5,
  },
  link: {
    textDecorationColor: '#f44336',
    marginRight: 4,
    whiteSpace: 'nowrap' as const,
  },
  errorMessage: {
    //  wordBreak: 'break-all',
    maxWidth: 300,
    textOverflow: 'ellipsis',
  },
};

interface ErrorLogDetails {
  serviceName: string;
  name?: string;
  data: { queueMessage?: Record<string, unknown>; error?: unknown; traceMeta?: Record<string, unknown> };
}

interface ErrorDetailsProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  search?: string;
  styles?: string | null;
  log: { details: ErrorLogDetails };
}

const ErrorDetails = ({
  t,
  classes,
  search,
  styles: styleProp,
  log: {
    details,
    details: {
      data: { queueMessage, error, traceMeta },
    },
  },
}: ErrorDetailsProps) => {
  let errorMessage: unknown = error;
  let workflowId = `${(traceMeta?.documentTemplateId as string | number) || ''}`.slice(0, -3);

  const message = queueMessage || {};

  let elementId = traceMeta && (traceMeta[details.serviceName + 'TemplateId'] as string | number);

  if (
    message.eventTemplateId ||
    message.taskTemplateId ||
    message.gatewayTemplateId
  ) {
    elementId = (message.eventTemplateId ||
      message.taskTemplateId ||
      message.gatewayTemplateId) as string | number;
    workflowId = String(elementId).slice(0, -3);
    errorMessage = (details?.data?.error as string | undefined)?.slice(0, 200);
  }

  return (
    <>
      <ErrorOutlineIcon
        className={classNames(classes.errorLabel, styleProp && styleProp)}
      />
      <a
        className={classes.link}
        rel="noopener noreferrer"
        target="_blank"
        href={`/workflow/${workflowId}/${details.serviceName}-${elementId}`}
      >
        <Typography
          variant="body2"
          className={classNames(
            classes.ids,
            classes.errorLabel,
            styleProp && styleProp,
          )}
        >
          <HighlightText
            highlight={search}
            text={
              t(toCamelCase(details.serviceName)) +
              ' ' +
              elementId +
              ' ' +
              (details.name || '')
            }
          />
        </Typography>
      </a>
      <div className={classes.errorMessage}>
        {React.isValidElement(errorMessage)
          ? errorMessage
          : JSON.stringify(errorMessage)}
      </div>
    </>
  );
};

const styled = withStyles(styles)(ErrorDetails as never);
export default translate('ProcessesListPage')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

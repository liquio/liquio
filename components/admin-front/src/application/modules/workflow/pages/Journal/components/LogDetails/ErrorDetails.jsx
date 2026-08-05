import React from 'react';
import classNames from 'classnames';
import { translate } from 'react-translate';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import HighlightText from 'components/HighlightText';
import toCamelCase from 'helpers/toCamelCase';

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
    whiteSpace: 'nowrap',
  },
  errorMessage: {
    //  wordBreak: 'break-all',
    maxWidth: 300,
    textOverflow: 'ellipsis',
  },
};

const ErrorDetails = ({
  t,
  classes,
  search,
  styles,
  log: {
    details,
    details: {
      data: { queueMessage, error, traceMeta },
    },
  },
}) => {
  let errorMessage = error;
  let workflowId = `${traceMeta?.documentTemplateId || ''}`.slice(0, -3);

  const message = queueMessage || {};

  let elementId = traceMeta && traceMeta[details.serviceName + 'TemplateId'];

  if (
    message.eventTemplateId ||
    message.taskTemplateId ||
    message.gatewayTemplateId
  ) {
    elementId =
      message.eventTemplateId ||
      message.taskTemplateId ||
      message.gatewayTemplateId;
    workflowId = String(elementId).slice(0, -3);
    errorMessage = details?.data?.error?.slice(0, 200);
  }

  return (
    <>
      <ErrorOutlineIcon
        className={classNames(classes.errorLabel, styles && styles)}
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
            styles && styles,
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

const styled = withStyles(styles)(ErrorDetails);
export default translate('ProcessesListPage')(styled);

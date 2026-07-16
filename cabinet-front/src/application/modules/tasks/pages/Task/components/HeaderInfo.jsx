import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Chip, List, ListItem, ListItemText, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import evaluate from 'helpers/evaluate';

const styles = (theme) => ({
  statusItem: {
    display: 'flex',
    padding: 0,
    margin: 0,
    alignItems: 'center'
  },
  list: {
    paddingTop: 0,
    paddingBottom: 0,
    minWidth: 320
  },
  listItem: {
    padding: '8px 16px',
    borderTop: `1px solid ${theme?.palette?.divider}`,
    borderBottom: `1px solid ${theme?.palette?.divider}`,
    '&:hover': {
      backgroundColor: 'transparent'
    }
  },
  statusTitle: {
    flex: 1,
    lineHeight: '32px'
  },
  itemValue: {
    display: 'block'
  },
  activeStatus: {
    backgroundColor: theme?.palette?.success?.light,
    color: theme?.palette?.text?.primary
  }
});

const isItemShown = (row) => {
  let hidden;
  if (typeof row.hidden === 'string') {
    hidden = evaluate(row.hidden, document.data);

    if (hidden instanceof Error) {
      hidden.commit({
        type: 'task page header'
      });
      return false;
    }

    return !hidden;
  }

  return !row.hidden;
};

const HeaderInfo = ({ t, classes, template, task, children }) => {
  const rows = (template && Object.values(template.jsonSchema.header || {})) || [];
  const { deleted, document } = task || {};
  const { isFinal } = document || {};

  if (!rows.length && (!children || !children.filter(Boolean).length)) {
    return null;
  }

  return (
    <>
      <List className={classes.list}>
        <ListItem alignItems="flex-start" className={classes.listItem} disableGutters>
          <ListItemText
            className={classes.statusItem}
            primary={
              <Typography variant="label" className={classes.statusTitle}>
                {t('Status')}
              </Typography>
            }
            secondary={
              <Typography component="span" variant="body1" color="textPrimary">
                <Chip
                  label={t(deleted ? 'DeletedStatus' : isFinal ? 'FinalStatus' : 'ActiveStatus')}
                  className={classNames({
                    [classes.chip]: true,
                    [classes.activeStatus]: !isFinal && !deleted
                  })}
                />
              </Typography>
            }
          />
        </ListItem>
        {rows
          .map((row) => {
            let text = evaluate(row.value, document.data);

            if (text instanceof Error) {
              text.commit({ type: 'task info' });
              text = '';
            }

            return { ...row, text };
          })
          .filter(({ text }) => !!text)
          .filter(isItemShown)
          .map((row, index) => (
            <>
              <ListItem key={index} alignItems="flex-start" className={classes.listItem}>
                <ListItemText
                  primary={
                    <Typography component="span" variant="body2" color="textSecondary">
                      {row.description}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      component="span"
                      variant="body1"
                      color="textPrimary"
                      className={classes.itemValue}
                    >
                      {row.text}
                    </Typography>
                  }
                />
              </ListItem>
            </>
          ))}
      </List>
      {children}
    </>
  );
};

HeaderInfo.propTypes = {
  header: PropTypes.object,
  task: PropTypes.object.isRequired
};

HeaderInfo.defaultProps = {
  header: {}
};

const styled = withStyles(styles)(HeaderInfo);
export default translate('TaskListPage')(styled);

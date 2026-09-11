import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Chip, List, ListItem, ListItemText, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import evaluate from 'helpers/evaluate';

const styles = (theme: Theme) => ({
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

interface HeaderRow {
  hidden?: string | boolean;
  value?: string;
  description?: string;
  text?: unknown;
}

// Module-scope function — unlike the `document` read inside `HeaderInfo`
// itself (which reads the component's own destructured task-document
// local), this `document` resolves to the browser's global `Document`
// object (no `.data` property), not the task document. A genuine
// pre-existing scoping bug: `row.hidden` is always evaluated against
// `undefined`, not the task's actual data. Preserved exactly.
const isItemShown = (row: HeaderRow) => {
  let hidden;
  if (typeof row.hidden === 'string') {
    hidden = evaluate(row.hidden, (document as unknown as { data?: unknown }).data);

    if (hidden instanceof Error) {
      (hidden as Error & { commit?: (meta: Record<string, unknown>) => void }).commit?.({
        type: 'task page header'
      });
      return false;
    }

    return !hidden;
  }

  return !row.hidden;
};

interface HeaderInfoProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  template?: { jsonSchema: { header?: Record<string, HeaderRow> } };
  task?: { deleted?: boolean; document?: { data?: unknown; isFinal?: boolean } };
  children?: React.ReactNode;
}

const HeaderInfo = ({ t, classes, template, task, children }: HeaderInfoProps) => {
  const rows = (template && Object.values(template.jsonSchema.header || {})) || [];
  const { deleted, document: taskDocument } = task || {};
  const { isFinal } = taskDocument || {};

  if (!rows.length && (!children || !(children as React.ReactNode[]).filter(Boolean).length)) {
    return null;
  }

  return (
    <>
      <List className={classes.list}>
        <ListItem alignItems="flex-start" className={classes.listItem} disableGutters={true}>
          <ListItemText
            className={classes.statusItem}
            primary={
              <Typography {...({ variant: 'label' } as unknown as Record<string, unknown>)} className={classes.statusTitle}>
                {t('Status')}
              </Typography>
            }
            secondary={
              <Typography component="span" variant="body1" color="textPrimary">
                <Chip
                  label={t(deleted ? 'DeletedStatus' : isFinal ? 'FinalStatus' : 'ActiveStatus')}
                  className={classNames({
                    [(classes as { chip?: string }).chip as string]: true,
                    [classes.activeStatus]: !isFinal && !deleted
                  })}
                />
              </Typography>
            }
          />
        </ListItem>
        {rows
          .map((row) => {
            let text: unknown = evaluate(row.value as string, taskDocument?.data);

            if (text instanceof Error) {
              (text as Error & { commit?: (meta: Record<string, unknown>) => void }).commit?.({ type: 'task info' });
              text = '';
            }

            return { ...row, text };
          })
          .filter(({ text }) => !!text)
          .filter(isItemShown)
          .map((row, index) => (
            // The original placed `key` on the inner `ListItem`, not this
            // wrapping fragment (which, as JSX shorthand `<>`, can't even
            // accept a `key` prop) — a pre-existing quirk (React warns about
            // the missing key on the fragment itself), preserved exactly.
            <React.Fragment>
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
                      {row.text as React.ReactNode}
                    </Typography>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
      </List>
      {children}
    </>
  );
};

const styled = withStyles(styles)(HeaderInfo as never);
export default translate('TaskListPage')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

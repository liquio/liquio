import React from 'react';
import EJVError from 'components/JsonSchema/components/EJVError';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';

import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { JsonSchemaNode } from '../../types';

const styles = {
  item: {
    color: '#f44336',
  },
  itemDetails: {
    marginLeft: 4,
  },
};

interface SpreadsheetError {
  path: string;
  relativePath?: [string, string];
  rowId?: number;
  [key: string]: unknown;
}

interface HeaderCellData {
  label?: string;
}

interface SpreadsheetErrorsProps extends WithStyles<typeof styles> {
  t: (key: string, params?: Record<string, unknown>) => string;
  errors?: SpreadsheetError[];
  headers: Array<Array<HeaderCellData | string>>;
  items: { properties?: Record<string, JsonSchemaNode> };
  setJumpTo: (jumpTo: { rowId?: number; columnName?: string }) => void;
}

const SpreadsheetErrors = ({
  t,
  classes,
  errors,
  headers,
  items,
  setJumpTo,
}: SpreadsheetErrorsProps) => {
  if (!errors || !Array.isArray(errors) || !errors.length) {
    return null;
  }

  const headerNames = headers[headers.length - 1].map(
    (row) => (row as HeaderCellData).label || (row as string),
  );
  const propNames = Object.keys(items.properties || {});

  return (
    <List>
      {errors
        .filter(({ rowId }) => !isNaN(rowId as number))
        .slice(0, 3)
        .map((error, index) => {
          const [rowId, columnName] = (error.relativePath || []) as [string, string];
          const columnId = headerNames[propNames.indexOf(columnName)];

          return (
            <ListItem
              key={index}
              className={classes.item}
              {...({
                button: true,
                onClick: () => setJumpTo({ rowId: rowId as unknown as number, columnName }),
              } as unknown as Record<string, unknown>)}
            >
              <ListItemIcon>
                <ErrorOutlineIcon />
              </ListItemIcon>
              <ListItemText
                primary={
                  <>
                    <EJVError key={index} error={error as never} />
                    <Typography
                      className={classes.itemDetails}
                      variant="subtitle1"
                      component="span"
                    >
                      (
                      {columnId
                        ? t('RowAndColumn', {
                            rowId: parseInt(rowId, 10) + 1,
                            columnId,
                          })
                        : t('Row', { rowId: parseInt(rowId, 10) + 1 })}
                      )
                    </Typography>
                  </>
                }
              />
            </ListItem>
          );
        })}
      {errors.length > 3 ? (
        <ListItemText primary={t('AndMore', { count: errors.length - 3 })} />
      ) : null}
    </List>
  );
};

export default withStyles(styles)(SpreadsheetErrors);

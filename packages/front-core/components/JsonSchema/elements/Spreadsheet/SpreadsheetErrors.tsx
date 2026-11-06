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
    // preserved typo from the original — this key is never actually applied
    fonSize: 16,
  } as Record<string, unknown>,
};

interface SpreadsheetError {
  path: string;
  dataPath?: string;
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
  totalErrors?: number;
}

const SpreadsheetErrors = ({
  t,
  classes,
  errors,
  headers,
  items,
  setJumpTo,
  totalErrors,
}: SpreadsheetErrorsProps) => {
  if (!errors || !Array.isArray(errors) || !errors.length) {
    return null;
  }

  const headerNames = headers[headers.length - 1].map(
    (row) => (row as HeaderCellData).label || (row as string),
  );
  const propNames = Object.keys(items.properties || {});

  const filteredErrors = Object.values(
    errors.reduce((acc: Record<string, SpreadsheetError>, error) => {
      if (!acc[error.dataPath as string]) {
        acc[error.dataPath as string] = error;
      }
      return acc;
    }, {}),
  );

  return (
    <List>
      {filteredErrors
        .filter(({ rowId }) => !isNaN(rowId as number))
        .slice(0, 3)
        .map((error, index) => {
          const [rowId, columnName] = (error.relativePath || []) as [string, string];
          const columnId = headerNames[propNames.indexOf(columnName)];

          return (
            <ListItem
              key={rowId}
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
                      style={{ fontSize: 16 }}
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
      {filteredErrors.length > 3 ? (
        <ListItemText
          primary={t('AndMore', { count: Number(totalErrors) - 3 })}
        />
      ) : null}
    </List>
  );
};

export default withStyles(styles)(SpreadsheetErrors);

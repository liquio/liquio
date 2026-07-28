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

import withStyles from '@mui/styles/withStyles';

const styles = {
  item: {
    color: '#f44336',
  },
  itemDetails: {
    marginLeft: 4,
  },
};

const SpreadsheetErrors = ({
  t,
  classes,
  errors,
  headers,
  items,
  setJumpTo,
}) => {
  if (!errors || !Array.isArray(errors) || !errors.length) {
    return null;
  }

  const headerNames = headers[headers.length - 1].map(
    (row) => row.label || row,
  );
  const propNames = Object.keys(items.properties || {});

  return (
    <List>
      {errors
        .filter(({ rowId }) => !isNaN(rowId))
        .slice(0, 3)
        .map((error, index) => {
          const [rowId, columnName] = error.relativePath || [];
          const columnId = headerNames[propNames.indexOf(columnName)];

          return (
            <ListItem
              key={index}
              className={classes.item}
              button={true}
              onClick={() => setJumpTo({ rowId, columnName })}
            >
              <ListItemIcon>
                <ErrorOutlineIcon />
              </ListItemIcon>
              <ListItemText
                primary={
                  <>
                    <EJVError key={index} error={error} />
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

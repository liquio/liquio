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
    fonSize: 16,
  },
};

const SpreadsheetErrors = ({
  t,
  classes,
  errors,
  headers,
  items,
  setJumpTo,
  totalErrors,
}) => {
  if (!errors || !Array.isArray(errors) || !errors.length) {
    return null;
  }

  const headerNames = headers[headers.length - 1].map(
    (row) => row.label || row,
  );
  const propNames = Object.keys(items.properties || {});

  const filteredErrors = Object.values(
    errors.reduce((acc, error) => {
      if (!acc[error.dataPath]) {
        acc[error.dataPath] = error;
      }
      return acc;
    }, {}),
  );

  return (
    <List>
      {filteredErrors
        .filter(({ rowId }) => !isNaN(rowId))
        .slice(0, 3)
        .map((error, index) => {
          const [rowId, columnName] = error.relativePath || [];
          const columnId = headerNames[propNames.indexOf(columnName)];

          return (
            <ListItem
              key={rowId}
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

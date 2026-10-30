/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import classNames from 'classnames';

import { Paper, FormHelperText, IconButton } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

import { SchemaForm } from 'components/JsonSchema';
import EJVError from 'components/JsonSchema/components/EJVError';

const styles = (theme: Theme) => ({
  elementContainer: {
    display: 'flex',
    margin: '10px 0',
    ...((theme as unknown as { arrayElementContainer?: object }).arrayElementContainer || {}),
  },
  flexGrow: {
    flex: 1,
    [theme.breakpoints.down('sm')]: {
      maxWidth: '100%',
    },
  },
  serializeItem: {
    padding: 10,
    paddingTop: 10,
    [theme.breakpoints.down('md')]: {
      padding: 0,
      boxShadow: 'none',
      backgroundColor: 'transparent',
    },
    ...((theme as unknown as { arraySerializeItem?: object }).arraySerializeItem || {}),
  },
  errorPaper: {
    boxShadow:
      '0px 1px 3px 0px rgba(255, 0, 0, 1), 0px 1px 1px 0px rgba(255, 0, 0, 1), 0px 2px 1px -1px rgba(255, 0, 0, 1)',
    [theme.breakpoints.down('md')]: {
      boxShadow: 'none',
    },
  },
  paperErrorHint: {
    margin: '-22px 0 10px',
    color: 'red',
  },
  closeButtonContainer: {
    padding: '0 4px',
  },
  disableBoxShadow: {
    boxShadow: 'none',
  },
  darkTheme: {
    backgroundColor: '#404040',
  },
  noBorder: {
    boxShadow: 'none',
    border: 'none',
    ...((theme as unknown as { arrayNoBorder?: object }).arrayNoBorder || {}),
  },
});

interface ArrayElementItemProps extends WithStyles<typeof styles> {
  path: Array<string | number>;
  error?: unknown;
  schemaProps?: Record<string, unknown>;
  handleDeleteItem?: () => void;
  deleteAllowed?: boolean;
  disableBoxShadow?: boolean;
  staticState?: unknown;
  darkTheme?: boolean;
  noBorder?: boolean;
  hideDeleteButton?: boolean;
}

const ArrayElementItem = ({
  classes,
  path,
  error,
  schemaProps = {},
  handleDeleteItem = () => null,
  deleteAllowed = true,
  disableBoxShadow = false,
  staticState = false,
  darkTheme = false,
  noBorder = false,
  hideDeleteButton = false,
}: ArrayElementItemProps) => (
  <div className={classes.elementContainer}>
    <div className={classes.flexGrow}>
      <Paper
        id={path.concat('container').join('-')}
        className={classNames({
          [classes.serializeItem]: true,
          [classes.errorPaper]: !!error,
          [classes.disableBoxShadow]: disableBoxShadow,
          [classes.darkTheme]: darkTheme,
          [classes.noBorder]: noBorder,
        })}
        elevation={1}
      >
        <SchemaForm {...schemaProps} />
      </Paper>
      {error ? (
        <FormHelperText className={classes.paperErrorHint}>
          <EJVError error={error as never} />
        </FormHelperText>
      ) : null}
    </div>
    {!hideDeleteButton && deleteAllowed && !staticState ? (
      <div className={classes.closeButtonContainer}>
        <IconButton
          id={path.concat('remove-button').join('-')}
          onClick={handleDeleteItem}
          size="large"
        >
          <CloseIcon />
        </IconButton>
      </div>
    ) : null}
  </div>
);

export default withStyles(styles)(ArrayElementItem);

import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Typography, FormControl, FormHelperText, Toolbar } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import renderHTML from 'helpers/renderHTML';
import EJVError from './EJVError';
import FieldLabel from './FieldLabel';

const styles = (theme: Theme) => ({
  root: {
    display: 'block',
    marginBottom: 40,
    marginTop: 20,
    maxWidth: 640,
    [theme.breakpoints.down('md')]: {
      marginBottom: 20
    }
  },
  withPadding: {
    padding: '10px 20px',
    marginBottom: '0 !important'
  },
  fullWidth: {
    maxWidth: 'unset'
  },
  sample: {
    maxWidth: 1000
  },
  description: {
    maxWidth: 1000,
    ...((theme as unknown as { description?: object }).description || {}),
    [theme.breakpoints.down('md')]: {
      fontSize: 16,
      lineHeight: '24px'
    }
  },
  groupContainer: {
    position: 'relative' as const,
    marginTop: 0,
    marginBottom: 40,
    [theme.breakpoints.down('md')]: {
      marginBottom: 25
    }
  },
  outlined: {
    border: '1px solid rgba(224, 224, 224, 1)',
    padding: '0 20px'
  },
  outlinedSample: {
    maxWidth: 1000,
    marginTop: 0
  },
  errored: {
    borderColor: '#f44336',
    color: theme.palette.error.main || '#f44336'
  },
  requiredFieldError: {
    position: 'relative' as const,
    top: -35,
    [theme.breakpoints.down('md')]: {
      top: 0,
      marginBottom: 5,
      marginTop: 0
    }
  },
  errorWithMargin: {
    marginBottom: 40
  },
  noMargin: {
    margin: 0
  }
});

interface ElementGroupContainerProps extends WithStyles<typeof styles> {
  className?: string;
  descriptionClassName?: string;
  outlined?: boolean;
  required?: boolean;
  description?: string;
  sample?: string;
  actionButtons?: ReactNode;
  children: ReactNode;
  error?: unknown;
  variant?: import('@mui/material/styles/createTypography').Variant;
  width?: number | string | null;
  fullWidth?: boolean;
  maxWidth?: number | null;
  path?: Array<string | number>;
  useOwnContainer?: boolean;
  notRequiredLabel?: string | null;
  noMargin?: boolean;
  jsonSchema?: { fullWidth?: boolean };
  // Accepted for pass-through compatibility with callers (e.g. FormGroup) that
  // forward their own props here; this component never reads them itself.
  checkValid?: unknown;
  checkRequired?: unknown;
}

const ElementGroupContainer = ({
  classes,
  className,
  descriptionClassName,
  outlined,
  required,
  description = '',
  sample = '',
  actionButtons,
  children,
  error,
  variant = 'h5',
  width = null,
  fullWidth,
  maxWidth = null,
  path,
  useOwnContainer,
  notRequiredLabel = null,
  noMargin,
  jsonSchema
}: ElementGroupContainerProps) => {
  const sampleText = sample && typeof sample === 'string' ? renderHTML(sample) : sample;
  const fullWidthTask = jsonSchema && jsonSchema.fullWidth;

  const actionToolbar = actionButtons ? (
    <Toolbar disableGutters={true}>{actionButtons}</Toolbar>
  ) : null;

  const descriptionComponent = description ? (
    <Typography
      variant={variant}
      gutterBottom={!outlined}
      className={classNames(
        {
          [classes.description]: true
        },
        descriptionClassName
      )}
      tabIndex={0}
      aria-label={description}
      id={(path && Array.isArray(path) && path.join('-') + '-description') || undefined}
    >
      <FieldLabel
        description={description}
        required={required}
        notRequiredLabel={notRequiredLabel as string}
      />
      {actionToolbar}
    </Typography>
  ) : (
    actionToolbar
  );

  return (
    <>
      {outlined && descriptionComponent}
      {sampleText && outlined ? (
        <FormHelperText className={classes.outlinedSample} error={!!error}>
          {sampleText as ReactNode}
        </FormHelperText>
      ) : null}
      <FormControl
        variant="standard"
        error={!!error}
        className={classNames(
          {
            [classes.root]: true,
            [classes.groupContainer]: true,
            [classes.withPadding]: !!useOwnContainer,
            [classes.fullWidth]: !!(fullWidth || fullWidthTask),
            [classes.outlined]: !!outlined,
            [classes.errored]: !!error,
            [classes.noMargin]: !!noMargin
          },
          className
        )}
        style={{ width: width ?? undefined, maxWidth: maxWidth ?? undefined }}
        id={(path && Array.isArray(path) && path.join('.')) || undefined}
      >
        {!outlined && descriptionComponent}
        {sampleText && !outlined ? (
          <FormHelperText style={{ color: '#000' }} className={classes.sample} error={!!error}>
            {sampleText as ReactNode}
          </FormHelperText>
        ) : null}
        {children}
      </FormControl>
      {error ? (
        <FormHelperText
          id={`${path && Array.isArray(path) ? path.join('-') : 'field'}-error`}
          className={!noMargin ? classes.requiredFieldError : classes.errorWithMargin}
          style={{ fontSize: 13 }}
          error={!!error}
          aria-live="assertive"
          role="alert"
        >
          <EJVError error={error as never} />
        </FormHelperText>
      ) : null}
    </>
  );
};

export default withStyles(styles)(ElementGroupContainer);

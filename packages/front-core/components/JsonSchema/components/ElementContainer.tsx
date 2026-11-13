import React, { ReactNode } from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { FormControl, FormHelperText, Typography } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import MobileDetect from 'mobile-detect';

import renderHTML from 'helpers/renderHTML';
import EJVError from './EJVError';
import FieldLabel from './FieldLabel';

const styles = (theme: Theme) => ({
  root: {
    display: 'block!important',
    marginBottom: 40,
    marginTop: 5,
    maxWidth: 640,
    [theme.breakpoints.down('lg')]: {
      marginBottom: 25
    },
    [theme.breakpoints.down('md')]: {
      marginBottom: 25
    },
    [theme.breakpoints.down('sm')]: {
      fontSize: 13
    }
  },
  description: {
    maxWidth: 1000,
    ...((theme as unknown as { description?: object }).description || {}),
    [theme.breakpoints.down('md')]: {
      fontSize: 16,
      lineHeight: '24px'
    }
  },
  noMargin: {
    margin: 0
  },
  sample: {
    color: 'rgba(0, 0, 0, 0.38)'
  },
  groupContainer: {
    position: 'relative' as const,
    [theme.breakpoints.down('md')]: {
      marginBottom: 25
    }
  },
  outlined: {
    border: '1px solid rgba(224, 224, 224, 1)',
    padding: '0 20px'
  },
  errored: {
    borderColor: '#f44336',
    color: '#f44336'
  },
  sampleComponent: {
    whiteSpace: 'normal' as const,
    fontSize: 12,
    marginLeft: 0,
    marginRight: 0
  },
  rowDisplay: {
    display: 'inline-block',
    width: '50%'
  },
  labelRoot: {
    '& legend': {
      opacity: 1,
      [theme.breakpoints.down('md')]: {
        fontSize: 13
      }
    }
  },
  disabled: {
    color: '#797878',
    '& legend': {
      color: '#797878'
    }
  }
});

const getCoordinated = (position: { top?: Record<string, unknown>; left?: Record<string, unknown> }) => {
  const { innerWidth } = window;
  const { top, left } = position;
  if (innerWidth > 960) return { top: top && top.lg, left: left && left.lg };
  if (innerWidth > 600) return { top: top && top.md, left: left && left.md };
  if (innerWidth < 600) return { top: top && top.xs, left: left && left.xs };
  return {};
};

interface ElementContainerProps extends WithStyles<typeof styles> {
  children: ReactNode;
  sample?: string;
  description?: string;
  width?: number | string | null;
  maxWidth?: number | null;
  row?: boolean;
  bottomError?: boolean;
  position?: { top?: Record<string, unknown>; left?: Record<string, unknown> } | null;
  notRequiredLabel?: string | null;
  id?: string | null;
  onKeyDownCapture?: React.KeyboardEventHandler | null;
  bottomSample?: boolean;
  disabled?: boolean;
  variant?: import('@mui/material/styles/createTypography').Variant;
  className?: string;
  containerRef?: React.Ref<unknown>;
  required?: boolean;
  descriptionClassName?: string;
  widthMobile?: number | string;
  margin?: string | number;
  [key: string]: unknown;
}

const ElementContainer = ({
  row = false,
  error,
  width = null,
  sample = '',
  classes,
  maxWidth = null,
  position = null,
  noMargin,
  children,
  required,
  className,
  bottomError = false,
  description = '',
  bottomSample = true,
  containerRef,
  notRequiredLabel = null,
  descriptionClassName,
  id = null,
  onKeyDownCapture = null,
  disabled = false,
  variant = 'h5',
  widthMobile,
  margin,
  ...rest
}: ElementContainerProps) => {
  const sampleText = sample && typeof sample === 'string' ? renderHTML(sample) : sample;
  const md = new MobileDetect(window.navigator.userAgent);
  const isMobile = !!md.mobile();
  const formWidth = isMobile && widthMobile ? widthMobile : width;

  const sampleComponent =
    (error || sampleText) && !noMargin ? (
      <FormHelperText
        component="div"
        className={classNames({
          [classes.sampleComponent]: !!error,
          [classes.disabled]: !!disabled
        })}
        style={{ fontSize: 13 }}
      >
        {error && !bottomError ? <EJVError error={error as never} /> : null}
        <div>{sampleText as ReactNode}</div>
      </FormHelperText>
    ) : null;

  return (
    <FormControl
      variant="standard"
      ref={containerRef as React.Ref<HTMLDivElement>}
      error={!!error}
      className={classNames(
        classes.root,
        {
          [classes.rowDisplay]: row,
          [classes.noMargin]: !!noMargin
        },
        className
      )}
      classes={{
        root: classNames(descriptionClassName, {
          [classes.labelRoot]: true,
          [classes.disabled]: !!disabled
        })
      }}
      style={{
        width: formWidth ?? undefined,
        maxWidth: maxWidth ?? undefined,
        margin,
        ...((position ? getCoordinated(position) : {}) as React.CSSProperties)
      }}
      {...({ row: row.toString() } as Record<string, unknown>)}
      id={id ?? undefined}
      onKeyDownCapture={onKeyDownCapture ?? undefined}
    >
      {description ? (
        <Typography
          variant={variant}
          className={classNames({
            [classes.description]: true
          })}
          tabIndex={0}
          aria-label={description}
        >
          <FieldLabel
            description={description}
            required={required}
            notRequiredLabel={notRequiredLabel as string}
            {...rest}
          />
        </Typography>
      ) : null}

      {!bottomSample && sampleComponent}

      {children}

      {bottomSample && sampleComponent}

      {error && bottomError && !noMargin ? (
        <FormHelperText error={!!error}>
          <EJVError error={error as never} />
        </FormHelperText>
      ) : null}
    </FormControl>
  );
};

const styled = withStyles(styles)(ElementContainer);
export default translate('Elements')(styled);

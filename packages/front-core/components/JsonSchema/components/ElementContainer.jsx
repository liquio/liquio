import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { FormControl, FormHelperText, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import MobileDetect from 'mobile-detect';

import renderHTML from 'helpers/renderHTML';
import EJVError from './EJVError';
import FieldLabel from './FieldLabel';

const styles = (theme) => ({
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
    ...(theme.description || {}),
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
    position: 'relative',
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
    whiteSpace: 'normal',
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

const getCoordinated = (position) => {
  const { innerWidth } = window;
  const { top, left } = position;
  if (innerWidth > 960) return { top: top && top.lg, left: left && left.lg };
  if (innerWidth > 600) return { top: top && top.md, left: left && left.md };
  if (innerWidth < 600) return { top: top && top.xs, left: left && left.xs };
  return {};
};

const ElementContainer = ({
  row,
  error,
  width,
  sample,
  classes,
  maxWidth,
  position,
  noMargin,
  children,
  required,
  className,
  bottomError,
  description,
  bottomSample,
  containerRef,
  notRequiredLabel,
  descriptionClassName,
  id,
  onKeyDownCapture,
  disabled,
  variant,
  widthMobile,
  margin,
  ...rest
}) => {
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
          [classes.disabled]: disabled
        })}
        style={{ fontSize: 13 }}
      >
        {error && !bottomError ? <EJVError error={error} /> : null}
        <div>{sampleText}</div>
      </FormHelperText>
    ) : null;

  return (
    <FormControl
      variant="standard"
      ref={containerRef}
      error={!!error}
      className={classNames(
        classes.root,
        {
          [classes.rowDisplay]: row,
          [classes.noMargin]: noMargin
        },
        className
      )}
      classes={{
        root: classNames(descriptionClassName, {
          [classes.labelRoot]: true,
          [classes.disabled]: disabled
        })
      }}
      style={{
        width: formWidth,
        maxWidth,
        margin,
        ...(position ? getCoordinated(position) : {})
      }}
      row={row.toString()}
      id={id}
      onKeyDownCapture={onKeyDownCapture}
    >
      {description ? (
        <Typography
          variant={variant}
          className={classNames({
            [classes.description]: true
          })}
          tabIndex="0"
          aria-label={description}
        >
          <FieldLabel
            description={description}
            required={required}
            notRequiredLabel={notRequiredLabel}
            {...rest}
          />
        </Typography>
      ) : null}

      {!bottomSample && sampleComponent}

      {children}

      {bottomSample && sampleComponent}

      {error && bottomError && !noMargin ? (
        <FormHelperText error={!!error}>
          <EJVError error={error} />
        </FormHelperText>
      ) : null}
    </FormControl>
  );
};

ElementContainer.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
  classes: PropTypes.object.isRequired,
  sample: PropTypes.string,
  description: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  maxWidth: PropTypes.number,
  row: PropTypes.bool,
  bottomError: PropTypes.bool,
  position: PropTypes.object,
  notRequiredLabel: PropTypes.string,
  id: PropTypes.string,
  onKeyDownCapture: PropTypes.func,
  bottomSample: PropTypes.bool,
  disabled: PropTypes.bool,
  variant: PropTypes.string
};

ElementContainer.defaultProps = {
  sample: '',
  description: '',
  width: null,
  maxWidth: null,
  row: false,
  bottomError: false,
  position: null,
  notRequiredLabel: null,
  id: null,
  onKeyDownCapture: null,
  bottomSample: true,
  disabled: false,
  variant: 'h5'
};

const styled = withStyles(styles)(ElementContainer);
export default translate('Elements')(styled);

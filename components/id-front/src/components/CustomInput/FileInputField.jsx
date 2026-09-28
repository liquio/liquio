import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import classNames from 'classnames';
import { Paper, FormControl, Typography, FormHelperText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { ReactComponent as UploadIcon } from 'assets/img/ic_upload.svg';
import theme from 'themes';

const fileLimit = 50;

const styles = (theme) => ({
  root: {
    marginTop: 24,
    display: 'block',
    ...(theme.selectFilesAlt
      ? {
          marginTop: 0,
        }
      : {}),
  },
  paper: {
    border: '2px dashed #727272',
    ...(theme.selectFilesAlt
      ? {
          border: '1px dashed rgba(68, 68, 68, 0.55)',
          borderRadius: 4,
        }
      : {}),
  },
  errored: {
    border: `2px dashed ${theme?.palette?.error?.main}`,
  },
  disabled: {
    border: '2px dashed #dadada',
  },
  dropZone: {
    outline: 'none',
    padding: '20px 100px',
    textAlign: 'center',
    [theme.breakpoints.down('sm')]: {
      padding: '10px 20px',
    },
    ...(theme.selectFilesAlt
      ? {
          padding: 24,
        }
      : {}),
    [theme.breakpoints.down('sm')]: {
      padding: 15,
    },
    '&:focus': {
      outline: `3px solid ${theme.outlineColor}`,
      outlineOffset: 2,
    },
    '&:focus-visible': {
      outline: `3px solid ${theme.outlineColor}`,
      outlineOffset: 2,
    },
  },
  title: {
    fontSize: 18,
    lineHeight: '24px',
    wordBreak: 'break-word',
    ...(theme.selectFilesAlt
      ? {
          fontSize: 16,
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: '28px',
          letterSpacing: '0.15px',
          paddingTop: 8,
          paddingBottom: 8,
          ['@media (max-width:767px)']: {
            fontSize: 14,
            lineHeight: '21px',
            letterSpacing: '0.25px',
          },
        }
      : {}),
  },
  selectedTitle: {
    ...(theme.selectFilesAlt
      ? {
          margin: 0,
          padding: 0,
          marginTop: 2,
        }
      : {}),
  },
  selectedTitleBottom: {
    ...(theme.selectFilesAlt
      ? {
          marginBottom: 8,
          marginTop: 0,
        }
      : {}),
  },
  link: {
    textDecoration: 'underline',
    cursor: 'pointer',
    ...(theme.selectFilesAlt
      ? {
          color: theme.palette.primary.main,
        }
      : {}),
  },
  dropNewLink: {
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: '16px',
    ...(theme.selectFilesAlt
      ? {
          color: theme?.dropNewLink?.color || '#0068FF',
          textAlign: 'center',
          fontSize: 14,
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: '20px',
          letterSpacing: '0.17px',
        }
      : {}),
  },
  limits: {
    fontSize: 12,
    lineРeight: '26px',
    paddingLeft: 5,
    paddingRight: 5,
    color: '#767676',
    ...(theme.selectFilesAlt
      ? {
          opacity: 1,
          fontSize: 14,
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: '20px',
          letterSpacing: '0.17px',
          color: '#444',
          ['@media (max-width:767px)']: {
            fontSize: 12,
            lineHeight: '16px',
            letterSpacing: '0.4px',
          },
        }
      : {}),
  },
  focusedItem: {
    marginBottom: 20,
    ...(theme.selectFilesAlt
      ? {
          marginBottom: 0,
        }
      : {}),
  },
  dropZoneActive: {
    background: '#cdd7e3',
  },
  uploadIcon: {
    marginTop: 8,
    '& path': {
      fill: theme?.uploadIcon?.fill || '#0066ff',
    },
  },
});

class FileInputField extends Component {
  state = { active: false };
  errorRef = React.createRef();

  componentDidUpdate(prevProps, prevState) {
    if ((this.state.stateError && !prevState.stateError) || (this.props.error && !prevProps.error)) {
      setTimeout(() => {
        if (this.errorRef?.current) {
          this.errorRef.current.focus();
        }
      }, 0);
    }
  }

  onDrop = (acceptedFiles, rejectedFiles) => {
    const { onChange, t } = this.props;

    if (rejectedFiles.length && !acceptedFiles.length) {
      this.setState({ stateError: { message: t('FileSizeLimit') } });
      onChange && onChange(null);
      return;
    }

    this.setState({ stateError: null });

    onChange && onChange(acceptedFiles[0]);
  };

  setActive = (active) => () => this.setState({ active });

  renderBody = ({ getRootProps, getInputProps } = {}) => {
    const { active, stateError } = this.state;
    const { t, classes, value, error, helperText, disabled } = this.props;

    const rootProps = getRootProps ? getRootProps() : {};
    const inputProps = getInputProps
      ? getInputProps({
          'aria-label': t('UploadFiles'),
        })
      : {};

    return (
      <FormControl variant="standard" error={!!error || !!stateError} className={classes.root}>
        <Paper
          {...rootProps}
          elevation={0}
          className={classNames(classes.paper, {
            [classes.dropZoneActive]: active,
            [classes.errored]: !!error || !!stateError,
            [classes.disabled]: disabled,
          })}
          tabIndex={0}
        >
          <div className={classes.dropZone} aria-label={t('DropFilesAriaLabel')}>
            {disabled ? null : <input {...inputProps} />}

            {theme?.selectFilesAlt ? <UploadIcon className={classes.uploadIcon} /> : null}
            {value ? (
              <>
                <Typography variant="body1" className={[classes.title, classes.selectedTitle]}>
                  {t('DropedFile')}
                </Typography>
                {value.name ? (
                  <Typography variant="body1" className={[classes.title, classes.selectedTitle, classes.selectedTitleBottom]}>
                    {value.name}
                  </Typography>
                ) : null}
                <Typography variant="body1" className={classes.dropNewLink} style={disabled ? { opacity: 0.5 } : {}}>
                  {t('DropNewFile')}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body1" className={classes.title}>
                  {t('DropFiles', {
                    link: <div className={classes.link}>{t('UploadFiles')}</div>,
                  })}
                </Typography>
                <Typography variant="body2" className={classes.limits}>
                  {t('DropFilesLimits', { size: fileLimit })}
                </Typography>
              </>
            )}
          </div>
        </Paper>
        {helperText ? (
          <FormHelperText tabIndex={-1} ref={this.errorRef} role="alert" aria-live="assertive">
            {helperText}
          </FormHelperText>
        ) : null}
        {error ? error.message : null}
        {stateError ? (
          <FormControl variant="standard" error={true}>
            <FormHelperText tabIndex={0}>{stateError.message}</FormHelperText>
          </FormControl>
        ) : null}
      </FormControl>
    );
  };

  render() {
    const { classes, accept, disabled } = this.props;

    if (disabled) {
      return this.renderBody();
    }

    return (
      <Dropzone
        multiple={false}
        accept={accept}
        maxSize={fileLimit * 1024 * 1024}
        activeClassName={classes.dropZoneActive}
        onDrop={this.onDrop}
        onDragEnter={this.setActive(true)}
        onDragLeave={this.setActive(false)}
      >
        {this.renderBody}
      </Dropzone>
    );
  }
}

FileInputField.propTypes = {
  onChange: PropTypes.func.isRequired,
};

FileInputField.defaultProps = {};

export default withStyles(styles)(FileInputField);

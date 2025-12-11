import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import classNames from 'classnames';
import { Paper, FormControl, Typography, FormHelperText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const fileLimit = 50;

const styles = (theme) => ({
  root: {
    marginTop: 24,
    display: 'block'
  },
  paper: {
    border: '2px dashed #808080'
  },
  errored: {
    border: '2px dashed rgba(255,0,0,1)'
  },
  disabled: {
    border: '2px dashed #dadada'
  },
  dropZone: {
    padding: '20px 100px',
    textAlign: 'center',
    [theme.breakpoints.down('lg')]: {
      padding: '10px 20px'
    }
  },
  title: {
    fontSize: 18,
    lineHeight: '24px',
    wordBreak: 'break-word',
    [theme.breakpoints.down('lg')]: {
      fontSize: 15
    }
  },
  link: {
    textDecoration: 'underline',
    cursor: 'pointer'
  },
  dropNewLink: {
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '12px',
    lineРeight: '16px'
  },
  subtitle: {
    fontSize: '12px',
    lineРeight: '26px',
    opacity: 0.6
  },
  dropZoneActive: {
    background: '#cdd7e3'
  },
  uploadButton: {
    marginLeft: 16
  },
  uploadButtonContainer: {
    marginBottom: 20,
    '@media screen and (max-width: 425px)': {
      padding: 0,
      marginBottom: 15
    }
  },
  raw: {
    padding: 20,
    fontSize: 18,
    textAlign: 'left',
    '& ul, ol, p, a': {
      margin: 0,
      marginBottom: 15
    },
    '& ul, ol': {
      paddingLeft: 15,
      '& li': {
        marginBottom: 10
      }
    },
    '& a': {
      color: '#009be5'
    }
  },
  fontReg: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize,
    fontWeight: theme.typography.fontWeightRegular,
    lineHeight: '20px'
  }
});

class FileInputField extends Component {
  state = { active: false };

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
          'aria-label': t('UploadFiles')
        })
      : {};

    return (
      <FormControl variant="standard" error={!!error || !!stateError} className={classes.root}>
        <Paper
          elevation={0}
          className={classNames(classes.paper, {
            [classes.dropZoneActive]: active,
            [classes.errored]: !!error || !!stateError,
            [classes.disabled]: disabled
          })}
        >
          <div {...rootProps} className={classes.dropZone}>
            {disabled ? null : <input {...inputProps} />}
            {value ? (
              <React.Fragment>
                <Typography variant="body1" className={classes.title}>
                  {t('DropedFile')}
                </Typography>
                {value.name ? (
                  <Typography variant="body1" className={classes.title}>
                    {value.name}
                  </Typography>
                ) : null}
                <Typography
                  variant="body1"
                  className={classes.dropNewLink}
                  style={disabled ? { color: '#444444' } : {}}
                >
                  {t('DropNewFile')}
                </Typography>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Typography variant="body1" className={classes.title}>
                  {t('DropFiles', {
                    link: <span className={classes.link}>{t('UploadFiles')}</span>
                  })}
                </Typography>
                <Typography variant="body2" className={classes.subtitle}>
                  {t('DropFilesLimits', { size: fileLimit })}
                </Typography>
              </React.Fragment>
            )}
          </div>
        </Paper>
        {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
        {error ? error.message : null}
        {stateError ? (
          <FormControl variant="standard" error={true}>
            <FormHelperText>{stateError.message}</FormHelperText>
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
  onChange: PropTypes.func.isRequired
};

FileInputField.defaultProps = {};

export default withStyles(styles)(FileInputField);

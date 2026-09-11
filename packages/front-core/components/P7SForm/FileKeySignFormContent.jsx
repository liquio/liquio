import React from 'react';
import MobileDetect from 'mobile-detect';
import {
  Button,
  FormControl,
  MenuItem,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  InputAdornment,
  IconButton,
  Typography,
  CircularProgress
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import FileInputField from 'components/CustomInput/FileInputField';
import renderHTML from 'helpers/renderHTML';

const md = new MobileDetect(window.navigator.userAgent);
const isIOS = md.is('iPhone') || md.os() === 'iPadOS';
const isIPadOS =
  window.navigator.userAgent.match(/Mac/) &&
  window.navigator.maxTouchPoints &&
  window.navigator.maxTouchPoints > 2;

const styles = (theme) => ({
  content: {
    padding: '0 !important',
    marginBottom: 40
  },
  grow: {
    flexGrow: 1
  },
  menuItem: {
    '@media screen and (max-width: 767px)': {
      display: 'block',
      fontSize: '12px',
      overflow: 'hidden',
      whiteSpace: 'unset',
      minHeight: 'unset',
      textOverflow: 'ellipsis'
    }
  },
  actions: {
    marginTop: 10,
    justifyContent: 'flex-start',
    [theme.breakpoints.down('md')]: {
      paddingLeft: 0,
      paddingRight: 0,
      display: 'flex',
      textAlign: 'center',
      '& > :not(:first-of-type)': {
        marginLeft: 10
      }
    },
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 0,
      paddingRight: 0,
      display: 'flex',
      textAlign: 'center',
      '& > :not(:first-of-type)': {
        marginLeft: 10
      }
    }
  },
  progress: {
    marginRight: 4
  },
  progressText: {
    marginBottom: 10
  },
  button: {
    [theme.breakpoints.down('md')]: {
      width: '100%',
      marginBottom: 10
    }
  },
  form: {
    [theme.breakpoints.down('md')]: {
      height: 210
    }
  }
});

const FileKeySignFormContent = ({
  t,
  classes,
  setId,
  onClose,
  readPrivateKeyText,
  busy,
  signProgress,
  signProgressText,
  keyFile,
  password,
  errors,
  signingError,
  showErrorDialog,
  keys,
  selectedKey,
  showPassword,
  handleKeyChange,
  handleChange,
  handleClose,
  handleSelectKey,
  tryToSubmit,
  passwordRef,
  toggleShowPassword
}) => {
  return (
    <>
      <DialogContent className={classes.content}>
        <FormControl
          variant="standard"
          className={classes.form}
          fullWidth={true}
          id={setId('form')}
        >
          <FileInputField
            t={t}
            id={setId('file')}
            label={t('Key')}
            error={!!errors.key}
            value={keyFile}
            margin="normal"
            disabled={busy}
            helperText={errors.key}
            accept={isIOS || isIPadOS ? null : '.p12'}
            onChange={handleKeyChange}
          />
          {Object.keys(keys).length > 1 ? (
            <TextField
              variant="standard"
              id={setId('key')}
              select={true}
              label={t('SelectedKey')}
              value={selectedKey}
              onChange={handleChange('selectedKey')}
              margin="normal"
              disabled={busy}
              SelectProps={{ MenuProps: { className: classes.menu } }}
            >
              {Object.keys(keys).map((option) => (
                <MenuItem
                  key={option}
                  value={option}
                  id={setId(`server-${option}`)}
                  className={classes.menuItem}
                >
                  {t(option)}
                  {keys[option] ? ` (${keys[option].subjCN})` : null}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            variant="standard"
            inputRef={passwordRef}
            id={setId('password')}
            label={t('Password')}
            value={password || ''}
            error={!!errors.password}
            onKeyPress={tryToSubmit}
            onChange={handleChange('password')}
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            disabled={busy}
            helperText={errors.password}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={toggleShowPassword}
                    size="large"
                  >
                    {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </FormControl>
      </DialogContent>
      {busy ? (
        <>
          {signProgressText ? (
            <Typography className={classes.progressText}>
              {signProgress ? <CircularProgress size={12} className={classes.progress} /> : null}
              {signProgressText}
            </Typography>
          ) : null}
          <LinearProgress
            value={signProgress}
            variant={signProgress ? 'determinate' : 'indeterminate'}
          />
        </>
      ) : null}
      <DialogActions className={classes.actions}>
        {onClose ? (
          <Button
            size="large"
            onClick={onClose}
            disabled={busy}
            variant="outlined"
            id={setId('cancel-button')}
            setId={(elementName) => setId(`cancel-${elementName}`)}
            className={classes.button}
          >
            {t('Cancel')}
          </Button>
        ) : null}
        <Button
          size="large"
          color="primary"
          variant="contained"
          onClick={handleSelectKey}
          disabled={busy}
          id={setId('sign-button')}
          setId={(elementName) => setId(`sign-${elementName}`)}
          className={classes.button}
        >
          {readPrivateKeyText || t('Sign')}
        </Button>
      </DialogActions>
      <Dialog
        open={showErrorDialog}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        id={setId('dialog')}
        className={classes.dialog}
      >
        <DialogTitle
          id={setId('dialog alert-dialog-title')}
          className={classes.dialogContentWrappers}
        >
          {t('SigningDataError')}
        </DialogTitle>
        <DialogContent className={classes.dialogContentWrappers}>
          <DialogContentText id={setId('dialog alert-dialog-description')}>
            {renderHTML(signingError)}
          </DialogContentText>
        </DialogContent>
        <DialogActions className={classes.dialogContentWrappers}>
          <Button
            color="primary"
            onClick={handleClose}
            autoFocus={true}
            id={setId('close-button')}
            setId={(elementName) => setId(`close-${elementName}`)}
          >
            {t('CloseDialog2')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const styled = withStyles(styles)(FileKeySignFormContent);
export default styled;

import React from 'react';
import { makeStyles } from '@mui/styles';
import { translate } from 'react-translate';
import { Button, Box, IconButton, InputAdornment, DialogActions, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import StringElement from 'components/CustomInput/StringElement';
import ProgressLine from 'components/Preloader/ProgressLine';
import { handleLoginByPassword, handleChangePassword as handleChangePasswordApi } from 'actions/auth';

const useStyles = makeStyles((theme) => ({
  button: {
    marginTop: 20,
    '& > span:first-child': {
      [theme.breakpoints.down('md')]: {
        padding: '16px 32px',
      },
    },
  },
  actions: {
    marginTop: 10,
    marginBottom: 18,
    paddingLeft: 0,
    justifyContent: 'flex-start',
    ...(theme.selectFilesAlt
      ? {
          marginTop: 2,
          marginBottom: 0,
          padding: 0,
        }
      : {}),
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 0,
      paddingRight: 0,
    },
  },
  wrapper: {
    width: '100%',
  },
  mainTitle: {
    display: 'block',
    fontSize: '42px',
    padding: 4,
    [theme.breakpoints.down('md')]: {
      fontSize: '24px',
    },
  },
  errorMessage: {
    color: theme.palette.error.main,
    marginTop: 10,
    marginBottom: 10,
    fontSize: '14px',
    textAlign: 'center',
  },
}));

const CredentialMethod = ({ t, onClose, busy, additionalProps }) => {
  const classes = useStyles();
  const [email, setEmail] = React.useState(additionalProps?.email || '');
  const [password, setPassword] = React.useState(additionalProps?.password || '');
  const [errors, setErrors] = React.useState([]);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newPasswordSecond, setNewPasswordSecond] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showPasswordSecond, setShowPasswordSecond] = React.useState(false);

  const toggleShowPassword = React.useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  const handleChangePasswordAction = React.useCallback(async () => {
    if (loading) return;

    setErrors([]);
    setErrorMessage('');

    const newErrors = [];

    if (!email?.length) {
      newErrors.push('email');
    }

    if (!oldPassword?.length) {
      newErrors.push('oldPassword');
    }

    if (!newPassword?.length) {
      newErrors.push('newPassword');
    }

    if (!newPasswordSecond?.length) {
      newErrors.push('newPasswordSecond');
    }

    if (newPassword !== newPasswordSecond) {
      newErrors.push('PasswordsNotMatch');
    }

    setErrors(newErrors);

    if (newErrors.length) return;

    setLoading(true);

    await handleChangePasswordApi({
      email,
      oldPassword,
      newPassword,
    });

    setLoading(false);
  }, [email, oldPassword, newPassword, newPasswordSecond, loading]);

  const handleChangePassword = React.useCallback(() => {
    setShowChangePassword(!showChangePassword);
  }, [showChangePassword]);

  const handleLogin = React.useCallback(async () => {
    if (loading) return;

    setErrors([]);
    setErrorMessage('');

    const newErrors = [];

    if (!email?.length) {
      newErrors.push('email');
    }

    if (!password?.length) {
      newErrors.push('oldPassword');
    }

    setErrors(newErrors);

    if (newErrors.length) return;

    setLoading(true);

    try {
      const result = await handleLoginByPassword({ email, password });
      if (result instanceof Error) {
        // Handle specific error cases
        if (result.status === 401) {
          setErrorMessage(t('InvalidCredentials'));
        } else if (result.status === 429) {
          setErrorMessage(t('TooManyAttempts'));
        } else {
          setErrorMessage(t('LoginError'));
        }
        setLoading(false);
        return;
      }

      const { redirect } = result || {};

      if (!redirect) {
        setLoading(false);
        return;
      }

      setLoading(false);

      window.location.href = redirect;
    } catch (error) {
      // Handle network errors and other exceptions
      if (error.response?.status === 401) {
        setErrorMessage(t('InvalidCredentials'));
      } else if (error.response?.status === 429) {
        setErrorMessage(t('TooManyAttempts'));
      } else {
        setErrorMessage(t('LoginError'));
      }
      setLoading(false);
    }
  }, [email, password, loading, t]);

  if (additionalProps?.email && additionalProps?.password) {
    return (
      <Box className={classes.wrapper}>
        <Typography variant="h1" gutterBottom={true} tabIndex={0} className={classes.mainTitle}>
          {t('LoginAndPassMauritanie')}
        </Typography>

        <Typography>{t('LoginAndPassMauritanieText')}</Typography>

        {errorMessage && (
          <Typography className={classes.errorMessage}>
            {errorMessage}
          </Typography>
        )}

        <Button variant="contained" color="primary" disabled={busy} onClick={handleLogin} className={classes.button}>
          {t('Enter')}
        </Button>

        <ProgressLine loading={loading} />
      </Box>
    );
  }

  return (
    <Box className={classes.wrapper}>
      <Typography variant="h1" gutterBottom={true} tabIndex={0} className={classes.mainTitle}>
        {t('LoginAndPass')}
      </Typography>
      <StringElement
        label={t('Email')}
        required={true}
        fullWidth={true}
        variant={'outlined'}
        value={email}
        error={errors.includes('email') ? t('RequiredField') : null}
        onChange={({ target: { value } }) => setEmail(value)}
      />

      {showChangePassword ? (
        <>
          <StringElement
            label={t('OldPassword')}
            required={true}
            fullWidth={true}
            variant={'outlined'}
            value={oldPassword}
            type={showPassword ? 'text' : 'password'}
            error={errors.includes('oldPassword') ? t('RequiredField') : null}
            onChange={({ target: { value } }) => setOldPassword(value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleShowPassword}>{showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}</IconButton>
                </InputAdornment>
              ),
            }}
          />

          <StringElement
            label={t('NewPassword')}
            required={true}
            fullWidth={true}
            variant={'outlined'}
            value={newPassword}
            type={showNewPassword ? 'text' : 'password'}
            error={errors.includes('newPassword') ? t('RequiredField') : null}
            onChange={({ target: { value } }) => setNewPassword(value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={setShowNewPassword}>{showNewPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}</IconButton>
                </InputAdornment>
              ),
            }}
          />

          <StringElement
            label={t('NewPasswordSecond')}
            required={true}
            fullWidth={true}
            variant={'outlined'}
            value={newPasswordSecond}
            type={showPasswordSecond ? 'text' : 'password'}
            error={errors.includes('newPasswordSecond') ? t('RequiredField') : errors.includes('PasswordsNotMatch') ? t('PasswordsNotMatch') : null}
            onChange={({ target: { value } }) => setNewPasswordSecond(value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={setShowPasswordSecond}>{showPasswordSecond ? <VisibilityIcon /> : <VisibilityOffIcon />}</IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button onClick={handleChangePassword}>{t('ToAuth')}</Button>

          {errorMessage && (
            <Typography className={classes.errorMessage}>
              {errorMessage}
            </Typography>
          )}

          <ProgressLine loading={loading} />

          <Button variant="contained" color="primary" onClick={handleChangePasswordAction} className={classes.button}>
            {t('ChangePassword')}
          </Button>
        </>
      ) : (
        <>
          <StringElement
            label={t('Password')}
            required={true}
            fullWidth={true}
            variant={'outlined'}
            value={password}
            type={showPassword ? 'text' : 'password'}
            error={errors.includes('oldPassword') ? t('RequiredField') : null}
            onChange={({ target: { value } }) => setPassword(value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleShowPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button onClick={handleChangePassword}>{t('ChangePassword')}</Button>

          {errorMessage && (
            <Typography className={classes.errorMessage}>
              {errorMessage}
            </Typography>
          )}

          <ProgressLine loading={loading} />

          <DialogActions className={classes.actions}>
            <Button variant="outlined" onClick={() => onClose()} disabled={busy} className={classes.button} aria-label={t('Cancel')}>
              {t('Back')}
            </Button>

            <Button variant="contained" color="primary" disabled={busy} onClick={handleLogin} className={classes.button}>
              {t('Enter')}
            </Button>
          </DialogActions>
        </>
      )}
    </Box>
  );
};

export default translate('LoginPage')(CredentialMethod);

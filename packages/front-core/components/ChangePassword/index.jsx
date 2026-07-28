import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { makeStyles } from '@mui/styles';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';

import StringElement from 'components/JsonSchema/elements/StringElement';
import ProgressLine from 'components/Preloader/ProgressLine';
import { changePassword as changePasswordAction } from 'actions/auth';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';

const useStyles = makeStyles(() => ({
  content: {
    paddingTop: '10px!important'
  }
}));

const ChangePassword = ({ info, opener }) => {
  const t = useTranslate('ChangePassword');
  const classes = useStyles();
  const dispatch = useDispatch();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState(info?.email || '');
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newPasswordSecond, setNewPasswordSecond] = React.useState('');
  const [errors, setErrors] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showPasswordSecond, setShowPasswordSecond] = React.useState(false);
  const [serviceMessage, setServiceMessage] = React.useState(null);
  const [showPasswordOld, setShowPasswordOld] = React.useState(false);

  const handleClose = React.useCallback(() => setOpen(false), [setOpen]);

  const handleOpen = React.useCallback(() => setOpen(true), [setOpen]);

  const toggleShowPassword = React.useCallback(
    () => setShowPassword(!showPassword),
    [showPassword, setShowPassword]
  );

  const toggleShowPasswordSecond = React.useCallback(
    () => setShowPasswordSecond(!showPasswordSecond),
    [showPasswordSecond, setShowPasswordSecond]
  );

  const handleSave = React.useCallback(async () => {
    if (loading) return;

    setErrors([]);

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

    if (oldPassword === newPassword) {
      newErrors.push('SamePassword');
    }

    if (newPassword !== newPasswordSecond) {
      newErrors.push('PasswordsNotMatch');
    }

    setErrors(newErrors);

    if (newErrors.length) return;

    setLoading(true);

    try {
      const result = await dispatch(changePasswordAction({ oldPassword, newPassword }));

      setLoading(false);

      if (!result.success) {
        setServiceMessage('ChangePasswordFailed');
        return;
      }

      dispatch(addMessage(new Message('ChangePasswordSuccess', 'success')));

      handleClose();
    } catch (error) {
      setLoading(false);
      setServiceMessage(error?.message);
    }
  }, [loading, dispatch, email, oldPassword, newPassword, newPasswordSecond, handleClose]);

  const changePassword = React.useMemo(() => {
    return info?.services?.local?.data?.isChangeRequired;
  }, [info]);

  React.useCallback(() => {
    if (!changePassword) return;
    handleOpen();
  }, [changePassword, handleOpen]);

  if (!changePassword) return null;

  return (
    <>
      {opener ? opener(handleOpen) : null}
      <Dialog
        open={open || changePassword}
        fullWidth={true}
        maxWidth={'sm'}
        scroll={'body'}
        onClose={opener ? handleClose : null}
      >
        <DialogTitle>{t('ChangePassword')}</DialogTitle>
        <DialogContent classes={{ root: classes.content }}>
          <DialogContentText>
            <StringElement
              description={t('Email')}
              required={true}
              fullWidth={true}
              variant={'outlined'}
              value={email}
              readOnly={true}
              error={errors.includes('email') ? { message: t('RequiredField') } : null}
              onChange={setEmail}
            />

            <StringElement
              description={t('OldPassword')}
              required={true}
              fullWidth={true}
              variant={'outlined'}
              value={oldPassword}
              error={errors.includes('oldPassword') ? { message: t('RequiredField') } : null}
              onChange={setOldPassword}
              type={showPasswordOld ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={setShowPasswordOld}>
                      {showPasswordOld ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <StringElement
              description={t('NewPassword')}
              required={true}
              fullWidth={true}
              variant={'outlined'}
              value={newPassword}
              onChange={setNewPassword}
              error={
                errors.includes('newPassword')
                  ? { message: t('RequiredField') }
                  : errors.includes('SamePassword')
                  ? { message: t('SamePassword') }
                  : null
              }
              type={showPassword ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={toggleShowPassword}>
                      {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <StringElement
              description={t('ConfirmPassword')}
              required={true}
              fullWidth={true}
              variant={'outlined'}
              value={newPasswordSecond}
              onChange={setNewPasswordSecond}
              error={
                errors.includes('PasswordsNotMatch')
                  ? { message: t('PasswordsNotMatch') }
                  : errors.includes('newPasswordSecond')
                  ? { message: t('RequiredField') }
                  : null
              }
              type={showPasswordSecond ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={toggleShowPasswordSecond}>
                      {showPasswordSecond ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </DialogContentText>

          {serviceMessage ? (
            <FormControl variant="standard" error={true}>
              <FormHelperText>{t(serviceMessage)}</FormHelperText>
            </FormControl>
          ) : null}

          <ProgressLine loading={loading} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSave} color="primary" variant={'contained'}>
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChangePassword;

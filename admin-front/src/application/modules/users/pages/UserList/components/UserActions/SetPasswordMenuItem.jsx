import React from 'react';
import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  DialogActions,
  InputAdornment,
  DialogTitle,
  Typography
} from '@mui/material';
import PasswordIcon from '@mui/icons-material/Password';
import { setPassword as setPasswordAction } from 'actions/auth';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import StringElement from 'components/JsonSchema/elements/StringElement';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';

const SetPasswordMenuItem = ({ user, onClose }) => {
  const t = useTranslate('UserListPage');
  const dispatch = useDispatch();

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassport] = React.useState(false);
  const [serviceMessage, setServiceMessage] = React.useState('');

  const toggleShowPassword = React.useCallback(() => {
    setShowPassport(!showPassword);
  }, [showPassword]);

  const handleCloseDialog = React.useCallback(() => {
    setOpen(false);
    setPassword('');
    setShowPassport(false);
  }, []);

  const handleOpenDialog = React.useCallback(() => {
    setOpen(true);
    onClose();
  }, []);

  const handleSavePassword = React.useCallback(async () => {
    if (loading) return;

    setLoading(true);

    try {
      await dispatch(
        setPasswordAction(user?.id, {
          password,
        }),
      );

      setLoading(false);

      handleCloseDialog();

      dispatch(addMessage(new Message('handleSavePasswordSuccess', 'success')));
    } catch (error) {
      setLoading(false);
      setServiceMessage(error?.message);
    }
  }, [user, loading, password]);

  return (
    <>
      <MenuItem onClick={handleOpenDialog}>
        <ListItemIcon>
          <PasswordIcon />
        </ListItemIcon>
        <ListItemText primary={t('SetPassword')} />
      </MenuItem>

      <Dialog
        open={open}
        fullWidth={true}
        maxWidth="sm"
        onClose={handleCloseDialog}
      >
        <DialogTitle>{t('SetPassword')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {user?.email}
          </Typography>
          <StringElement
            description={t('Password')}
            required={true}
            fullWidth={true}
            onChange={setPassword}
            value={password}
            darkTheme={true}
            variant={'outlined'}
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleShowPassword}>
                    {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            error={
              (serviceMessage || '').toLowerCase().includes('password')
                ? { message: t(serviceMessage) }
                : null
            }
          />
        </DialogContent>

        <DialogActions>
          <Button
            autoFocus={true}
            onClick={() => setOpen(false)}
            color="primary"
          >
            {t('Cancel')}
          </Button>
          <Button onClick={handleSavePassword} color="primary">
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SetPasswordMenuItem;

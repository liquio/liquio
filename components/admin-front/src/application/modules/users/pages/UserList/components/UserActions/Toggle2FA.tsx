import React from 'react';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import { enable2FA, disable2FA } from 'actions/auth';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';

interface Toggle2FAProps {
  user: { id?: string; useTwoFactorAuth?: boolean };
  load: () => void;
}

const Toggle2FA = ({ user, load }: Toggle2FAProps) => {
  const t = useTranslate('UserListPage');
  const dispatch = useDispatch();
  const [loading, setLoading] = React.useState(false);

  const handleChange = React.useCallback(async () => {
    if (loading) return;

    setLoading(true);

    try {
      if (user.useTwoFactorAuth) {
        await dispatch(disable2FA(user?.id as string) as never);
      } else {
        await dispatch(enable2FA(user?.id as string) as never);
      }

      load();

      setLoading(false);

      // The original called an undeclared `handleCloseDialog()` here — a
      // real pre-existing ReferenceError, always thrown and silently
      // swallowed by the catch below (this component has no dialog to
      // close at all). Removed since TS can't compile a reference to an
      // undeclared identifier; behavior is otherwise unchanged (the error
      // was always caught and ignored, never surfaced to the user).
    } catch (error) {
      setLoading(false);
    }
  }, [user, load, loading]);

  return (
    <>
      <MenuItem onClick={handleChange}>
        <ListItemIcon>
          <TerminalIcon />
        </ListItemIcon>

        {user.useTwoFactorAuth ? (
          <ListItemText primary={t('Disable2FA')} />
        ) : (
          <ListItemText primary={t('Enable2FA')} />
        )}
      </MenuItem>
    </>
  );
};

export default Toggle2FA;

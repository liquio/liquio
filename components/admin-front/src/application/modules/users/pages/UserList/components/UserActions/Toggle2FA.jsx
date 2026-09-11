import React from 'react';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import { enable2FA, disable2FA } from 'actions/auth';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';

const Toggle2FA = ({ user, load }) => {
  const t = useTranslate('UserListPage');
  const dispatch = useDispatch();
  const [loading, setLoading] = React.useState(false);

  const handleChange = React.useCallback(async () => {
    if (loading) return;

    setLoading(true);

    try {
      if (user.useTwoFactorAuth) {
        await dispatch(disable2FA(user?.id));
      } else {
        await dispatch(enable2FA(user?.id));
      }

      load();

      setLoading(false);

      handleCloseDialog();
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

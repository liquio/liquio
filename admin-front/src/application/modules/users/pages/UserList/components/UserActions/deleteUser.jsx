import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ErrorScreen from 'components/ErrorScreen';
import StringElement from 'components/JsonSchema/elements/StringElement';
import ConfirmDialog from 'components/ConfirmDialog';
import { deleteUser } from 'actions/users';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import checkAccess from 'helpers/checkAccess';

const UserCertMenuItem = ({
  t,
  actions,
  user: { ipn, id },
  onClose,
  userUnits,
  userInfo,
  onChange,
}) => {
  const [open, setOpen] = React.useState(false);
  const [triggered, setTrigerred] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [userRnokpp, setUserRnokpp] = React.useState('');

  const handleDelete = async () => {
    if (!userRnokpp) {
      setTrigerred({
        message: t('EmptyRnokpp'),
      });
      return;
    }

    if (ipn !== userRnokpp) {
      setTrigerred({
        message: t('DismatchRnokpp'),
      });
      return;
    }

    setTrigerred(false);
    setLoading(true);

    const result = await actions.deleteUser({
      id,
      body: { ipn },
    });

    if (result instanceof Error) {
      setError(result);
      setLoading(false);
      return;
    }

    actions.addMessage(new Message('DeletingUserSuccess', 'success'));
    setLoading(false);
    setOpen(false);
    onChange();
  };

  const hasAccess = checkAccess(
    { userHasUnit: [1000001] },
    userInfo,
    userUnits,
  );

  if (!hasAccess) return null;

  return (
    <>
      <MenuItem
        onClick={() => {
          setOpen(true);
          onClose();
        }}
      >
        <ListItemIcon>
          <DeleteOutlineIcon />
        </ListItemIcon>
        <ListItemText primary={t('DeleteUser')} />
      </MenuItem>

      <ConfirmDialog
        open={open}
        loading={loading}
        darkTheme={true}
        title={t('DeleteUserPrompt')}
        description={t('DeleteUserPromtDescription')}
        handleClose={() => setOpen(false)}
        handleConfirm={handleDelete}
      >
        {error ? <ErrorScreen darkTheme={true} error={error} /> : null}

        <StringElement
          description={t('rnokpp')}
          required={true}
          fullWidth={true}
          onChange={setUserRnokpp}
          disabled={loading}
          value={userRnokpp}
          error={triggered}
        />
      </ConfirmDialog>
    </>
  );
};

const mapStateToProps = ({ auth: { info: userInfo, userUnits } }) => ({
  userInfo,
  userUnits,
});

const mapDispatch = (dispatch) => ({
  actions: {
    deleteUser: bindActionCreators(deleteUser, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const translated = translate('UserListPage')(UserCertMenuItem);
export default connect(mapStateToProps, mapDispatch)(translated);

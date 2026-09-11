import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import objectPath from 'object-path';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import * as api from 'services/api';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';

const ReIndexMenuItem = ({
  t,
  icon,
  listenStatus = () => {},
  registerKey,
  actions,
  onClose,
  label,
  action,
}) => {
  const interval = React.useRef(null);

  const listenStatusChange = React.useCallback(
    (isAdding) => {
      if (listenStatus) {
        listenStatus(registerKey.id);

        interval.current = setInterval(async () => {
          const result = await listenStatus(registerKey.id);

          const item = (result || [])[0] || {};

          if (item.elasticStatus === 'error'){
            clearInterval(interval.current);
            interval.current = null;
            return actions.addMessage(
              new Message(label + 'Failed', 'error', null, registerKey),
            );
          }

          if (item.elasticStatus !== 'in_progress') {
            clearInterval(interval.current);
            interval.current = null;
            if (isAdding) {
              actions.addMessage(
                new Message(label + 'Success', 'success', null, registerKey),
              );
            }
          }
        }, 10000);
      }
    },
    [listenStatus, registerKey, actions, label],
  );

  return (
    <MenuItem
      onClick={async () => {
        onClose();
        try {
          const afterHandlers =
            objectPath.get(registerKey, 'meta.afterhandlers') || [];

          switch (action) {
            case 'addToElastic':
              const addAfterHandlers = afterHandlers.concat('elastic');
              objectPath.set(
                registerKey,
                'meta.afterhandlers',
                addAfterHandlers,
              );
              await actions.addToElastic(registerKey.id, registerKey);
              listenStatusChange(true);
              break;
            case 'deleteFromElastic':
              const filterAfterHandlers = afterHandlers.filter(
                (handler) => handler !== 'elastic',
              );
              objectPath.set(
                registerKey,
                'meta.afterhandlers',
                filterAfterHandlers,
              );
              await actions.deleteFromElastic(registerKey.id, registerKey);
              listenStatus(registerKey.id);
              actions.addMessage(
                new Message(label + 'Success', 'success', null, registerKey),
              );
              break;
            case 'reIndex':
              await actions.reIndex(registerKey.id);
              listenStatusChange();
              break;
            default:
              break;
          }
        } catch (e) {
          actions.addMessage(
            new Message(label + 'Failed', 'error', null, registerKey),
          );
        }
      }}
    >
      <ListItemIcon>
        <img src={icon} alt={t(label)} />
      </ListItemIcon>
      <ListItemText primary={t(label)} />
    </MenuItem>
  );
};

const mapDispatch = (dispatch, { getUrl }) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    addToElastic: (keyId, body) =>
      api.put(
        getUrl(keyId),
        body,
        'REGISTER_KEY_AFTERHANDLERS_ADD_TO_ELASTIC',
        dispatch,
      ),
    deleteFromElastic: (keyId, body) =>
      api.put(
        getUrl(keyId),
        body,
        'REGISTER_KEY_AFTERHANDLERS_DELETE_FROM_ELASTIC',
        dispatch,
      ),
    reIndex: (keyId) =>
      api.post(
        getUrl(keyId),
        {},
        'REGISTER_KEY_AFTERHANDLERS_REINDEX',
        dispatch,
      ),
  },
});

const translated = translate('RegistryListAdminPage')(ReIndexMenuItem);
export default connect(null, mapDispatch)(translated);

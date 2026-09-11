import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import objectPath from 'object-path';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import * as api from 'services/api';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';

interface RegisterKeyItem {
  id: string;
  meta?: { afterhandlers?: string[] };
  [key: string]: unknown;
}

interface ReIndexMenuItemProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  icon: string;
  listenStatus?: (id: string) => Promise<unknown[]> | void;
  registerKey: RegisterKeyItem;
  actions: {
    addMessage: (message: unknown) => void;
    addToElastic: (keyId: string, body: unknown) => Promise<unknown>;
    deleteFromElastic: (keyId: string, body: unknown) => Promise<unknown>;
    reIndex: (keyId: string) => Promise<unknown>;
  };
  onClose: () => void;
  label: string;
  action?: string;
}

const ReIndexMenuItem = ({
  t,
  icon,
  listenStatus = () => {},
  registerKey,
  actions,
  onClose,
  label,
  action,
}: ReIndexMenuItemProps) => {
  const interval = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const listenStatusChange = React.useCallback(
    (isAdding?: boolean) => {
      if (listenStatus) {
        listenStatus(registerKey.id);

        interval.current = setInterval(async () => {
          const result = await listenStatus(registerKey.id);

          const item = ((result as unknown[]) || [])[0] as { elasticStatus?: string } || {};

          if (item.elasticStatus === 'error') {
            clearInterval(interval.current as ReturnType<typeof setInterval>);
            interval.current = null;
            return actions.addMessage(
              new Message(label + 'Failed', 'error', undefined, registerKey as never),
            );
          }

          if (item.elasticStatus !== 'in_progress') {
            clearInterval(interval.current as ReturnType<typeof setInterval>);
            interval.current = null;
            if (isAdding) {
              actions.addMessage(
                new Message(label + 'Success', 'success', undefined, registerKey as never),
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
            (objectPath.get(registerKey, 'meta.afterhandlers') as string[]) || [];

          switch (action) {
            case 'addToElastic': {
              const addAfterHandlers = afterHandlers.concat('elastic');
              objectPath.set(
                registerKey,
                'meta.afterhandlers',
                addAfterHandlers,
              );
              await actions.addToElastic(registerKey.id, registerKey);
              listenStatusChange(true);
              break;
            }
            case 'deleteFromElastic': {
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
                new Message(label + 'Success', 'success', undefined, registerKey as never),
              );
              break;
            }
            case 'reIndex': {
              await actions.reIndex(registerKey.id);
              listenStatusChange();
              break;
            }
            default: {
              break;
            }
          }
        } catch (e) {
          actions.addMessage(
            new Message(label + 'Failed', 'error', undefined, registerKey as never),
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

interface MapDispatchOwnProps {
  getUrl: (keyId: string) => string;
}

const mapDispatch = (dispatch: Dispatch, { getUrl }: MapDispatchOwnProps) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    addToElastic: (keyId: string, body: unknown) =>
      api.put(
        getUrl(keyId),
        body,
        'REGISTER_KEY_AFTERHANDLERS_ADD_TO_ELASTIC',
        dispatch as never,
      ),
    deleteFromElastic: (keyId: string, body: unknown) =>
      api.put(
        getUrl(keyId),
        body,
        'REGISTER_KEY_AFTERHANDLERS_DELETE_FROM_ELASTIC',
        dispatch as never,
      ),
    reIndex: (keyId: string) =>
      api.post(
        getUrl(keyId),
        {},
        'REGISTER_KEY_AFTERHANDLERS_REINDEX',
        dispatch as never,
      ),
  },
});

const translated = translate('RegistryListAdminPage')(ReIndexMenuItem as never);
export default connect(null, mapDispatch as never)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

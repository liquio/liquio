import React from 'react';
import moment from 'moment';
import KeyActionsRaw from '../components/KeyActions';

const KeyActions = KeyActionsRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  value: {
    lineHeight: '17px',
    margin: '0 0 6px 0',
    whiteSpace: 'nowrap' as const,
    paddingRight: '50px',
  },
  subtext: {
    fontSize: '12px',
    lineHeight: '15px',
    opacity: '.7',
    margin: 0,
  },
  date: {
    minWidth: '200px',
  },
};

interface KeyItem {
  id: string;
  description?: string;
  meta?: { createdByPerson?: { name?: string }; updatedByPerson?: { name?: string } };
  [key: string]: unknown;
}

interface DataTableSettingsParams {
  t: (key: string, params?: Record<string, unknown>) => string;
  registerId?: string;
  actions?: Record<string, unknown>;
  readOnly?: boolean;
  userUnits?: unknown[];
}

export default ({ t, registerId, actions, readOnly, userUnits }: DataTableSettingsParams) => {
  return {
    controls: {
      pagination: true,
      toolbar: true,
      search: false,
      header: true,
      refresh: true,
      customizateColumns: true,
      bottomPagination: true,
    },
    checkable: false,
    darkTheme: true,
    columns: [
      {
        id: 'name',
        align: 'left',
        sortable: false,
        name: t('KeyName'),
        render: (value: string, key: KeyItem) => {
          return (
            <div>
              <p style={styles.value}>{`${
                key?.description ? value + '. ' + key?.description : value
              }`}</p>
              <p style={styles.subtext}>{key.id}</p>
            </div>
          );
        },
      },
      {
        id: 'createdAt',
        align: 'left',
        sortable: false,
        name: t('Created'),
        padding: 'checkbox',
        render: (value: string, key: KeyItem) => {
          return (
            <div>
              <p style={styles.value}>{key?.meta?.createdByPerson?.name}</p>
              <p style={styles.subtext}>
                {moment(value).format('DD.MM.YYYY HH:mm')},{' '}
                {moment(value).fromNow()}
              </p>
            </div>
          );
        },
      },
      {
        id: 'updatedAt',
        align: 'left',
        sortable: false,
        padding: 'checkbox',
        name: t('Updated'),
        render: (value: string, key: KeyItem) => {
          return (
            <div>
              <p style={styles.value}>{key?.meta?.updatedByPerson?.name}</p>
              <p style={styles.subtext}>
                {moment(value).format('DD.MM.YYYY HH:mm')},{' '}
                {moment(value).fromNow()}
              </p>
            </div>
          );
        },
      },
      {
        id: 'actions',
        align: 'right',
        sortable: false,
        padding: 'checkbox',
        hiddable: false,
        disableClick: true,
        render: (_: unknown, key: KeyItem) => (
          <KeyActions
            registerKey={key}
            registerId={registerId}
            actions={actions}
            readOnly={readOnly}
            userUnits={userUnits}
          />
        ),
      },
    ].filter(Boolean),
  };
};

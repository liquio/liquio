import React from 'react';
import moment from 'moment';
import KeyActions from '../components/KeyActions';
import SyncStatus from '../components/SyncStatusColumn';

const styles = {
  value: {
    lineHeight: '17px',
    margin: '0 0 6px 0',
    whiteSpace: 'nowrap',
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

export default ({ t, registerId, actions, readOnly, userUnits }) => {
  const elasticAdmin = userUnits.find(({ id }) => id === 1000012);

  const syncStatusColumn = elasticAdmin
    ? {
        id: 'sync',
        align: 'left',
        sortable: false,
        name: t('Synchronization'),
        width: 200,
        disableTooltip: true,
        disableClick: true,
        render: (value, row) => <SyncStatus t={t} value={value} row={row} />,
      }
    : null;

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
        render: (value, key) => {
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
        render: (value, key) => {
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
        render: (value, key) => {
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
      syncStatusColumn,
      {
        id: 'actions',
        align: 'right',
        sortable: false,
        padding: 'checkbox',
        hiddable: false,
        disableClick: true,
        render: (_, key) => (
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

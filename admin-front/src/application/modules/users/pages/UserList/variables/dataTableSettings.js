import React from 'react';
import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import { Chip } from '@mui/material';
import UserActions from '../components/UserActions';
import moment from 'moment';

const styles = {
  value: {
    lineHeight: '17px',
    margin: '0 0 6px 0',
  },
  subtext: {
    fontSize: '12px',
    lineHeight: '15px',
    opacity: '.7',
    margin: 0,
  },
  date: {
    whiteSpace: 'nowrap',
  },
};

export default ({ t, actions, darkTheme, readOnly }) => ({
  controls: {
    pagination: true,
    toolbar: true,
    search: true,
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
      name: t('UserListName'),
      render: (value, user) => {
        return (
          <div>
            <p style={styles.value}>
              {user.last_name} {user.first_name} {user.middle_name}
            </p>
            <p style={styles.subtext}>{user.id}</p>
          </div>
        );
      },
    },
    {
      id: 'ipn',
      align: 'left',
      sortable: false,
      name: t('rnokpp'),
    },
    {
      id: 'phone',
      align: 'left',
      sortable: false,
      name: t('Phone'),
    },
    {
      id: 'email',
      align: 'left',
      sortable: false,
      name: t('Email'),
    },
    {
      id: 'createdAt',
      align: 'left',
      sortable: false,
      name: t('CreatedAt'),
      render: (value) => {
        return (
          <div style={styles.date}>
            <p style={styles.value}>
              {' '}
              {moment(value).format('DD.MM.YYYY HH:mm')}
            </p>
            <p style={styles.subtext}>{moment(value).fromNow()}</p>
          </div>
        );
      },
    },
    {
      id: 'status',
      align: 'left',
      sortable: false,
      name: t('Status'),
      hiddable: false,
      render: (value, { role, isActive }) => {
        const chips = [];
        const roles = role.split(';');

        if (!isActive) {
          return (
            <>
              <Chip label={t('Blocked')} />
            </>
          );
        }

        roles.forEach((roleName, index) => {
          if (roleName.indexOf('admin') === 0) {
            const clientId = roleName.split('-').slice(1).join('-');
            chips.push(
              <>
                <Chip
                  style={{
                    marginTop: index > 1 ? 5 : 0,
                    background: '#121212',
                  }}
                  label={[t('Administrator'), clientId]
                    .filter(Boolean)
                    .join(' ')}
                />
              </>,
            );
          }
        });

        return chips;
      },
    },
    {
      id: 'actions',
      name: t('Actions'),
      align: 'left',
      sortable: false,
      padding: 'checkbox',
      hiddable: false,
      render: (value, user) => (
        <UserActions user={user} actions={actions} readOnly={readOnly} />
      ),
    },
  ],
  filterHandlers: {
    id: (props) => (
      <StringFilterHandler
        name={t('UserId')}
        label={t('UserId')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    role: (props) => (
      <StringFilterHandler
        name={t('OnlyAdministrator')}
        label={t('OnlyAdministrator')}
        filterValue="admin"
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    ipn: (props) => (
      <StringFilterHandler
        name={t('IPN')}
        label={t('IPN')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    email: (props) => (
      <StringFilterHandler
        name={t('Email')}
        label={t('Email')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    phone: (props) => (
      <StringFilterHandler
        name={t('Phone')}
        label={t('Phone')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
  },
});

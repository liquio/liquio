import React from 'react';
import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import { Chip } from '@mui/material';
import UserActionsRaw from '../components/UserActions';
import moment from 'moment';

const UserActions = UserActionsRaw as unknown as React.ComponentType<Record<string, unknown>>;

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
    whiteSpace: 'nowrap' as const,
  },
};

interface User {
  id: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  role: string;
  isActive?: boolean;
  [key: string]: unknown;
}

interface DataTableSettingsParams {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions?: Record<string, unknown>;
  darkTheme?: boolean;
  readOnly?: boolean;
}

export default ({ t, actions, darkTheme, readOnly }: DataTableSettingsParams) => ({
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
      render: (value: string, user: User) => {
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
      render: (value: string) => {
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
      render: (value: unknown, { role, isActive }: User) => {
        const chips: React.ReactNode[] = [];
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
      render: (value: unknown, user: User) => (
        <UserActions user={user} actions={actions} t={t} readOnly={readOnly} />
      ),
    },
  ],
  filterHandlers: {
    id: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('UserId')}
        label={t('UserId')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    role: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('OnlyAdministrator')}
        label={t('OnlyAdministrator')}
        filterValue="admin"
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    ipn: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('IPN')}
        label={t('IPN')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    email: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('Email')}
        label={t('Email')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    phone: (props: Record<string, unknown>) => (
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

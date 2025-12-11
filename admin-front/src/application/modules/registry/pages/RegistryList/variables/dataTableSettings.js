import React from 'react';
import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import Favorites from 'application/modules/workflow/pages/WorkflowList/components/Favorites';
import RegisterActions from '../components/RegisterActions';
import moment from 'moment';

const darkTheme = true;

const renderName = (value) =>
  value
    ?.split(/\s+/)
    .map((w, i) => (i ? w.substring(0, 1).toUpperCase() + '.' : w))
    .join(' ');

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

export default ({ t, actions, readOnly }) => ({
  controls: {
    pagination: true,
    toolbar: true,
    search: true,
    header: true,
    refresh: true,
    customizateColumns: true,
    bottomPagination: true,
  },
  searchPlaceholder: t('RegistrySearchPlaceholder'),
  checkable: false,
  darkTheme: darkTheme,
  columns: [
    {
      id: 'favorite',
      disableClick: true,
      render: (value, row) => (
        <Favorites element={row} type={'registers'} name={row?.name} />
      ),
    },
    {
      id: 'name',
      align: 'left',
      sortable: false,
      name: t('RegisterName'),
      render: (value, register) => {
        return (
          <div>
            <p style={styles.value}>{value}</p>
            <p style={styles.subtext}>{register.id}</p>
          </div>
        );
      },
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
      id: 'meta.createdByPerson.name',
      align: 'left',
      sortable: false,
      name: t('CreatedBy'),
      render: renderName,
    },
    {
      id: 'updatedAt',
      align: 'left',
      sortable: false,
      name: t('UpdatedAt'),
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
      id: 'meta.updatedByPerson.name',
      align: 'left',
      sortable: false,
      name: t('UpdatedBy'),
      render: renderName,
    },
    {
      id: 'actions',
      width: 64,
      align: 'left',
      padding: 'checkbox',
      name: t('Actions'),
      disableClick: true,
      disableTooltip: true,
      render: (value, register) => (
        <RegisterActions
          register={register}
          actions={actions}
          readOnly={readOnly}
        />
      ),
    },
  ],
  filterHandlers: {
    id: (props) => (
      <StringFilterHandler
        name={t('RegistryId')}
        label={t('RegistryId')}
        variant="outlined"
        darkTheme={darkTheme}
        {...props}
      />
    ),
    key_id: (props) => (
      <StringFilterHandler
        name={t('RegistryKeyId')}
        label={t('RegistryKeyId')}
        variant="outlined"
        darkTheme={darkTheme}
        {...props}
      />
    ),
  },
});

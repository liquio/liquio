import React from 'react';
import { Link } from 'react-router-dom';
import { Tooltip, IconButton } from '@mui/material';
import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import SelectFilterHandler from 'components/DataTable/components/SelectFilterHandler';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import ListIcon from 'assets/img/fa-solid_clipboard-list.svg';
import FavoritesRaw from 'application/modules/workflow/pages/WorkflowList/components/Favorites';
import moment from 'moment';

const Favorites = FavoritesRaw as unknown as React.ComponentType<Record<string, unknown>>;

const darkTheme = true;

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

interface Unit {
  id: string;
  basedOn: string[];
  [key: string]: unknown;
}

interface DataTableSettingsParams {
  t: (key: string, params?: Record<string, unknown>) => string;
  units?: Unit[];
}

export default ({ t, units }: DataTableSettingsParams) => ({
  controls: {
    pagination: true,
    toolbar: true,
    search: true,
    header: true,
    refresh: true,
    customizateColumns: true,
    bottomPagination: true,
  },
  checkable: true,
  darkTheme: darkTheme,
  columns: [
    {
      id: 'favorite',
      disableClick: true,
      render: (value: unknown, row: Unit) => <Favorites element={row} type={'units'} />,
    },
    {
      id: 'name',
      align: 'left',
      sortable: true,
      name: t('UnitName'),
      render: (value: string, unit: Unit) => {
        return (
          <div>
            <p style={styles.value}>{value}</p>
            <p style={styles.subtext}>{unit.id}</p>
          </div>
        );
      },
    },
    {
      id: 'basedOn',
      align: 'left',
      sortable: 'true',
      name: t('BasedOn'),
      render: (value: string[]) =>
        value.map(
          (id, index) =>
            `${index > 0 ? ', ' : ''}` +
            (units || []).find(({ id: unitId }) => unitId === id)?.name,
        ),
    },
    {
      id: 'createdAt',
      align: 'left',
      sortable: 'true',
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
      id: 'updatedAt',
      align: 'left',
      sortable: 'true',
      name: t('UpdatedAt'),
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
      id: 'actions',
      name: t('Actions'),
      align: 'left',
      padding: 'checkbox',
      disableClick: true,
      render: (value: unknown, unit: Unit) => (
        <Link to={`/users/accessJournal#unitId=${unit.id}`}>
          <Tooltip title={t('Journal')}>
            <IconButton size="large">
              <img src={ListIcon} alt="list icon" />
            </IconButton>
          </Tooltip>
        </Link>
      ),
    },
  ],
  filterHandlers: {
    name: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('name')}
        label={t('name')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    id: (props: Record<string, unknown>) => (
      <StringFilterHandler
        name={t('Id')}
        label={t('Id')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
    based_on: (props: Record<string, unknown>) => (
      <SelectFilterHandler
        name={t('BasedOn')}
        label={t('BasedOn')}
        chipLabel={t('BasedOn')}
        placeholder={t('BasedOn')}
        darkTheme={darkTheme}
        variant="outlined"
        listDisplay={true}
        searchField={true}
        useOwnNames={true}
        options={units || []}
        IconComponent={(props: Record<string, unknown>) => <FontDownloadIcon {...props} />}
        {...props}
      />
    ),
  },
});

import React from 'react';
import { useTranslate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import sortArray from 'sort-array';
import moment from 'moment';

import LeftSidebarLayout from 'layouts/LeftSidebar';
import asModulePage from 'hooks/asModulePage';
import { DataTableStated as DataTableStatedRaw } from 'components/DataTable';
import { addFavorites, deleteFavorites, getFavorites } from 'actions/favorites';
import TimeLabel from 'components/Label/Time';
import DeleteFromFavorites from '../components/DeleteFromFavorites';

interface FavoriteItem {
  entity_id?: string;
  entity_type?: string;
  entity_name?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface Unit {
  id?: number;
  [key: string]: unknown;
}

interface FavoritesListProps {
  title?: string;
  loading?: boolean;
  location?: unknown;
  actions: {
    getFavorites: (params: { entity: string }) => Promise<unknown>;
    deleteFavorites: (params: { id?: string; entity?: string }) => Promise<unknown>;
    addFavorites: (params: Record<string, unknown>) => Promise<unknown>;
  };
  history: { push: (path: string) => void };
  workflowList: FavoriteItem[];
  unitsList: FavoriteItem[];
  registersList: FavoriteItem[];
  userUnits?: Unit[];
}

const FavoritesList = ({
  title,
  loading: loadingOrigin,
  location,
  actions,
  history,
  workflowList,
  unitsList,
  registersList,
  userUnits
}: FavoritesListProps) => {
  // Read at call time rather than module scope: `components/DataTable`'s
  // index.tsx re-exports `DataTableStated` from a file that imports back
  // from the same barrel, so it's circularly self-referencing (see
  // TYPESCRIPT.md's DataTable batch notes) — a module-top-level read can
  // run while that module is still mid-evaluation.
  const DataTableStated = DataTableStatedRaw as unknown as React.ComponentType<Record<string, unknown>>;
  const t = useTranslate('FavoritesPage');
  const [loading, setLoading] = React.useState(loadingOrigin);

  const list = [...workflowList, ...unitsList];

  const isRegisters = userUnits?.some((el) => el?.id === 1000000042 || el?.id === 1000002);

  if (isRegisters) {
    list.push(...registersList);
  }

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      await actions.getFavorites({ entity: 'workflow_templates' });

      await actions.getFavorites({ entity: 'units' });

      await actions.getFavorites({ entity: 'registers' });

      setLoading(false);
    };

    fetchData();
  }, [actions]);

  const load = async () => {
    setLoading(true);

    await actions.getFavorites({ entity: 'workflow_templates' });

    await actions.getFavorites({ entity: 'units' });

    setLoading(false);
  };

  const handleDelete = async ({ entity_id, entity_type }: FavoriteItem) => {
    await actions.deleteFavorites({
      id: entity_id,
      entity: entity_type
    });

    await actions.getFavorites({ entity: entity_type as string });
  };

  const onRowClick = ({ entity_id, entity_type }: FavoriteItem) => {
    switch (entity_type) {
      case 'workflow_templates': {
        history.push(`workflow/${entity_id}`);
        break;
      }
      case 'units': {
        history.push(`users/${entity_type}/${entity_id}`);
        break;
      }
      case 'registers': {
        history.push(`registry/${entity_id}`);
        break;
      }
      default: {
        history.push(`${entity_type}/${entity_id}`);
        break;
      }
    }
  };

  sortArray(list, {
    by: 'trimmed',
    order: 'desc',
    computed: {
      trimmed: (item: FavoriteItem) => moment(item.created_at).valueOf()
    }
  } as never);

  return (
    <LeftSidebarLayout
      location={location}
      title={t(title as string)}
      loading={loading || loadingOrigin}
      flexContent={true}
    >
      <DataTableStated
        data={loading ? [] : list}
        onRowClick={onRowClick}
        updateOnChangeSearch={false}
        actions={{
          load
        }}
        columns={[
          {
            id: 'entity_id',
            name: t('entity_id')
          },
          {
            id: 'entity_type',
            name: t('entity_type')
          },
          {
            id: 'entity_name',
            name: t('entity_name'),
            cellStyle: { maxWidth: 400 }
          },
          {
            id: 'created_at',
            name: t('createdAt'),
            render: (date: string) => <TimeLabel date={date} />
          },
          {
            id: 'actions',
            name: t('actions'),
            disableClick: true,
            render: (value: unknown, row: FavoriteItem) => (
              <DeleteFromFavorites row={row} handleDelete={handleDelete} />
            )
          }
        ]}
        darkTheme={true}
        controls={{
          pagination: true,
          bottomPagination: true,
          toolbar: true,
          search: true,
          header: true,
          refresh: true,
          switchView: false
        }}
      />
    </LeftSidebarLayout>
  );
};

interface ConnectedState {
  favorites: { workflow_templates: FavoriteItem[]; units: FavoriteItem[]; registers: FavoriteItem[] };
  auth: { userUnits: Unit[] };
}

const mapStateToProps = ({
  favorites: { workflow_templates, units, registers },
  auth: { userUnits }
}: ConnectedState) => ({
  workflowList: workflow_templates,
  unitsList: units,
  registersList: registers,
  userUnits
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    deleteFavorites: bindActionCreators(deleteFavorites, dispatch),
    addFavorites: bindActionCreators(addFavorites, dispatch),
    getFavorites: bindActionCreators(getFavorites, dispatch)
  }
});

const connected = connect(mapStateToProps as never, mapDispatchToProps)(FavoritesList as never);
const moduled = asModulePage(connected as never);
export default moduled;

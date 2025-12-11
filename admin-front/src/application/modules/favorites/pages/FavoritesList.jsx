import React from 'react';
import { useTranslate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import sortArray from 'sort-array';
import moment from 'moment';

import LeftSidebarLayout from 'layouts/LeftSidebar';
import asModulePage from 'hooks/asModulePage';
import { DataTableStated } from 'components/DataTable';
import { addFavorites, deleteFavorites, getFavorites } from 'actions/favorites';
import TimeLabel from 'components/Label/Time';
import DeleteFromFavorites from '../components/DeleteFromFavorites';

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
}) => {
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

  const handleDelete = async ({ entity_id, entity_type }) => {
    await actions.deleteFavorites({
      id: entity_id,
      entity: entity_type
    });

    await actions.getFavorites({ entity: entity_type });
  };

  const onRowClick = ({ entity_id, entity_type }) => {
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
      trimmed: (item) => moment(item.created_at).valueOf()
    }
  });

  return (
    <LeftSidebarLayout
      location={location}
      title={t(title)}
      loading={loading || loadingOrigin}
      flexContent={true}
    >
      <DataTableStated
        data={loading ? [] : list}
        onRowClick={onRowClick}
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
            render: (date) => <TimeLabel date={date} />
          },
          {
            id: 'actions',
            name: t('actions'),
            disableClick: true,
            render: (value, row) => <DeleteFromFavorites row={row} handleDelete={handleDelete} />
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

const mapStateToProps = ({
  favorites: { workflow_templates, units, registers },
  auth: { userUnits }
}) => ({
  workflowList: workflow_templates,
  unitsList: units,
  registersList: registers,
  userUnits
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    deleteFavorites: bindActionCreators(deleteFavorites, dispatch),
    addFavorites: bindActionCreators(addFavorites, dispatch),
    getFavorites: bindActionCreators(getFavorites, dispatch)
  }
});

const connected = connect(mapStateToProps, mapDispatchToProps)(FavoritesList);
const moduled = asModulePage(connected);
export default moduled;

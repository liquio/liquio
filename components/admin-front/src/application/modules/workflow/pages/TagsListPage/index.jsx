import React from 'react';
import { translate } from 'react-translate';
import { connect , useDispatch } from 'react-redux';
import dataTableSettings from './variables/dataTableSettings';
import { getTagList } from 'application/actions/tags';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import DataTable from 'components/DataTable';
import useTable from 'services/dataTable/useTable';
import urlHashParams from 'helpers/urlHashParams';
import asModulePage from 'hooks/asModulePage';
import endPoint from 'application/endPoints/tags';
import { searchUsers } from 'actions/users';
import WorkflowTagsTableToolbar from './components/WorkflowTagsTableToolbar';

const TagsListPage = ({
  t,
  location,
  title,
  userInfo,
  userUnits
}) => {
  const [rowsSelected, onRowsSelect] = React.useState([]);
  const [workflowTags, setWorkflowTags] = React.useState([]);
  const [workflowTagsAll, setWorkflowTagsAll] = React.useState([]);
  const [selectedRow, setSelectedRow] = React.useState(null)

  const dispatch = useDispatch();

  const tableData = useTable(
    { ...endPoint, autoLoad: true },
    { filters: urlHashParams() },
  );

  const { data, filters: { search } } = tableData;

  React.useEffect(() => {
    const fetchData = async () => {
      if (!data) return;
      let result = data;

      const updatedByUser = result
        .filter(({ updatedBy }) => updatedBy !== 'system')
        .map(({ updatedBy }) => updatedBy);

      if (updatedByUser.length) {
        const users = await searchUsers({ ids: updatedByUser },)(dispatch);

        result = result.map((tag) => {
          const user = users.find(({ id }) => id === tag.updatedBy);
          return {
            ...tag,
            updatedBy: user?.name || tag.updatedBy,
          };
        });

        setWorkflowTags(result);
      }
    };

    fetchData();
  }, [dispatch, data]);

  React.useEffect(() => {
    const fetchData = async () => {
      let result = await getTagList('short=true')(dispatch);

      if (result instanceof Error) return;

      setWorkflowTagsAll(result);

    };
    fetchData();
  }, [dispatch]);
  return (
    <LeftSidebarLayout
      location={location}
      title={t(title)}
      loading={tableData.loading}
    >
      <DataTable
        {...dataTableSettings({
          t,
          userInfo,
          userUnits,
          search,
          workflowTagsAll,
          actions: {
            ...tableData.actions,
            onRowsSelect,
          },
        })}
        {...tableData}
        rowsSelected={rowsSelected}
        actions={{
          ...tableData.actions,
          onRowsSelect,
        }}
        data={workflowTags}
        onRowClick={(row) => setSelectedRow(row)}
        CustomToolbar={() => (
          <WorkflowTagsTableToolbar
            actions={tableData.actions}
            path={location.pathname}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            setWorkflowTags={setWorkflowTags}
          />
        )}
      />
    </LeftSidebarLayout>
  );
};

const mapState = ({ auth: { info, userUnits } }) => ({
  userInfo: info,
  userUnits,
});

const modulePage = asModulePage(TagsListPage);

const connected = connect(mapState)(modulePage);

export default translate('TagsListPage')(connected);

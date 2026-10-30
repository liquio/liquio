import React from 'react';
import { translate } from 'react-translate';
import { connect, useDispatch } from 'react-redux';
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

interface WorkflowTag {
  id?: string | number;
  name?: string;
  color?: string;
  updatedBy?: string;
  [key: string]: unknown;
}

interface UserRecord {
  id?: string | number;
  name?: string;
  [key: string]: unknown;
}

interface TagsListPageProps {
  t: (key: string) => string;
  location: { pathname: string };
  title?: string;
  userInfo: Record<string, unknown>;
  userUnits: unknown[];
}

const TagsListPage = ({
  t,
  location,
  title,
  userInfo,
  userUnits
}: TagsListPageProps) => {
  const [rowsSelected, onRowsSelect] = React.useState<unknown[]>([]);
  const [workflowTags, setWorkflowTags] = React.useState<WorkflowTag[]>([]);
  const [workflowTagsAll, setWorkflowTagsAll] = React.useState<WorkflowTag[]>([]);
  const [selectedRow, setSelectedRow] = React.useState<WorkflowTag | null>(null)

  const dispatch = useDispatch();

  const tableData = useTable(
    { ...endPoint, autoLoad: true },
    { filters: urlHashParams() },
  );

  const { data, filters: { search } } = tableData as { data: WorkflowTag[]; filters: { search?: string } };

  React.useEffect(() => {
    const fetchData = async () => {
      if (!data) return;
      let result = data;

      const updatedByUser = result
        .filter(({ updatedBy }) => updatedBy !== 'system')
        .map(({ updatedBy }) => updatedBy);

      if (updatedByUser.length) {
        const users = (await searchUsers({ ids: updatedByUser })(dispatch as never)) as UserRecord[];

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
      const result = await getTagList('short=true')(dispatch as never);

      if (result instanceof Error) return;

      setWorkflowTagsAll(result as WorkflowTag[]);

    };
    fetchData();
  }, [dispatch]);
  return (
    <LeftSidebarLayout
      location={location}
      title={t(title as string)}
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
        } as never)}
        {...tableData}
        rowsSelected={rowsSelected}
        actions={{
          ...tableData.actions,
          onRowsSelect,
        }}
        data={workflowTags}
        onRowClick={(row: WorkflowTag) => setSelectedRow(row)}
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

const mapState = ({ auth: { info, userUnits } }: { auth: { info: Record<string, unknown>; userUnits: unknown[] } }) => ({
  userInfo: info,
  userUnits,
});

const modulePage = asModulePage(TagsListPage as never);

const connected = connect(mapState)(modulePage);

export default translate('TagsListPage')(connected as never);

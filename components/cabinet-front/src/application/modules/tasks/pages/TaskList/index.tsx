import React from 'react';
import { connect } from 'react-redux';
import { useTranslate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';

import asModulePage from 'hooks/asModulePage';
import { loadDocumentTemplates } from 'application/actions/documentTemplate';
import TaskListLayoutRaw from 'modules/tasks/pages/TaskList/components/TaskListLayout';
import processList from 'services/processList';
import unitProps from 'helpers/unitProps';
import checkAccess from 'helpers/checkAccess';
import useTable from 'services/dataTable/useTable';
import type { DataTableEndpoint } from 'services/dataTable/types';

const TaskListLayout = TaskListLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface Unit {
  id: number;
  [key: string]: unknown;
}

interface HiddenColumns {
  notUnitedUser: string[];
  isUnitedUser: unknown;
}

interface TaskListPageProps {
  userInfo: Record<string, unknown>;
  hiddenColumns: HiddenColumns;
  userUnits: Unit[];
  path: string;
  history: { push: (url: string) => void };
  actionsProps: { loadDocumentTemplates: () => Promise<unknown> };
  title: string;
  templates: unknown[] | null;
  endPoint: DataTableEndpoint;
  location: unknown;
  defaultFilters?: Record<string, unknown>;
}

const TaskListPageHook = (props: TaskListPageProps) => {
  const {
    userInfo,
    hiddenColumns,
    userUnits,
    path,
    history,
    actionsProps,
    title,
    templates,
    endPoint,
    location,
    defaultFilters
  } = props;
  const t = useTranslate('TaskListPage');

  const getHiddenColumns = React.useCallback(() => {
    if (checkAccess({ isUnitedUser: false }, userInfo, userUnits as never)) {
      return hiddenColumns.notUnitedUser;
    }

    const hiddenColumnProps = unitProps(hiddenColumns.isUnitedUser as never, userUnits as never).filter(Boolean);
    const allHiddenColumns = ([] as unknown[]).concat(...(hiddenColumnProps as unknown[][]));
    return allHiddenColumns.filter(
      (column) => allHiddenColumns.map((col) => column === col).length === 1
    );
  }, [hiddenColumns, userUnits, userInfo]);

  const tableProps = useTable(endPoint, {
    filters: defaultFilters,
    hiddenColumns: getHiddenColumns()
  } as never) as { data: { id: string | number }[]; loading: boolean; [key: string]: unknown };

  const { data, loading } = tableProps;

  const handleItemClick = React.useCallback(
    (task: { id: string | number }) => {
      history.push(`${path}/${task.id}`);
    },
    [path, history]
  );

  React.useEffect(() => {
    if (path === '/tasks') {
      history.push('/tasks/my-tasks');
    }
  }, [path, history]);

  React.useEffect(() => {
    if (templates === null) {
      processList.hasOrSet('loadDocumentTemplates', actionsProps.loadDocumentTemplates);
    }
  }, [templates, actionsProps]);

  return (
    <TaskListLayout
      location={location}
      title={t(title)}
      loading={loading}
      templates={templates}
      endPoint={endPoint}
      data={data}
      handleItemClick={handleItemClick}
      path={path}
      tableProps={tableProps}
    />
  );
};

const asModule = asModulePage(TaskListPageHook as never);

interface ConnectedState {
  auth: { userUnits: Unit[]; info: Record<string, unknown> };
  documentTemplate: { list: unknown[] };
  [key: string]: unknown;
}

const mapStateToProps = (state: ConnectedState, { endPoint }: { endPoint: DataTableEndpoint }) => {
  const {
    auth: { userUnits, info },
    documentTemplate,
    [endPoint.sourceName]: { loading, data, error }
  } = state as ConnectedState & { [key: string]: { loading: unknown; data: unknown; error: unknown } };

  return {
    userUnits,
    userInfo: info,
    loading,
    data,
    error,
    templates: documentTemplate.list
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actionsProps: {
    loadDocumentTemplates: bindActionCreators(loadDocumentTemplates, dispatch)
  }
});

export default connect(mapStateToProps as never, mapDispatchToProps)(asModule as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

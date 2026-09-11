import React from 'react';
import { connect } from 'react-redux';
import { useTranslate } from 'react-translate';
import { bindActionCreators } from 'redux';

import asModulePage from 'hooks/asModulePage';
import { loadDocumentTemplates } from 'application/actions/documentTemplate';
import TaskListLayout from 'modules/tasks/pages/TaskList/components/TaskListLayout';
import processList from 'services/processList';
import unitProps from 'helpers/unitProps';
import checkAccess from 'helpers/checkAccess';
import useTable from 'services/dataTable/useTable';

const TaskListPageHook = (props) => {
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
    if (checkAccess({ isUnitedUser: false }, userInfo, userUnits)) {
      return hiddenColumns.notUnitedUser;
    }

    const hiddenColumnProps = unitProps(hiddenColumns.isUnitedUser, userUnits).filter(Boolean);
    const allHiddenColumns = [].concat(...hiddenColumnProps);
    return allHiddenColumns.filter(
      (column) => allHiddenColumns.map((col) => column === col).length === 1
    );
  }, [hiddenColumns, userUnits, userInfo]);

  const tableProps = useTable(endPoint, {
    filters: defaultFilters,
    hiddenColumns: getHiddenColumns()
  });

  const { data, loading } = tableProps;

  const handleItemClick = React.useCallback(
    (task) => {
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

const asModule = asModulePage(TaskListPageHook);

const mapStateToProps = (state, { endPoint }) => {
  const {
    auth: { userUnits, info },
    documentTemplate,
    [endPoint.sourceName]: { loading, data, error }
  } = state;

  return {
    userUnits,
    userInfo: info,
    loading,
    data,
    error,
    templates: documentTemplate.list
  };
};

const mapDispatchToProps = (dispatch) => ({
  actionsProps: {
    loadDocumentTemplates: bindActionCreators(loadDocumentTemplates, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(asModule);

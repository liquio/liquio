import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { translate } from 'react-translate';

import ModulePage from 'components/ModulePage';
import {
  load,
  onFilterChange,
  onColumnSortChange,
  setHiddenColumns
} from 'services/dataTable/actions';
import { loadWorkflowTemplates } from 'application/actions/workflow';
import processList from 'services/processList';
import unitProps from 'helpers/unitProps';
import checkAccess from 'helpers/checkAccess';
import WorkflowListLayoutRaw from 'modules/workflow/pages/WorkflowList/components/WorkflowListLayout';
import type { DataTableEndpoint } from 'services/dataTable/types';

const WorkflowListLayout = WorkflowListLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface HiddenColumnsConfig {
  notUnitedUser: string[];
  isUnitedUser: string;
}

interface WorkflowListPageProps {
  t: (key: string) => string;
  title: string;
  error?: unknown;
  loading?: boolean;
  location: unknown;
  templates: unknown[] | null;
  defaultFilters?: { is_draft?: boolean; tasks?: { deleted?: boolean }; [key: string]: unknown };
  defaultSort?: { columnName: string; direction: string };
  TableToolbar?: React.ComponentType<Record<string, unknown>>;
  endPoint: DataTableEndpoint;
  data?: unknown;
  hiddenColumns: HiddenColumnsConfig;
  userInfo: Record<string, unknown>;
  userUnits: unknown[];
  history: { push: (url: string) => void };
  actions: {
    load: () => void;
    onFilterChange: (filters: Record<string, unknown>, forceLoad?: boolean) => void;
    onColumnSortChange: (columnName: string, direction: string, forceLoad?: boolean) => void;
    setHiddenColumns: (columns: string[]) => void;
    loadWorkflowTemplates: () => void;
  };
}

class WorkflowListPage extends ModulePage<WorkflowListPageProps> {
  componentDidMount() {
    super.componentDidMount();
    processList.set('workflowListInit', () => this.init(true));
  }

  init = (refresh?: boolean) => {
    const { data, error, actions, defaultFilters, defaultSort, templates } = this.props;

    if ((data || error) && !refresh) {
      return;
    }

    if (templates === null && !processList.has('loadWorkflowTemplates')) {
      processList.set('loadWorkflowTemplates', actions.loadWorkflowTemplates);
    }

    if (defaultFilters) {
      actions.onFilterChange(defaultFilters, false);
    }

    if (defaultSort) {
      actions.onColumnSortChange(defaultSort.columnName, defaultSort.direction, false);
    }

    actions.setHiddenColumns(this.getHiddenColumns());
    actions.load();
  };

  getHiddenColumns = (): string[] => {
    const { hiddenColumns, userInfo, userUnits } = this.props;

    if (checkAccess({ isUnitedUser: false }, userInfo, userUnits as never)) {
      return hiddenColumns ? hiddenColumns.notUnitedUser : [];
    }

    const hiddenColumnProps = unitProps(hiddenColumns.isUnitedUser, userUnits as never).filter(Boolean);
    const allHiddenColumns = ([] as string[]).concat(...(hiddenColumnProps as string[][]));
    return allHiddenColumns.filter(
      (column) => allHiddenColumns.map((col) => column === col).length === 1
    );
  };

  handleItemClick = ({ row: { id, entryTaskId, entryTaskFinishedAt } }: { row: { id: string | number; entryTaskId?: string | number; entryTaskFinishedAt?: string } }) => {
    const { history } = this.props;
    if (!entryTaskFinishedAt) {
      return history.push(`/tasks/${entryTaskId}`);
    }
    return history.push(`/workflow/${id}`);
  };

  render() {
    const {
      t,
      title,
      error,
      loading,
      location,
      templates,
      defaultFilters,
      TableToolbar,
      endPoint
    } = this.props;

    const { is_draft: isDraft, tasks } = defaultFilters || {};
    const { deleted: isTrash } = tasks || {};
    const checkable = isDraft || isTrash;

    return (
      <WorkflowListLayout
        location={location}
        title={t(title)}
        error={error}
        loading={loading}
        templates={templates}
        endPoint={endPoint}
        TableToolbar={TableToolbar}
        checkable={checkable}
        handleItemClick={this.handleItemClick}
      />
    );
  }
}

const translated = translate('WorkflowListPage')(WorkflowListPage as never);

interface WorkflowListState {
  workflowTemplate: { list: unknown[] | null };
  auth: { info: Record<string, unknown>; userUnits: unknown[] };
  [key: string]: unknown;
}

const mapStateToProps = (state: WorkflowListState, { endPoint }: { endPoint: DataTableEndpoint }) => {
  const { workflowTemplate, auth } = state;
  const { info, userUnits } = auth;
  const { loading, data, error } = state[endPoint.sourceName] as {
    loading?: boolean;
    data?: unknown;
    error?: unknown;
  };

  return {
    data,
    error,
    loading,
    userUnits,
    userInfo: info,
    templates: workflowTemplate.list
  };
};

const mapDispatchToProps = (dispatch: Dispatch, { endPoint }: { endPoint: DataTableEndpoint }) => ({
  actions: {
    load: bindActionCreators(load(endPoint), dispatch),
    onFilterChange: bindActionCreators(onFilterChange(endPoint), dispatch),
    setHiddenColumns: bindActionCreators(setHiddenColumns(endPoint), dispatch),
    onColumnSortChange: bindActionCreators(onColumnSortChange(endPoint), dispatch),
    loadWorkflowTemplates: bindActionCreators(loadWorkflowTemplates, dispatch)
  }
});

export default connect(mapStateToProps as never, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;

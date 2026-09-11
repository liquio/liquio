import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
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
import WorkflowListLayout from 'modules/workflow/pages/WorkflowList/components/WorkflowListLayout';

class WorkflowListPage extends ModulePage {
  componentDidMount() {
    super.componentDidMount();
    processList.set('workflowListInit', () => this.init(true));
  }

  init = (refresh) => {
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

  getHiddenColumns = () => {
    const { hiddenColumns, userInfo, userUnits } = this.props;

    if (checkAccess({ isUnitedUser: false }, userInfo, userUnits)) {
      return hiddenColumns ? hiddenColumns.notUnitedUser : [];
    }

    const hiddenColumnProps = unitProps(hiddenColumns.isUnitedUser, userUnits).filter(Boolean);
    const allHiddenColumns = [].concat(...hiddenColumnProps);
    return allHiddenColumns.filter(
      (column) => allHiddenColumns.map((col) => column === col).length === 1
    );
  };

  handleItemClick = ({ row: { id, entryTaskId, entryTaskFinishedAt } }) => {
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

const translated = translate('WorkflowListPage')(WorkflowListPage);

const mapStateToProps = (state, { endPoint }) => {
  const {
    workflowTemplate,
    [endPoint.sourceName]: { loading, data, error },
    auth: { info, userUnits }
  } = state;

  return {
    data,
    error,
    loading,
    userUnits,
    userInfo: info,
    templates: workflowTemplate.list
  };
};

const mapDispatchToProps = (dispatch, { endPoint }) => ({
  actions: {
    load: bindActionCreators(load(endPoint), dispatch),
    onFilterChange: bindActionCreators(onFilterChange(endPoint), dispatch),
    setHiddenColumns: bindActionCreators(setHiddenColumns(endPoint), dispatch),
    onColumnSortChange: bindActionCreators(onColumnSortChange(endPoint), dispatch),
    loadWorkflowTemplates: bindActionCreators(loadWorkflowTemplates, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(translated);

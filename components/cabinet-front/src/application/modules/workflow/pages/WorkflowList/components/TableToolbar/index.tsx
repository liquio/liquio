import React from 'react';

import DeleteWorkflowRaw from 'modules/workflow/pages/WorkflowList/components/TableToolbar/DeleteWorkflow';
import SelectStatusRaw from './SelectStatus';

const DeleteWorkflow = DeleteWorkflowRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SelectStatus = SelectStatusRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface WorkflowFilters {
  is_draft?: boolean;
  workflowStatusId?: number | string;
  [key: string]: unknown;
}

interface TableToolsProps {
  rowsSelected?: Array<string | number>;
  actions: { onFilterChange: (filters: Record<string, unknown>) => void; [key: string]: unknown };
  filters: WorkflowFilters;
  [key: string]: unknown;
}

const TableTools = (props: TableToolsProps) => {
  const { rowsSelected, actions, filters } = props;

  return (
    <>
      {!filters.is_draft ? (
        <SelectStatus
          filters={filters}
          value={filters.workflowStatusId || 0}
          onChange={({ target: { value } }: { target: { value: number } }) =>
            actions.onFilterChange({
              workflowStatusId: value > 0 ? value : undefined,
              is_draft: false,
              filtered: true
            })
          }
        />
      ) : null}
      {!!(rowsSelected || []).length ? <DeleteWorkflow {...props} /> : null}
    </>
  );
};

export default TableTools;

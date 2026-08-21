import React from 'react';

import DeleteWorkflow from 'modules/workflow/pages/WorkflowList/components/TableToolbar/DeleteWorkflow';
import SelectStatus from './SelectStatus';

const TableTools = (props) => {
  const { rowsSelected, actions, filters } = props;

  return (
    <>
      {!filters.is_draft ? (
        <SelectStatus
          filters={filters}
          value={filters.workflowStatusId || 0}
          onChange={({ target: { value } }) =>
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

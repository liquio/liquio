import React, { Fragment } from 'react';

import DeleteTrashRaw from 'modules/workflow/pages/WorkflowList/components/TableToolbar/DeleteTrash';
import RecoverTrashRaw from 'modules/workflow/pages/WorkflowList/components/TableToolbar/RecoverTrash';

const DeleteTrash = DeleteTrashRaw as unknown as React.ComponentType<Record<string, unknown>>;
const RecoverTrash = RecoverTrashRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface TableToolsProps {
  actions: Record<string, unknown>;
  rowsSelected?: Array<string | number>;
  data?: unknown[];
}

const TableTools = ({ rowsSelected = [], actions, data = [] }: TableToolsProps) => (
  <Fragment>
    {(rowsSelected || []).length ? (
      <DeleteTrash rowsSelected={rowsSelected} actions={actions} data={data} />
    ) : null}
    {(rowsSelected || []).length ? (
      <RecoverTrash rowsSelected={rowsSelected} actions={actions} data={data} />
    ) : null}
  </Fragment>
);

export default TableTools;

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import DeleteTrash from 'modules/workflow/pages/WorkflowList/components/TableToolbar/DeleteTrash';
import RecoverTrash from 'modules/workflow/pages/WorkflowList/components/TableToolbar/RecoverTrash';

const TableTools = ({ rowsSelected, actions, data }) => (
  <Fragment>
    {(rowsSelected || []).length ? (
      <DeleteTrash rowsSelected={rowsSelected} actions={actions} data={data} />
    ) : null}
    {(rowsSelected || []).length ? (
      <RecoverTrash rowsSelected={rowsSelected} actions={actions} data={data} />
    ) : null}
  </Fragment>
);

TableTools.propTypes = {
  actions: PropTypes.object.isRequired,
  rowsSelected: PropTypes.array,
  data: PropTypes.array
};

TableTools.defaultProps = {
  rowsSelected: [],
  data: []
};
export default TableTools;

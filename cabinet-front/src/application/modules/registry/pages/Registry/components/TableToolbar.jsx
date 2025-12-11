import React, { Fragment } from 'react';

import AddRow from './AddRow';

const TableTools = ({ rowsSelected, selectedKey, actions }) => (
  <Fragment>
    <AddRow rowsSelected={rowsSelected} actions={actions} selectedKey={selectedKey} />
  </Fragment>
);

export default TableTools;

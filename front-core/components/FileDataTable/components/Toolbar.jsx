import React from 'react';
import PropTypes from 'prop-types';

import DownloadAll from './DownloadAllButton';
import DeleteAll from './DeleteAllButton';

const FileDataTableToolbar = (props) => {
  const { rowsSelected, actions } = props;

  if (!(rowsSelected || []).length) {
    return null;
  }

  return (
    <>
      <DownloadAll {...props} />
      {actions.handleDeleteFile ? <DeleteAll {...props} /> : null}
    </>
  );
};

FileDataTableToolbar.propTypes = {
  rowsSelected: PropTypes.array,
  actions: PropTypes.object
};

FileDataTableToolbar.defaultProps = {
  rowsSelected: [],
  actions: {}
};

export default FileDataTableToolbar;

import React from 'react';
import PropTypes from 'prop-types';

import DataList from 'components/DataList';
import ListTemplate from 'components/FileDataList/ListTemplate';

const FileDataList = ({ onClick, onPreviewError, ...props }) => (
  <DataList
    {...props}
    ItemTemplate={(itemProps) => (
      <ListTemplate {...props} {...itemProps} onClick={onClick} onPreviewError={onPreviewError} />
    )}
  />
);

FileDataList.propTypes = {
  onClick: PropTypes.func
};

FileDataList.defaultProps = {
  onClick: () => null
};

export default FileDataList;

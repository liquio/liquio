import React from 'react';

import previewTypes from 'modules/workflow/pages/Workflow/components/WorkflowVersions/PreviewTypes';

const VersionPreview = (props) => {
  const PreviewType = previewTypes[props.type];

  if (!PreviewType) {
    return null;
  }

  return <PreviewType {...props} />;
};

export default VersionPreview;

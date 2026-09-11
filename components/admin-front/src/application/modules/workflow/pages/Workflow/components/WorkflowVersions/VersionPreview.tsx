import React from 'react';

import previewTypes from 'modules/workflow/pages/Workflow/components/WorkflowVersions/PreviewTypes';

interface VersionPreviewProps {
  type?: string;
  [key: string]: unknown;
}

const VersionPreview = (props: VersionPreviewProps) => {
  const PreviewType = previewTypes[props.type as string];

  if (!PreviewType) {
    return null;
  }

  return <PreviewType {...props} />;
};

export default VersionPreview;

import React from 'react';
import { useTranslate } from 'react-translate';
import { makeStyles } from '@mui/styles';

import ScrollbarRaw from 'components/Scrollbar';
import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';

import useVersion from 'modules/workflow/pages/Workflow/components/WorkflowVersions/hooks/useVersion';
import workflowTree from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/workflowTree';

import VersionPreview from 'modules/workflow/pages/Workflow/components/WorkflowVersions/VersionPreview';
import VersionTreeMenu from 'modules/workflow/pages/Workflow/components/WorkflowVersions/VersionTreeMenu';

const Scrollbar = ScrollbarRaw as unknown as React.ComponentType<Record<string, unknown>>;

const withStyles = makeStyles({
  root: {
    height: '100%',
    overflow: 'hidden',
    background: '#232323',
    display: 'flex',
    flexDirection: 'row' as const,
  },
  treeContainer: {
    height: '100%',
    width: 320,
    borderRight: '#757575 1px solid',
  },
  previewContainer: {
    flexGrow: 1,
  },
});

interface TreeNode {
  id: string;
  name?: string;
  type?: string;
  data?: unknown;
  compare?: unknown;
  children?: TreeNode[];
}

interface VersionDetailProps {
  version?: string | number;
  compare?: string | number;
  workflowId?: string | number;
}

const VersionDetail = ({ version, compare, workflowId }: VersionDetailProps) => {
  const classes = withStyles();
  const t = useTranslate('WorkflowAdminPage');

  const [preview, setPreview] = React.useState<TreeNode | undefined>();
  const {
    data: versionData,
    error: versionError,
    loading: loadingVersion,
  } = useVersion(version, workflowId);
  const {
    data: compareData,
    error: compareError,
    loading: loadingCompare,
  } = useVersion(compare, workflowId);

  const tree = React.useMemo(
    () => workflowTree(versionData as never, { t, compare: compareData as never }) as unknown as TreeNode,
    [compareData, t, versionData],
  );

  React.useEffect(() => {
    if (preview || !tree?.children) {
      return;
    }

    const workflowTemplate = tree?.children.find(
      ({ id }) => id === 'workflowTemplate',
    );

    if (
      (!compare && workflowTemplate?.data) ||
      (version &&
        compare &&
        workflowTemplate?.data &&
        workflowTemplate?.compare)
    ) {
      setPreview(workflowTemplate);
    }
  }, [compare, preview, tree, version]);

  if (loadingVersion || (compare && loadingCompare)) {
    return (
      <div className={classes.root}>
        <Preloader flex={true} />
      </div>
    );
  }

  if (versionError || compareError) {
    return (
      <ErrorScreen darkTheme={true} error={(versionError || compareError) as Error} />
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.treeContainer}>
        <Scrollbar>
          <VersionTreeMenu
            tree={tree}
            onClick={(part: TreeNode) => (part.data || part.compare) && setPreview(part)}
          />
        </Scrollbar>
      </div>
      <div className={classes.previewContainer}>
        <VersionPreview
          version={version}
          compareVersion={compare}
          {...(preview || {})}
        />
      </div>
    </div>
  );
};

export default VersionDetail;

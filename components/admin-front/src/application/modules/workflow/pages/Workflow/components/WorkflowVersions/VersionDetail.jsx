import React from 'react';
import { useTranslate } from 'react-translate';
import { makeStyles } from '@mui/styles';

import Scrollbar from 'components/Scrollbar';
import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';

import useVersion from 'modules/workflow/pages/Workflow/components/WorkflowVersions/hooks/useVersion';
import workflowTree from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/workflowTree';

import VersionPreview from 'modules/workflow/pages/Workflow/components/WorkflowVersions/VersionPreview';
import VersionTreeMenu from 'modules/workflow/pages/Workflow/components/WorkflowVersions/VersionTreeMenu';

const withStyles = makeStyles({
  root: {
    height: '100%',
    overflow: 'hidden',
    background: '#232323',
    display: 'flex',
    flexDirection: 'row',
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

const VersionDetail = ({ version, compare, workflowId }) => {
  const classes = withStyles();
  const t = useTranslate('WorkflowAdminPage');

  const [preview, setPreview] = React.useState();
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
    () => workflowTree(versionData, { t, compare: compareData }),
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
      <ErrorScreen darkTheme={true} error={versionError || compareError} />
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.treeContainer}>
        <Scrollbar>
          <VersionTreeMenu
            tree={tree}
            onClick={(part) => (part.data || part.compare) && setPreview(part)}
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

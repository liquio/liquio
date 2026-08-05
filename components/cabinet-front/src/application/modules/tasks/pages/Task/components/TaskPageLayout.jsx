import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { useTranslate } from 'react-translate';

import LeftSidebarLayout from 'layouts/LeftSidebar';

const PopupCheckValidTools = React.lazy(() =>
  import('modules/tasks/pages/Task/debugTools/PopupCheckValidTools')
);
const PopupDebugTools = React.lazy(() =>
  import('modules/tasks/pages/Task/debugTools/PopupDebugTools')
);
const TaskDataTools = React.lazy(() => import('modules/tasks/pages/Task/debugTools/TaskDataTools'));
const CheckValidFunction = React.lazy(() =>
  import('modules/tasks/pages/Task/debugTools/CheckValidFunction')
);

const TaskPageLayout = ({
  popupDebugTools,
  children,
  location,
  title,
  loading,
  task,
  template,
  stepId,
  flexContent,
  authInfo,
}) => {
  const t = useTranslate('BreadCrumbs');

  const debugTools = {
    TaskDataTools: <TaskDataTools task={task} template={template} />,
    CheckValidFunction: (
      <CheckValidFunction task={task} template={template} stepId={stepId} userInfo={authInfo} />
    )
  };

  if (popupDebugTools) {
    debugTools.PopupDebugTools = <PopupDebugTools {...popupDebugTools} />;
    debugTools.PopupCheckValidTools = <PopupCheckValidTools {...popupDebugTools} />;
  }

  const getCrumbsTitle = React.useCallback(() => {
    const { pathname } = location;
    let label = '';
    let link = '';

    switch (true) {
      case pathname.includes('/tasks/my-tasks'):
        label = t('TasksTitle');
        link = '/tasks/my-tasks';
        break;
      case pathname.includes('/tasks/unit-tasks'):
        label = t('TasksUnitsTitle');
        link = '/tasks/unit-tasks';
        break;
      case pathname.includes('/tasks/closed-tasks'):
        label = t('ClosedCrumbsTitle');
        link = '/tasks/closed-tasks';
        break;
      case pathname.includes('/tasks/closed-unit-tasks'):
        label = t('ClosedUnitsTitle');
        link = '/tasks/closed-unit-tasks';
        break;
      case pathname.includes('/tasks'):
        label = t('WorkflowTitle');
        link = '/workflow/drafts';
        break;
      default:
        break;
    }

    return { label, link };
  }, [t, location]);

  const breadcrumbs = React.useMemo(() => {
    const { label, link } = getCrumbsTitle();

    return [
      {
        label,
        link
      },
      {
        label: title
      }
    ];
  }, [title, getCrumbsTitle]);

  return (
    <LeftSidebarLayout
      disableScrolls={true}
      flexContent={flexContent}
      location={location}
      title={title}
      loading={loading}
      debugTools={debugTools}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </LeftSidebarLayout>
  );
};

TaskPageLayout.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
  location: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  task: PropTypes.object.isRequired,
  template: PropTypes.object.isRequired
};

const mapStateToProps = ({ debugTools: { popup } }) => ({
  popupDebugTools: popup
});
export default connect(mapStateToProps)(TaskPageLayout);

import React from 'react';

import { ReactComponent as DoneAllIcon } from 'assets/img/modulesIcons/done-all-outlined.svg';
import workflowEndPoint from 'application/endPoints/workflow';
import workflowDraftEndPoint from 'application/endPoints/workflowDraft';
import workflowTrashEndPoint from 'application/endPoints/workflowTrash';

const WorkflowPage = React.lazy(() => import('modules/workflow/pages/Workflow'));
const DraftsTableToolbar = React.lazy(() =>
  import('modules/workflow/pages/WorkflowList/components/TableToolbar')
);
const TrashTableTools = React.lazy(() =>
  import('modules/workflow/pages/WorkflowList/components/TableToolbar/TrashTableTools')
);
const WorkflowListPage = React.lazy(() => import('modules/workflow/pages/WorkflowList'));

export default {
  routes: [
    {
      path: '/workflow/drafts',
      component: WorkflowListPage,
      endPoint: workflowDraftEndPoint,
      TableToolbar: DraftsTableToolbar,
      title: 'Drafts',
      defaultFilters: { tasks: { deleted: 0 }, is_draft: true },
      defaultSort: { columnName: 'documents.updated_at', direction: 'desc' },
      uiFilter: 'workflows.draft',
      hiddenColumns: {
        notUnitedUser: [],
        isUnitedUser: 'properties.hiddenColumns.workflow.Drafts'
      },
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.workflow.Drafts'
      }
    },
    {
      path: '/workflow/trash',
      component: WorkflowListPage,
      endPoint: workflowTrashEndPoint,
      TableToolbar: TrashTableTools,
      title: 'TrashPage',
      defaultFilters: { tasks: { deleted: 1 }, is_draft: true },
      defaultSort: { columnName: 'tasks.created_at', direction: 'desc' },
      hiddenColumns: {
        notUnitedUser: [],
        isUnitedUser: 'properties.hiddenColumns.workflow.Trash'
      },
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.workflow.Trash'
      }
    },
    {
      path: '/workflow/:workflowId',
      component: WorkflowPage,
      access: {
        isUnitedUser: false,
        unitHasAccessTo: [
          'navigation.workflow.MyWorkflow',
          'navigation.workflow.Drafts',
          'navigation.workflow.Trash'
        ]
      }
    },
    {
      path: '/workflow',
      component: WorkflowListPage,
      endPoint: workflowEndPoint,
      TableToolbar: DraftsTableToolbar,
      title: 'InboxTitle',
      defaultFilters: { 'tasks.deleted': 0, is_draft: false },
      defaultSort: { columnName: 'tasks.finished_at', direction: 'desc' },
      uiFilter: 'workflows.not-draft',
      hiddenColumns: {
        notUnitedUser: [],
        isUnitedUser: 'properties.hiddenColumns.workflow.MyWorkflow'
      },
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.workflow.MyWorkflow'
      }
    }
  ],
  navigation: [
    {
      id: 'Workflow',
      icon: <DoneAllIcon />,
      priority: 30,
      access: {
        isUnitedUser: false,
        unitHasAccessTo: [
          'navigation.workflow.MyWorkflow',
          'navigation.workflow.Drafts',
          'navigation.workflow.Trash'
        ]
      },
      children: [
        {
          id: 'MyWorkflow',
          path: '/workflow',
          uiFilter: 'workflows.not-draft',
          access: {
            isUnitedUser: false,
            unitHasAccessTo: 'navigation.workflow.MyWorkflow'
          }
        },
        {
          id: 'Drafts',
          path: '/workflow/drafts',
          uiFilter: 'workflows.draft',
          access: {
            isUnitedUser: false,
            unitHasAccessTo: 'navigation.workflow.Drafts'
          }
        },
        {
          id: 'Trash',
          path: '/workflow/trash',
          uiFilter: 'workflows.trash',
          access: {
            isUnitedUser: false,
            unitHasAccessTo: 'navigation.workflow.Trash'
          }
        }
      ]
    }
  ]
};

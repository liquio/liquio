import React from 'react';

import { ReactComponent as WorkOutlineIcon } from 'assets/img/modulesIcons/workout-outlined.svg';
import taskEndPoint from 'application/endPoints/task';
import unitTaskEndPoint from 'application/endPoints/unitTask';
import closedTaskEndPoint from 'application/endPoints/closedTask';
import closedUnitTaskEndPoint from 'application/endPoints/closedUnitTask';

const TaskListPage = React.lazy(() => import('modules/tasks/pages/TaskList'));
const TaskPage = React.lazy(() => import('modules/tasks/pages/Task'));
const OnboardingTaskPage = React.lazy(() => import('modules/tasks/pages/OnboardingTask'));
const UncreatedTask = React.lazy(() => import('modules/tasks/pages/UncreatedTask'));
const MultisignTask = React.lazy(() => import('modules/tasks/pages/MultisignTask'));
const ProcessesPage = React.lazy(() => import('modules/tasks/components/CreateTaskDialog'));
const MyTaskNavigation = React.lazy(() => import('./components/MyTaskNavigation'));
const UnitTaskNavigation = React.lazy(() => import('./components/UnitTaskNavigation'));

const taskModules = [
  {
    title: 'ClosedTasksTitle',
    rootPath: '/tasks/closed-tasks',
    endPoint: closedTaskEndPoint,
    defaultFilters: { finished: 1, deleted: 0, assigned_to: 'me' },
    uiFilter: 'tasks.my.closed',
    hiddenColumns: {
      notUnitedUser: [
        'applicantName',
        'applicantType',
        'performerUnits',
        'performerUserNames',
        'Строк виконання',
        'dueDate'
      ],
      isUnitedUser: 'properties.hiddenColumns.tasks.ClosedTasks'
    },
    access: { unitHasAccessTo: 'navigation.tasks.ClosedTasks' }
  },
  {
    title: 'UnitClosedTasksTitle',
    rootPath: '/tasks/closed-unit-tasks',
    endPoint: closedUnitTaskEndPoint,
    defaultFilters: { finished: 1, deleted: 0, assigned_to: 'unit' },
    uiFilter: 'tasks.unit.closed',
    hiddenColumns: {
      notUnitedUser: ['performerUserNames'],
      isUnitedUser: 'properties.hiddenColumns.tasks.UnitClosedTasks'
    },
    access: { unitHasAccessTo: 'navigation.tasks.UnitClosedTasks' }
  },
  {
    title: 'UnitInboxTasksTitle',
    rootPath: '/tasks/unit-tasks',
    endPoint: unitTaskEndPoint,
    defaultFilters: { finished: 0, deleted: 0, assigned_to: 'unit' },
    uiFilter: 'tasks.unit.opened',
    hiddenColumns: {
      notUnitedUser: ['performerUserNames'],
      isUnitedUser: 'properties.hiddenColumns.tasks.UnitInboxTasks'
    },
    access: { unitHasAccessTo: 'navigation.tasks.UnitInboxTasks' }
  },
  {
    title: 'InboxTasksTitle',
    rootPath: '/tasks/my-tasks',
    endPoint: taskEndPoint,
    defaultFilters: { finished: 0, deleted: 0, assigned_to: 'me' },
    uiFilter: 'tasks.my.opened',
    hiddenColumns: {
      notUnitedUser: [
        'applicantName',
        'applicantType',
        'performerUnits',
        'performerUserNames',
        'Строк виконання',
        'dueDate'
      ],
      isUnitedUser: 'properties.hiddenColumns.tasks.InboxTasks'
    },
    access: { unitHasAccessTo: 'navigation.tasks.InboxTasks' }
  },
  {
    title: 'InboxTasksTitle',
    rootPath: '/tasks',
    endPoint: taskEndPoint,
    hiddenColumns: {
      notUnitedUser: [
        'applicantName',
        'applicantType',
        'performerUnits',
        'performerUserNames',
        'Строк виконання',
        'dueDate'
      ],
      isUnitedUser: 'properties.hiddenColumns.tasks.InboxTasks'
    },
    access: {
      unitHasAccessTo: [
        'navigation.tasks.InboxTasks',
        'navigation.tasks.UnitInboxTasks',
        'navigation.tasks.ClosedTasks',
        'navigation.tasks.UnitClosedTasks'
      ]
    }
  }
];

const taskRoutes = [].concat(
  ...taskModules.map(({ rootPath, ...rest }) => [
    {
      rootPath,
      path: rootPath + '/:taskId/signers/apply',
      component: MultisignTask
    },
    {
      rootPath,
      path: rootPath + '/redirect/:workflowId/:taskTemplateId',
      component: UncreatedTask
    },
    {
      rootPath,
      path: rootPath + '/create/:workflowTemplateId/:taskTemplateId',
      component: TaskPage
    },
    {
      rootPath,
      path: rootPath + '/create/:workflowTemplateId',
      component: TaskPage
    },
    {
      rootPath,
      path: rootPath + '/:taskId/:stepId',
      component: TaskPage
    },
    {
      rootPath,
      path: rootPath + '/:taskId',
      component: TaskPage
    },
    {
      ...rest,
      rootPath,
      path: rootPath,
      component: TaskListPage
    },
    {
      rootPath,
      path: '/services',
      component: ProcessesPage
    }
  ])
);

export default {
  routes: [
    {
      path: '/tasks/onBoarding/:stepId',
      component: OnboardingTaskPage,
      isOnboarding: true
    },
    {
      path: '/tasks/onBoarding',
      component: OnboardingTaskPage,
      isOnboarding: true
    },
    {
      path: '/tasks/onBoarding/:stepId',
      to: '/',
      redirect: true
    },
    {
      path: '/tasks/onBoarding',
      to: '/',
      redirect: true
    },
    ...taskRoutes,
    {
      path: '*',
      to: '/tasks/onBoarding',
      redirect: true,
      isOnboarding: true
    }
  ],
  navigation: [
    {
      id: 'Tasks',
      icon: <WorkOutlineIcon />,
      priority: 40,
      access: {
        isUnitedUser: false,
        unitHasAccessTo: [
          'navigation.tasks.InboxTasks',
          'navigation.tasks.UnitInboxTasks',
          'navigation.tasks.ClosedTasks',
          'navigation.tasks.UnitClosedTasks'
        ]
      },
      children: [
        {
          Component: MyTaskNavigation,
          access: {
            isUnitedUser: false,
            unitHasAccessTo: 'navigation.tasks.InboxTasks'
          }
        },
        {
          Component: UnitTaskNavigation,
          access: { unitHasAccessTo: 'navigation.tasks.UnitInboxTasks' }
        },
        {
          id: 'ClosedTasks',
          path: '/tasks/closed-tasks',
          uiFilter: 'tasks.my.closed',
          access: {
            isUnitedUser: false,
            unitHasAccessTo: 'navigation.tasks.ClosedTasks'
          }
        },
        {
          id: 'UnitClosedTasks',
          path: '/tasks/closed-unit-tasks',
          uiFilter: 'tasks.unit.closed',
          access: { unitHasAccessTo: 'navigation.tasks.UnitClosedTasks' }
        }
      ]
    }
  ]
};

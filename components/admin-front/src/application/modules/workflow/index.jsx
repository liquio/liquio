import React from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import ContactlessIcon from '@mui/icons-material/Contactless';

import WorkflowListPage from './pages/WorkflowList';
import WorkflowPage from './pages/Workflow';
import NumberTemplateListPage from './pages/NumberTemplateList';
import MessageTemplatesList from './pages/MessageTemplatesList';
import QrTemplatesList from './pages/QrTemplatesList';
import WorkflowCategoryListPage from './pages/WorkflowCategoryList';
import JournalPage from './pages/Journal';
import JournalListPage from './pages/JournalList';
import WorkflowProcessesPage from './pages/WorkflowProcesses';
import TagsListPage from './pages/TagsListPage';

import ListIcon from 'assets/img/logs_icon.svg';
import { getConfig } from 'core/helpers/configLoader';

export default function getWorkflowModule() {
  const config = getConfig();

  const journalNavigation = [
    {
      id: 'Journal',
      title: 'JournalList',
      path: '/workflow/journal',
      access: {
        userHasUnit: [1000000043, 1000003, 100003, 1000000041, 1000001]
      }
    },
    {
      id: 'Processes',
      title: 'Processes',
      path: '/workflow/processes',
      access: {
        userHasUnit: [1000003, 1000001, 1000000041]
      }
    },
    {
      id: 'UserProcess',
      title: 'UserProcessList',
      path: '/users/journal',
      access: {
        isEnabled: config?.enabledUsersJournal
      }
    },
    {
      id: 'UserAccessJournal',
      title: 'UserAccessJournal',
      path: '/users/accessJournal',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.users.UserAccessJournal'
      }
    },
    {
      id: 'UserLoginJournal',
      title: 'UserLoginJournal',
      path: '/users/loginJournal',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.users.UserLoginJournal'
      }
    },
    {
      id: 'UserOperations',
      title: 'UserOperations',
      path: '/users/operations',
      access: {
        isUnitedUser: false,
        unitHasAccessTo: 'navigation.users.UserOperations'
      }
    }
  ];

  if (config?.hideWorkflowProcesses) {
    const processesIndex = journalNavigation.findIndex(
      (navigation) => navigation.id === 'Processes'
    );
    processesIndex !== -1 && journalNavigation.splice(processesIndex, 1);
  }

  const processesNavigation = [
    {
      id: 'Workflow',
      title: config?.testCategory ? 'BpmnList' : 'BpmnListOrigin',
      path: '/workflow',
      access: {
        userHasUnit: [1000000042, 1000002, 1000000043, 1000003, 1000015, 100002, 100003]
      }
    },
    {
      id: 'NumberTemplates',
      title: 'NumberTemplates',
      path: '/workflow/templates',
      access: { userHasUnit: [1000002, 1000000042] }
    },
    {
      id: 'MessageTemplatesList',
      title: 'MessageTemplatesList',
      path: '/workflow/message-templates',
      access: { userHasUnit: [1000002, 1000000042] }
    },
    {
      id: 'QrTemplatesList',
      title: 'QrTemplatesList',
      path: '/workflow/qr-templates',
      access: { userHasUnit: [1000002, 1000000042] }
    },
    {
      id: 'WorkflowCategories',
      path: '/workflow/categories',
      access: { userHasUnit: [1000002, 1000000042] }
    },
    {
      id: 'TagsList',
      title: 'TagsList',
      path: '/workflow/tags',
      access: { userHasUnit: [1000017] }
    }
  ];

  if (config?.testCategory) {
    processesNavigation.splice(1, 0, {
      id: 'WorkflowsTest',
      title: 'BpmnListTest',
      path: '/workflow_test',
      testProcesses: false,
      access: { userHasUnit: [1000002, 1000012, 1000000042] }
    });
  }

  if (config?.enabledMocksPage) {
    processesNavigation.splice(2, 0, {
      id: 'EnabledIndividualMockPage',
      title: 'EnabledIndividualMockPage',
      icon: <ContactlessIcon />,
      path: '/individual_mock',
      access: {
        userHasUnit: [1000016, 10000160]
      }
    });
  }

  if (config?.hideQr) {
    const qrIndex = processesNavigation.findIndex(
      (navigation) => navigation.id === 'QrTemplatesList'
    );
    qrIndex !== -1 && processesNavigation.splice(qrIndex, 1);
  }

  if (config?.hideCategories) {
    const categoriesIndex = processesNavigation.findIndex(
      (navigation) => navigation.id === 'WorkflowCategories'
    );
    categoriesIndex !== -1 && processesNavigation.splice(categoriesIndex, 1);
  }

  if (config?.hideMessageTemplates) {
    const messageTemplatesIndex = processesNavigation.findIndex(
      (navigation) => navigation.id === 'MessageTemplatesList'
    );
    messageTemplatesIndex !== -1 && processesNavigation.splice(messageTemplatesIndex, 1);
  }

  return {
    routes: [
      {
        path: '/workflow/journal/:processId',
        component: JournalPage,
        title: 'JournalPageTitle',
        access: {
          userHasUnit: [1000000043, 1000003, 100003, 1000000041, 1000001]
        }
      },
      {
        path: '/workflow/journal',
        component: JournalListPage,
        title: 'JournalListPageTitle',
        access: {
          userHasUnit: [1000000043, 1000003, 100003, 1000000041, 1000001]
        }
      },
      {
        path: '/workflow/categories',
        component: WorkflowCategoryListPage,
        title: 'WorkflowCategoryList',
        access: { userHasUnit: [1000002, 1000000042] }
      },
      {
        path: '/workflow/templates',
        component: NumberTemplateListPage,
        title: 'NumberTemplateList',
        access: { userHasUnit: [1000002, 1000000042] }
      },
      {
        path: '/workflow/message-templates',
        component: MessageTemplatesList,
        title: 'MessageTemplatesList',
        access: { userHasUnit: [1000002, 1000000042] }
      },
      {
        path: '/workflow/tags',
        component: TagsListPage,
        title: 'TagsList',
        access: { userHasUnit: [1000017] }
      },
      {
        path: '/workflow/qr-templates',
        component: QrTemplatesList,
        title: 'QrTemplatesList',
        access: { userHasUnit: [1000002, 1000000042] }
      },
      {
        path: '/workflow/processes',
        component: WorkflowProcessesPage,
        title: 'WorkflowProcesses',
        access: {
          userHasUnit: [1000003, 1000001, 1000000041]
        }
      },
      {
        path: '/workflow/:workflowId/:selectionId',
        component: WorkflowPage,
        title: 'AdminWorkflow',
        access: {
          userHasUnit: [1000000042, 1000002, 1000000043, 1000003, 1000015, 100002, 100003]
        }
      },
      {
        path: '/workflow/:workflowId',
        component: WorkflowPage,
        title: 'AdminWorkflow',
        access: {
          userHasUnit: [1000000042, 1000002, 1000000043, 1000003, 1000015, 100002, 100003]
        }
      },
      {
        path: '/workflow',
        component: WorkflowListPage,
        title: 'AdminWorkflowList',
        access: {
          userHasUnit: [1000000042, 1000002, 1000000043, 1000003, 1000015, 100002, 100003]
        }
      },
      {
        path: '/workflow_test',
        component: WorkflowListPage,
        title: 'AdminWorkflowList',
        isTestProcesses: true,
        access: {
          userHasUnit: [1000000042, 1000002, 1000000043, 1000003, 1000015, 100002, 100003]
        }
      }
    ],
    navigation: [
      {
        id: 'Workflow',
        title: 'AdminWorkflowList',
        icon: <SettingsIcon />,
        path: '/workflow',
        children: processesNavigation,
        access: {
          userHasUnit: [
            1000000042, 1000002, 1000000043, 1000003, 1000015, 100002, 100003, 1000016, 10000160
          ]
        }
      },
      {
        id: 'WorkflowJournal',
        title: 'WorkflowJournal',
        icon: <img src={ListIcon} alt="list icon" />,
        path: '/workflow',
        children: journalNavigation,
        access: {
          userHasUnit: [1000000043, 1000003, 100003, 1000000041, 1000001]
        }
      }
    ]
  };
}

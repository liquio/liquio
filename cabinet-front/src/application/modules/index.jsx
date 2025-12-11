import tasksModule from 'modules/tasks';
import workflowModule from 'modules/workflow';
import registryModule from 'modules/registry';
import profileModule from 'modules/profile';
import getMessagesModule from 'modules/messages';
import inboxModule from 'modules/inbox';
import usersModule from 'modules/users';
import getReportsModule from 'modules/reports';
import homeModule from 'modules/home';
import adminModule from 'modules/admin';

export default function getModules() {
  return [
    getMessagesModule(),
    adminModule,
    tasksModule,
    inboxModule,
    workflowModule,
    registryModule,
    profileModule,
    usersModule,
    getReportsModule(),
    homeModule
  ];
}

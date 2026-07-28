import { routerReducer } from 'react-router-redux';

import authReducer from 'reducers/auth';
import errorReducer from 'reducers/error';
import edsReducer from 'reducers/eds';
import usersReducer from 'reducers/users';
import appReducer from 'reducers/app';
import favoritesReducer from 'reducers/favorites';

import dataTableReducer from 'services/dataTable/reducer';
import workflowEndPoint from 'application/endPoints/workflow';
import unitsEndPoint from 'application/endPoints/units';
import usersEndPoint from 'application/endPoints/users';
import unitListControlEndPoint from 'application/endPoints/unitListControl';
import registryEndPoint from 'application/endPoints/registry';
import processesEndPoint from 'application/endPoints/journal';
import userProcessesEndPoint from 'application/endPoints/userProcesses';
import numberTemplatesEndPoint from 'application/endPoints/numberTemplates';
import registryKeyListEndPoint from 'application/endPoints/registryKeyList';

import workflowReducer from 'application/reducers/workflow';
import unitsReducer from 'application/reducers/units';
import tasksReducer from 'application/reducers/tasks';
import gatewaysReducer from 'application/reducers/gateways';
import eventsReducer from 'application/reducers/events';
import registryReducer from 'application/reducers/registry';
import workflowProcessReducer from 'application/reducers/workflowProcess';
import workflowProcessLogsReducer from 'application/reducers/workflowProcessLogs';
import numberTemplatesReducer from 'application/reducers/numberTemplates';
import snippetsReducer from 'application/reducers/snippets';
import bpmnAiReducer from 'application/reducers/bpmnAi';
import dictionaryReducer from 'application/reducers/dictionary';

export default {
  app: appReducer,
  router: routerReducer,
  eds: edsReducer,
  auth: authReducer,
  errors: errorReducer,
  users: usersReducer,
  workflow: workflowReducer,
  units: unitsReducer,
  tasks: tasksReducer,
  gateways: gatewaysReducer,
  events: eventsReducer,
  registry: registryReducer,
  workflowProcess: workflowProcessReducer,
  workflowProcessLogs: workflowProcessLogsReducer,
  numberTemplates: numberTemplatesReducer,
  favorites: favoritesReducer,
  controlsLibrary: snippetsReducer,
  bpmnAi: bpmnAiReducer,
  dictionary: dictionaryReducer,
  [workflowEndPoint.sourceName]: dataTableReducer(workflowEndPoint),
  [unitsEndPoint.sourceName]: dataTableReducer(unitsEndPoint),
  [usersEndPoint.sourceName]: dataTableReducer(usersEndPoint),
  [registryEndPoint.sourceName]: dataTableReducer(registryEndPoint),
  [processesEndPoint.sourceName]: dataTableReducer(processesEndPoint),
  [userProcessesEndPoint.sourceName]: dataTableReducer(userProcessesEndPoint),
  [unitListControlEndPoint.sourceName]: dataTableReducer(
    unitListControlEndPoint,
  ),
  [numberTemplatesEndPoint.sourceName]: dataTableReducer(
    numberTemplatesEndPoint,
  ),
  [registryKeyListEndPoint.sourceName]: dataTableReducer(
    registryKeyListEndPoint,
  ),
};

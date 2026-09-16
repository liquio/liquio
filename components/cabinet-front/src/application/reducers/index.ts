import { routerReducer } from 'react-router-redux';

import authReducer from 'reducers/auth';
import usersReducer from 'reducers/users';
import errorReducer from 'reducers/error';
import edsReducer from 'reducers/eds';
import appReducer from 'reducers/app';
import debugToolsReducer from 'reducers/debugTools';

import dataTableReducer from 'services/dataTable/reducer';

import taskReducer from 'application/reducers/task';
import workflowReducer from 'application/reducers/workflow';
import registryReducer from 'application/reducers/registry';
import documentTemplateReducer from 'application/reducers/documentTemplate';
import workflowTemplateReducer from 'application/reducers/workflowTemplate';
import messagesReducer from 'application/reducers/messages';
import fileReducer from 'application/reducers/files';
import inboxReducer from 'application/reducers/inbox';
import externalReaderReducer from 'application/reducers/externalReader';

import taskEndPoint from 'application/endPoints/task';
import unitTaskEndPoint from 'application/endPoints/unitTask';
import closedTaskEndPoint from 'application/endPoints/closedTask';
import closedUnitTaskEndPoint from 'application/endPoints/closedUnitTask';

import workflowEndPoint from 'application/endPoints/workflow';
import workflowDraftEndPoint from 'application/endPoints/workflowDraft';
import workflowTrashEndPoint from 'application/endPoints/workflowTrash';

import registryRecordEndPoint from 'application/endPoints/registryRecord';
import registryHistoryEndPoint from 'application/endPoints/registryHistory';
import registryKeyHistoryEndPoint from 'application/endPoints/registryKeyHistory';
import messageEndPoint from 'application/endPoints/message';
import inboxFilesEndPoint from 'application/endPoints/inboxFiles';

export default {
  app: appReducer,
  router: routerReducer,
  eds: edsReducer,
  auth: authReducer,
  users: usersReducer,
  errors: errorReducer,
  task: taskReducer,
  workflow: workflowReducer,
  registry: registryReducer,
  documentTemplate: documentTemplateReducer,
  workflowTemplate: workflowTemplateReducer,
  messages: messagesReducer,
  files: fileReducer,
  inbox: inboxReducer,
  externalReader: externalReaderReducer,
  debugTools: debugToolsReducer,
  [taskEndPoint.sourceName]: dataTableReducer(taskEndPoint),
  [unitTaskEndPoint.sourceName]: dataTableReducer(unitTaskEndPoint),
  [closedTaskEndPoint.sourceName]: dataTableReducer(closedTaskEndPoint),
  [closedUnitTaskEndPoint.sourceName]: dataTableReducer(closedUnitTaskEndPoint),
  [registryRecordEndPoint.sourceName]: dataTableReducer(registryRecordEndPoint),
  [registryHistoryEndPoint.sourceName]: dataTableReducer(registryHistoryEndPoint),
  [registryKeyHistoryEndPoint.sourceName]: dataTableReducer(registryKeyHistoryEndPoint),
  [workflowEndPoint.sourceName]: dataTableReducer(workflowEndPoint),
  [workflowDraftEndPoint.sourceName]: dataTableReducer(workflowDraftEndPoint),
  [workflowTrashEndPoint.sourceName]: dataTableReducer(workflowTrashEndPoint),
  [messageEndPoint.sourceName]: dataTableReducer(messageEndPoint),
  [inboxFilesEndPoint.sourceName]: dataTableReducer(inboxFilesEndPoint)
};

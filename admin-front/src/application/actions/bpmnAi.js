import * as api from 'services/api';
import { addError } from 'actions/error';
import { getQueryLangParam } from 'actions/auth';
import { getConfig } from '../../core/helpers/configLoader';

const DEFAULT_LANGUAGE = 'ua';

const BPMN_AI_PROXY_ROUTE = 'bpmn-ai-proxy';

const GET_GREETING_MESSAGE = 'AI_GET_GREETING_MESSAGE';
const GET_HOT_ACTION_PROMPTS = 'AI_GET_HOT_ACTION_PROMPTS';
const MODEL_PROMPT = 'AI_MODEL_PROMPT';
const GET_ASSISTANT_SESSION_ID = 'AI_GET_ASSISTANT_SESSION_ID';
const GET_BUILDER_SESSION_ID = 'AI_GET_BUILDER_SESSION_ID';
const GET_CHAT_HISTORY = 'AI_GET_CHAT_HISTORY';
const GET_BUILDER_HISTORY = 'AI_GET_BUILDER_HISTORY';
const DELETE_ASSISTANT_CHAT_HISTORY = 'AI_DELETE_ASSISTANT_CHAT_HISTORY';
const DELETE_CODE_GENERATION_CHAT_HISTORY = 'AI_DELETE_CODE_GENERATION_CHAT_HISTORY';
const SEND_ANOMALIES_ANALYZE = 'AI_SEND_ANOMALIES_ANALYZE';
const SEND_SCHEMA_TO_GENERATE_TECH_SPECS = 'AI_SEND_SCHEMA_TO_GENERATE_TECH_SPECS';
const SET_EXTERNAL_COMMAND = 'AI_SET_EXTERNAL_COMMAND';
const SET_COPILOT_STATUS = 'AI_SET_COPILOT_STATUS';

function customHeaders() {
  const config = getConfig();

  let currentLanguage = getQueryLangParam() || config?.defaultLanguage || DEFAULT_LANGUAGE;

  switch (currentLanguage) {
    case 'eng':
      currentLanguage = 'en';
      break;
    case 'uk-UA':
    case 'uk':
      currentLanguage = DEFAULT_LANGUAGE;
      break;
  }

  return {
    'x-custom-lang': currentLanguage
  };
}

export const getGreetingMessage = () => (dispatch) =>
  api
    .get(
      `${BPMN_AI_PROXY_ROUTE}/greeting-message`,
      GET_GREETING_MESSAGE,
      dispatch,
      {},
      { headers: customHeaders() }
    )
    .catch((error) => {
      addError('AImodelsGetGreetingMessageError');
      return error;
    });

export const getHotActionPrompts = () => (dispatch) =>
  api
    .get(
      `${BPMN_AI_PROXY_ROUTE}/hot-actions`,
      GET_HOT_ACTION_PROMPTS,
      dispatch,
      {},
      { headers: customHeaders() }
    )
    .catch((error) => {
      addError('AImodelsGetHotActionPromptsError');
      return error;
    });

export const getAiPrompts = (body, mode) => (dispatch) => {
  const route = mode === '/assistant' ? 'ai-helper/assistant' : 'builder/code';

  return api
    .post(
      `${BPMN_AI_PROXY_ROUTE}/${route}`,
      body,
      MODEL_PROMPT,
      dispatch,
      {},
      { headers: customHeaders() }
    )
    .catch((error) => {
      addError('AImodelsPromptError');
      return error;
    });
};

export const getAiSessionId = (body) => (dispatch) =>
  api
    .post(
      `${BPMN_AI_PROXY_ROUTE}/ai-helper/assistant/sessions`,
      body,
      GET_ASSISTANT_SESSION_ID,
      dispatch,
      {},
      { headers: customHeaders() }
    )
    .catch((error) => {
      addError('AImodelsGetAssistantSessionIdError');
      return error;
    });

export const getBuilderSessionId = (body) => (dispatch) =>
  api
    .post(
      `${BPMN_AI_PROXY_ROUTE}/builder/code/sessions`,
      body,
      GET_BUILDER_SESSION_ID,
      dispatch,
      {},
      { headers: customHeaders() }
    )
    .catch((error) => {
      addError('AImodelsGetBuilderSessionIdError');
      return error;
    });

export const getAiChatHistory = (sessionId) => (dispatch) =>
  api
    .get(
      `${BPMN_AI_PROXY_ROUTE}/ai-helper/assistant/sessions/${sessionId}`,
      GET_CHAT_HISTORY,
      dispatch,
      {},
      { headers: customHeaders() }
    )
    .catch((error) => {
      addError('AImodelsGetChatHistoryError');
      return error;
    });

export const getAiBuilderHistory = (sessionId) => (dispatch) =>
  api
    .get(
      `${BPMN_AI_PROXY_ROUTE}/builder/code/sessions/${sessionId}`,
      GET_BUILDER_HISTORY,
      dispatch,
      {},
      { headers: customHeaders() }
    )
    .catch((error) => {
      addError('AImodelsGetBuilderHistoryError');
      return error;
    });

export const deleteAssistantChatHistory = (sessionId) => (dispatch) =>
  api
    .del(
      `${BPMN_AI_PROXY_ROUTE}/ai-helper/assistant/sessions/${sessionId}`,
      {},
      DELETE_ASSISTANT_CHAT_HISTORY,
      dispatch,
      { sessionId }
    )
    .catch((error) => {
      addError('AImodelsAssistantChatHistoryError');
      return error;
    });

export const deleteCodeGenerationChatHistory = (sessionId) => (dispatch) =>
  api
    .del(
      `${BPMN_AI_PROXY_ROUTE}/builder/code/sessions/${sessionId}`,
      {},
      DELETE_CODE_GENERATION_CHAT_HISTORY,
      dispatch,
      { sessionId }
    )
    .catch((error) => {
      addError('AImodelsDeleteCodeGenerationChatHistoryError');
      return error;
    });

export const sendAiAnomaliesAnalyze = (body) => (dispatch) =>
  api
    .post(
      `${BPMN_AI_PROXY_ROUTE}/ai-helper/anomalies-analyzer`,
      body,
      SEND_ANOMALIES_ANALYZE,
      dispatch,
      {},
      { headers: customHeaders() }
    )
    .catch((error) => {
      addError('AImodelsSendAnomaliesAnalyzeError');
      return error;
    });

export const generateTechSpecBySchema = (body) => (dispatch) =>
  api
    .post(
      `${BPMN_AI_PROXY_ROUTE}/builder/tech-specification`,
      body,
      SEND_SCHEMA_TO_GENERATE_TECH_SPECS,
      dispatch,
      {},
      { headers: customHeaders() }
    )
    .catch((error) => {
      addError('AImodelsSendSchemaToGenerateTechSpecsError');
      return error;
    });

export const sendExternalCommand = (externalCommand) => ({
  type: SET_EXTERNAL_COMMAND,
  payload: externalCommand
});

export const setCopilotStatus = (status) => ({
  type: SET_COPILOT_STATUS,
  payload: status
});

// Fallback ambient declaration for apps (e.g. cabinet-front) that have no
// `actions/bpmnAi` module of their own — the BPMN AI assistant/builder is an
// admin-front-only feature; admin-front's real, more precisely-typed module
// takes priority wherever it actually resolves via path mapping.
declare module 'actions/bpmnAi' {
  type Thunk = (...args: unknown[]) => (dispatch: unknown) => Promise<never>;

  export const getGreetingMessage: Thunk;
  export const getHotActionPrompts: Thunk;
  export const getAiPrompts: Thunk;
  export const getAiSessionId: Thunk;
  export const getBuilderSessionId: Thunk;
  export const getAiChatHistory: Thunk;
  export const getAiBuilderHistory: Thunk;
  export const deleteAssistantChatHistory: Thunk;
  export const deleteCodeGenerationChatHistory: Thunk;
  export const sendAiAnomaliesAnalyze: Thunk;
  export const generateTechSpecBySchema: Thunk;
  export const sendExternalCommand: (externalCommand: unknown) => { type: string; payload: unknown };
}

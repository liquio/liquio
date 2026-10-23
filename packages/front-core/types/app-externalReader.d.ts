// Fallback ambient declarations for apps (e.g. admin-front) that have no
// `actions/externalReader` / `application/actions/externalReader` module of
// their own. Several shared JsonSchema elements (`UserSelect`,
// `BankQuestionnaire`, ...) are cabinet-front-only features that import from
// these app-specific paths; cabinet-front's real module
// (`src/application/actions/externalReader.ts`) takes priority over these
// declarations wherever it actually resolves via path mapping.
declare module 'application/actions/externalReader' {
  type Dispatch = (action: unknown) => unknown;
  export function requestExternalData(requestData?: unknown): (dispatch: Dispatch) => Promise<unknown>;
}

declare module 'actions/externalReader' {
  type Dispatch = (action: unknown) => unknown;
  export function requestExternalData(requestData?: unknown): (dispatch: Dispatch) => Promise<unknown>;
}

declare module 'actions/documentTemplate' {
  type Dispatch = (action: unknown) => unknown;
  export function jsonSchemaInjection(payload: unknown): (dispatch: Dispatch) => unknown;
}

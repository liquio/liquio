// Fallback ambient declarations for apps (e.g. cabinet-front) that have no
// `actions/snippets` module of their own — the JsonSchema editor's snippet
// library (this codebase's schema-builder tooling) is admin-front-only
// functionality, but it lives in the shared `packages/front-core` and so
// needs to resolve for every app's tsconfig regardless of whether that app
// actually renders it. admin-front's real module
// (`src/application/actions/snippets.ts`) takes priority wherever it
// actually resolves via path mapping.
declare module 'actions/snippets' {
  type Dispatch = (action: unknown) => unknown;

  export function requestSnippets(): (dispatch: Dispatch) => Promise<unknown>;
  export function createSnippet(data: unknown): (dispatch: Dispatch) => Promise<unknown>;
  export function updateSnippet(id: string | number, data: unknown): (dispatch: Dispatch) => Promise<unknown>;
  export function deleteSnippet(id: string | number): (dispatch: Dispatch) => Promise<unknown>;
  export function importSnippets(file: File, force?: boolean): (dispatch: Dispatch) => Promise<unknown>;
  export function exportSnippets(body: unknown): (dispatch: Dispatch) => Promise<unknown>;
  export function getSnippetsGroups(): (dispatch: Dispatch) => Promise<unknown>;
  export function createSnippetsGroup(data: unknown): (dispatch: Dispatch) => Promise<unknown>;
  export function updateSnippetsGroup(id: string | number, data: unknown): (dispatch: Dispatch) => Promise<unknown>;
  export function deleteSnippetsGroup(id: string | number): (dispatch: Dispatch) => Promise<unknown>;
}

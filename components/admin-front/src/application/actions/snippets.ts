import * as api from 'services/api';

type Dispatch = (action: unknown) => unknown;

export const requestSnippets = () => (dispatch: Dispatch) =>
  api.get('snippets', 'REQUEST_SNIPPETS', dispatch).catch((error) => {
    console.error('Error fetching snippets:', error);
    return [];
  });

export const createSnippet = (data: unknown) => (dispatch: Dispatch) =>
  api.post('snippets', data, 'CREATE_SNIPPET', dispatch).catch((error) => {
    return error;
  });

export const updateSnippet = (id: string | number, data: unknown) => (dispatch: Dispatch) =>
  api.put(`snippets/${id}`, data, 'UPDATE_SNIPPET', dispatch).catch((error) => {
    return error;
  });

export const deleteSnippet = (id: string | number) => (dispatch: Dispatch) =>
  api.del(`snippets/${id}`, {}, 'DELETE_SNIPPET', dispatch).catch((error) => {
    return error;
  });

export const importSnippets =
  (file: File, force = false) =>
  (dispatch: Dispatch) =>
    api
      .upload(
        `snippets/import?isRewrite=${force}`,
        file,
        {},
        'IMPORT_SNIPPETS',
        dispatch,
      )
      .catch((error) => {
        return error;
      });

export const exportSnippets = (body: unknown) => (dispatch: Dispatch) =>
  api
    .post('snippets/export', body || {}, 'EXPORT_SNIPPETS', dispatch, body as {} | undefined)
    .catch((error) => {
      return error;
    });

export const getSnippetsGroups = () => (dispatch: Dispatch) =>
  api.get('snippet-groups', 'GET_SNIPPET_GROUPS', dispatch).catch((error) => {
    console.error('Error fetching snippet groups:', error);
    return [];
  });

export const createSnippetsGroup = (data: unknown) => (dispatch: Dispatch) =>
  api
    .post('snippet-groups', data, 'CREATE_SNIPPET_GROUP', dispatch)
    .catch((error) => {
      return error;
    });

export const updateSnippetsGroup = (id: string | number, data: unknown) => (dispatch: Dispatch) =>
  api
    .put(`snippet-groups/${id}`, data, 'CREATE_SNIPPET_GROUP', dispatch)
    .catch((error) => {
      return error;
    });

export const deleteSnippetsGroup = (id: string | number) => (dispatch: Dispatch) =>
  api
    .del(`snippet-groups/${id}`, {}, 'DELETE_SNIPPET_GROUP', dispatch)
    .catch((error) => {
      return error;
    });

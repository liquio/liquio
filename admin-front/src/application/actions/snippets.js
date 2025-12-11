import * as api from 'services/api';

export const requestSnippets = () => (dispatch) =>
  api.get('snippets', 'REQUEST_SNIPPETS', dispatch).catch((error) => {
    return error;
  });

export const createSnippet = (data) => (dispatch) =>
  api.post('snippets', data, 'CREATE_SNIPPET', dispatch).catch((error) => {
    return error;
  });

export const updateSnippet = (id, data) => (dispatch) =>
  api.put(`snippets/${id}`, data, 'UPDATE_SNIPPET', dispatch).catch((error) => {
    return error;
  });

export const deleteSnippet = (id) => (dispatch) =>
  api.del(`snippets/${id}`, {}, 'DELETE_SNIPPET', dispatch).catch((error) => {
    return error;
  });

export const importSnippets =
  (file, force = false) =>
  (dispatch) =>
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

export const exportSnippets = (body) => (dispatch) =>
  api
    .post('snippets/export', body || {}, 'EXPORT_SNIPPETS', dispatch, body)
    .catch((error) => {
      return error;
    });

export const getSnippetsGroups = () => (dispatch) =>
  api.get('snippet-groups', 'GET_SNIPPET_GROUPS', dispatch).catch((error) => {
    return error;
  });

export const createSnippetsGroup = (data) => (dispatch) =>
  api
    .post('snippet-groups', data, 'CREATE_SNIPPET_GROUP', dispatch)
    .catch((error) => {
      return error;
    });

export const updateSnippetsGroup = (id, data) => (dispatch) =>
  api
    .put(`snippet-groups/${id}`, data, 'CREATE_SNIPPET_GROUP', dispatch)
    .catch((error) => {
      return error;
    });

export const deleteSnippetsGroup = (id) => (dispatch) =>
  api
    .del(`snippet-groups/${id}`, {}, 'DELETE_SNIPPET_GROUP', dispatch)
    .catch((error) => {
      return error;
    });

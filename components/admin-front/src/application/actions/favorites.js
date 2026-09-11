import * as api from 'services/api';
import { addError } from 'actions/error';

export const getFavorites =
  ({ entity }) =>
  (dispatch) =>
    api.get(`favorites/${entity}`, 'GET_FAVORITES', dispatch).catch((error) => {
      addError('GetFavoritesError');
      return error;
    });

export const getFavoritesById =
  ({ entity, id }) =>
  (dispatch) =>
    api
      .get(`favorites/${entity}/${id}`, 'GET_FAVORITES_BY_ID', dispatch)
      .catch((error) => {
        addError('GetFavoritesError');
        return error;
      });

export const addFavorites =
  ({ entity, id, body }) =>
  (dispatch) =>
    api
      .post(`favorites/${entity}/${id}`, body || {}, 'ADD_FAVORITES', dispatch)
      .catch((error) => {
        addError('AddFavoritesError');
        return error;
      });

export const deleteFavorites =
  ({ entity, id }) =>
  (dispatch) =>
    api
      .del(`favorites/${entity}/${id}`, {}, 'DELETE_FAVORITES', dispatch)
      .catch((error) => {
        addError('DeleteFavoritesError');
        return error;
      });

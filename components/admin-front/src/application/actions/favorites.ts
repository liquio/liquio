import * as api from 'services/api';
import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

export const getFavorites =
  ({ entity }: { entity: string }) =>
  (dispatch: Dispatch) =>
    api.get(`favorites/${entity}`, 'GET_FAVORITES', dispatch).catch((error) => {
      addError('GetFavoritesError');
      return error;
    });

export const getFavoritesById =
  ({ entity, id }: { entity: string; id: string | number }) =>
  (dispatch: Dispatch) =>
    api
      .get(`favorites/${entity}/${id}`, 'GET_FAVORITES_BY_ID', dispatch)
      .catch((error) => {
        addError('GetFavoritesError');
        return error;
      });

export const addFavorites =
  ({ entity, id, body }: { entity: string; id: string | number; body?: unknown }) =>
  (dispatch: Dispatch) =>
    api
      .post(`favorites/${entity}/${id}`, body || {}, 'ADD_FAVORITES', dispatch)
      .catch((error) => {
        addError('AddFavoritesError');
        return error;
      });

export const deleteFavorites =
  ({ entity, id }: { entity: string; id: string | number }) =>
  (dispatch: Dispatch) =>
    api
      .del(`favorites/${entity}/${id}`, {}, 'DELETE_FAVORITES', dispatch)
      .catch((error) => {
        addError('DeleteFavoritesError');
        return error;
      });

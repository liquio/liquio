import * as api from 'services/api';

type Dispatch = (action: unknown) => unknown;

export const getStripe =
  (body: unknown = {}) =>
  (dispatch: Dispatch) =>
    api.post('kyc/stripe', body, 'GET_STRIPE', dispatch).catch((error) => {
      return new Error(error);
    });

export const getStripeId = (id: string | number) => (dispatch: Dispatch) =>
  api.get(`kyc/stripe/${id}`, 'GET_STRIPE_ID', dispatch).catch((error) => {
    return new Error(error);
  });

export const putStripe = (id: string | number) => (dispatch: Dispatch) =>
  api.put(`kyc/stripe/${id}`, {}, 'PUT_STRIPE', dispatch).catch((error) => {
    return new Error(error);
  });

import * as api from 'services/api';

export const getStripe =
  (body = {}) =>
  (dispatch) =>
    api.post('kyc/stripe', body, 'GET_STRIPE', dispatch).catch((error) => {
      return new Error(error);
    });

export const getStripeId = (id) => (dispatch) =>
  api.get(`kyc/stripe/${id}`, 'GET_STRIPE_ID', dispatch).catch((error) => {
    return new Error(error);
  });

export const putStripe = (id) => (dispatch) =>
  api.put(`kyc/stripe/${id}`, {}, 'PUT_STRIPE', dispatch).catch((error) => {
    return new Error(error);
  });

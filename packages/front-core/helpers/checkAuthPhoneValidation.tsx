import React from 'react';
import store from 'store';
import theme from 'theme';

import ValidatePhoneMessage from 'components/ValidatePhoneMessage';

const ON_MESSAGE_ADD = 'ON_MESSAGE_ADD';
const ON_ERROR_CLOSE = 'ON_ERROR_CLOSE';

const SNACKBAR_ID = 'SNACKBAR_MESSAGE';

interface CheckAuthPhoneValidationParams {
  phone?: string | null;
  valid?: { phone?: boolean | null } | null;
}

export default (params: CheckAuthPhoneValidationParams | null | undefined): void => {
  const { phone, valid } = params || {};
  const { phone: phoneValid } = valid || {};
  const { dispatch } = store;
  const { skipPhoneVerification } = theme as { skipPhoneVerification?: boolean };

  if (!phone || phoneValid || skipPhoneVerification) {
    return;
  }

  const handleClose = () => dispatch({ type: ON_ERROR_CLOSE, payload: SNACKBAR_ID });

  const action = () =>
    dispatch({
      type: ON_MESSAGE_ADD,
      payload: {
        handleClose,
        id: SNACKBAR_ID,
        variant: 'default',
        content: <ValidatePhoneMessage handleClose={handleClose} />
      }
    });

  setTimeout(action, 2000);
};

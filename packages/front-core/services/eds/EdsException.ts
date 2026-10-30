import * as Sentry from '@sentry/browser';

const FILE_SIGNER_TYPE = 'file';

export default class EdsException extends Error {
  constructor(
    errorText: string,
    params: Record<string, unknown> = {},
    signerType: string = FILE_SIGNER_TYPE,
  ) {
    super(errorText);

    Sentry.withScope((scope) => {
      scope.setTag('signer_type', signerType);
      scope.setLevel('warning');

      Object.keys(params).forEach((paramKey) => {
        scope.setExtra(paramKey, params[paramKey]);
      });
    });
  }
}

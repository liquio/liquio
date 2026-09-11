import { translate, Translate } from 'react-translate';

import localizeError from '../helpers/localizeError';

interface SchemaError {
  keyword?: string;
  message?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

interface EJVErrorProps {
  t: Translate;
  error?: SchemaError | null;
}

const EJVError = ({ t, error }: EJVErrorProps): string | null => (error ? localizeError(t)(error).message ?? null : null);

EJVError.defaultProps = {
  t: () => '',
  error: null
};

export default translate('EJV')(EJVError);

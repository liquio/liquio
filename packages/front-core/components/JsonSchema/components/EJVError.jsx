import { translate } from 'react-translate';
import PropTypes from 'prop-types';

import localizeError from '../helpers/localizeError';

const EJVError = ({ t, error }) => (error ? localizeError(t)(error).message : null);

EJVError.propTypes = {
  t: PropTypes.func.isRequired,
  error: PropTypes.object
};

EJVError.defaultProps = {
  t: () => '',
  error: null
};

export default translate('EJV')(EJVError);

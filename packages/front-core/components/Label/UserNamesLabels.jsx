import PropTypes from 'prop-types';

import { getShortNameFromString } from 'helpers/getUserShortName';

const UserNamesLabels = ({ userNames }) =>
  userNames.map((userName) => getShortNameFromString(userName)).join(', ');

UserNamesLabels.propTypes = {
  userNames: PropTypes.array,
};

UserNamesLabels.defaultProps = {
  userNames: [],
};

export default UserNamesLabels;

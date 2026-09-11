import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import userName from 'helpers/userName';

const UserNameLabel = ({ users, id }) => {
  const user = (users || {})[id];
  return user ? userName(user) : id;
};

UserNameLabel.propTypes = {
  users: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
};

export default connect(({ users }) => ({ users }))(UserNameLabel);

import { connect } from 'react-redux';

import userName from 'helpers/userName';

interface UserRecord {
  isLegal?: boolean;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  companyName?: string;
  [key: string]: unknown;
}

interface UserNameLabelProps {
  users: Record<string, UserRecord>;
  id: string;
}

const UserNameLabel = ({ users, id }: UserNameLabelProps) => {
  const user = (users || {})[id];
  return user ? userName(user) : id;
};

export default connect(({ users }: { users: Record<string, UserRecord> }) => ({ users }))(
  UserNameLabel
);

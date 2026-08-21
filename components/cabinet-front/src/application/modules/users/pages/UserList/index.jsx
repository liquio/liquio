import React from 'react';
import Fuse from 'fuse.js';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import ModulePage from 'components/ModulePage';
import Layout from 'modules/users/pages/UserList/components/Layout';
import { requestUnitInfo, addUnitUser, deleteUnitUser } from 'application/actions/users';
import userHeadUnitList from 'helpers/userHeadUnitList';

const UserList = ({ actions, title, location, userUnits }) => {
  const [search, setSearch] = React.useState('');
  const [unitId, setUnitId] = React.useState(null);
  const [users, setUsers] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const unitList = userHeadUnitList(userUnits).filter(({ basedOn }) => basedOn?.length);

  const loadUserList = async () => {
    if (!unitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setUsers(null);

    const data = await actions.requestUnitInfo(unitId);
    setUsers(data && [].concat(data.membersUsers, data.requestedMembers).filter(Boolean));
    setLoading(false);
  };

  React.useEffect(() => {
    if (!unitId && unitList && unitList.length) {
      setUnitId(unitList[0].id);
    }
  });

  React.useEffect(() => {
    loadUserList();
  }, [unitId]);

  const fuse = new Fuse(users || [], {
    includeScore: true,
    minMatchCharLength: 2,
    keys: ['email', 'ipn', 'firstName', 'lastName', 'middleName', 'phone']
  });

  const userList = search
    ? fuse
        .search(search)
        .filter(({ score }) => score < 0.5)
        .map(({ item }) => item)
    : users;

  return (
    <Layout
      data={userList}
      unitId={unitId}
      setUnitId={(newUnitId) => {
        setUnitId(newUnitId);
        setSearch('');
      }}
      title={title}
      loading={loading}
      location={location}
      unitList={unitList}
      search={search}
      onSearchChange={setSearch}
      load={loadUserList}
      handleAddUnitUser={(user) => actions.addUnitUser(unitId, user)}
      handleDelete={(user) => actions.deleteUnitUser(unitId, user)}
    />
  );
};

class UserListPage extends ModulePage {
  render() {
    return <UserList {...this.props} />;
  }
}

const mapState = ({ auth: { userUnits } }) => ({
  userUnits
});

const mapDispatch = (dispatch) => ({
  actions: {
    requestUnitInfo: bindActionCreators(requestUnitInfo, dispatch),
    addUnitUser: bindActionCreators(addUnitUser, dispatch),
    deleteUnitUser: bindActionCreators(deleteUnitUser, dispatch)
  }
});

export default connect(mapState, mapDispatch)(UserListPage);

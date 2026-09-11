import React from 'react';
import Fuse from 'fuse.js';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import ModulePage from 'components/ModulePage';
import LayoutRaw from 'modules/users/pages/UserList/components/Layout';
import { requestUnitInfo, addUnitUser, deleteUnitUser } from 'application/actions/users';
import userHeadUnitList from 'helpers/userHeadUnitList';

const Layout = LayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UserRecord {
  userId?: string | number;
  [key: string]: unknown;
}

interface Unit {
  id: number;
  head?: boolean;
  basedOn?: number[];
  [key: string]: unknown;
}

interface UserListProps {
  actions: {
    requestUnitInfo: (unitId: string | number) => Promise<{ membersUsers?: UserRecord[]; requestedMembers?: UserRecord[] }>;
    addUnitUser: (unitId: string | number, user: unknown) => Promise<unknown>;
    deleteUnitUser: (unitId: string | number, user: { ipn?: string; userId?: string | number }) => Promise<unknown>;
  };
  title: string;
  location: unknown;
  userUnits: Unit[];
}

const UserList = ({ actions, title, location, userUnits }: UserListProps) => {
  const [search, setSearch] = React.useState('');
  const [unitId, setUnitId] = React.useState<number | null>(null);
  const [users, setUsers] = React.useState<UserRecord[] | null>(null);
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
    setUsers(data && ([] as (UserRecord | undefined)[]).concat(data.membersUsers, data.requestedMembers).filter(Boolean) as UserRecord[]);
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
        .filter(({ score }) => (score as number) < 0.5)
        .map(({ item }) => item)
    : users;

  return (
    <Layout
      data={userList}
      unitId={unitId}
      setUnitId={(newUnitId: number) => {
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
      handleAddUnitUser={(user: unknown) => actions.addUnitUser(unitId as number, user)}
      handleDelete={(user: { ipn?: string; userId?: string | number }) => actions.deleteUnitUser(unitId as number, user)}
    />
  );
};

class UserListPage extends ModulePage {
  render() {
    return <UserList {...(this.props as unknown as UserListProps)} />;
  }
}

interface UserListState {
  auth: { userUnits: Unit[] };
}

const mapState = ({ auth: { userUnits } }: UserListState) => ({
  userUnits
});

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    requestUnitInfo: bindActionCreators(requestUnitInfo, dispatch),
    addUnitUser: bindActionCreators(addUnitUser, dispatch),
    deleteUnitUser: bindActionCreators(deleteUnitUser, dispatch)
  }
});

export default connect(mapState, mapDispatch)(UserListPage as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import objectPath from 'object-path';
import evaluate from 'helpers/evaluate';
import { requestExternalData } from 'application/actions/externalReader';
import { DataTableStated as DataTableStatedUntyped } from 'components/DataTable';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { translate, Translate } from 'react-translate';
import Preloader from 'components/Preloader';

interface SelectedUser {
  userId: string | number;
  ipn?: string;
  fullName?: string;
  [key: string]: unknown;
}

interface UserSelectProps {
  multiple: string;
  service?: string;
  method?: string;
  filters: Record<string, string>;
  actions: ReturnType<typeof mapDispatchToProps>['actions'];
  rootDocument: { data: Record<string, unknown> };
  required?: boolean;
  error?: unknown;
  t: Translate;
  onChange?: (value: unknown) => void;
  value?: Array<{ id: unknown }>;
}

const UserSelect = (props: UserSelectProps) => {
  // Read at call time rather than module scope: `components/DataTable`'s
  // index.tsx re-exports `DataTableStated` from a file that imports back
  // from the same barrel, so it's circularly self-referencing (see
  // TYPESCRIPT.md's DataTable batch notes) — a module-top-level read can
  // run while that module is still mid-evaluation.
  const DataTableStated = DataTableStatedUntyped as unknown as React.ComponentType<Record<string, unknown>>;
  const {
    multiple,
    service,
    method,
    filters,
    actions,
    rootDocument,
    required,
    error,
    t,
    onChange,
    value,
  } = props;

  const [userData, setUserData] = React.useState<SelectedUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [rowsSelected, setRowsSelected] = React.useState<unknown[]>(
    (value && Array.isArray(userData) && value.map((user) => user.id)) || [],
  );

  const getFilters = React.useCallback(() => {
    const filter: Record<string, unknown> = {};
    Object.keys(filters).forEach((name) => {
      const filterValuePath = filters[name];

      let filterValue = evaluate(filterValuePath, rootDocument.data);

      if (filterValue instanceof Error) {
        filterValue = objectPath.get(rootDocument.data, filterValuePath);
      }

      if (!filterValue) {
        filter[name] = filterValuePath;
        return;
      }

      filter[name] = filterValue;
    });
    return filter;
  }, [filters, rootDocument.data]);

  const getUserList = React.useCallback(async () => {
    if ((!service && !method) || userData.length) return;
    setLoading(true);
    const result = await actions.requestExternalData({
      service,
      method,
      filters: getFilters(),
    });

    if (Array.isArray(result)) {
      setUserData(
        result.map((data) => ({
          ...data,
          fullName: [data?.lastName, data?.firstName, data?.middleName].filter((v) => v && v !== 'null').join(' '),
          id: data?.userId,
        })),
      );
    }
    setLoading(false);
  }, [service, method, actions, userData, getFilters]);

  React.useEffect(() => {
    getUserList();
  }, [getUserList]);

  const isMultiple = React.useMemo(() => {
    const multipleEval = evaluate(multiple, rootDocument.data);
    return multipleEval;
  }, [multiple, rootDocument.data]);

  const onRowsSelect = React.useCallback(
    (selected: unknown[]) => {
      let selectedUsers = selected;
      if (!isMultiple && selectedUsers.length > 1) {
        selectedUsers = [selectedUsers[selectedUsers.length - 1]];
      }
      setRowsSelected(selectedUsers);
      onChange &&
        onChange(
          selectedUsers.map((userId) => {
            const userInfo = userData.find((user) => user.userId === userId);
            return {
              ipn: userInfo?.ipn,
              fullName: userInfo?.fullName,
              id: userId,
            };
          }),
        );
    },
    [onChange, userData, isMultiple],
  );

  return (
    <>
      {loading ? (
        <Preloader />
      ) : (
        <ElementContainer required={required} error={error}>
          <DataTableStated
            checkable={true}
            data={userData}
            columns={[
              {
                id: 'fullName',
                name: t('Name'),
                render: (value: unknown) => value,
              },
              {
                id: 'ipn',
                name: t('Ipn'),
                render: (value: unknown) => value,
              },
            ]}
            actions={{
              onRowsSelect,
            }}
            controls={{
              pagination: true,
              toolbar: true,
              search: true,
              header: true,
              refresh: false,
              switchView: false,
            }}
            rowsSelected={rowsSelected}
            searchPlaceholder={t('searchPlaceholder')}
            multiple={isMultiple}
          />
        </ElementContainer>
      )}
    </>
  );
};

const mapsStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    // bindActionCreators's base `redux` types don't collapse curried thunk
    // action creators to their post-dispatch return type; cast to match what
    // actually happens at runtime (dispatch invokes the thunk and returns its Promise).
    requestExternalData: bindActionCreators(requestExternalData, dispatch) as unknown as (requestData?: unknown) => Promise<unknown>,
  },
});

const translated = translate('UserSelect')(UserSelect);
export default connect(mapsStateToProps, mapDispatchToProps)(translated);

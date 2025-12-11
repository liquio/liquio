import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import objectPath from 'object-path';
import evaluate from 'helpers/evaluate';
import { requestExternalData } from 'application/actions/externalReader';
import { DataTableStated } from 'components/DataTable';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { translate } from 'react-translate';
import Preloader from 'components/Preloader';

const UserSelect = (props) => {
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

  const [userData, setUserData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [rowsSelected, setRowsSelected] = React.useState(
    (value && Array.isArray(userData) && value.map((user) => user.id)) || [],
  );

  const getFilters = React.useCallback(() => {
    const filter = {};
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
          fullName: `${data?.lastName} ${data?.firstName} ${data?.middleName}`,
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
    let multipleEval = evaluate(multiple, rootDocument.data);
    return multipleEval;
  }, [multiple, rootDocument.data]);

  const onRowsSelect = React.useCallback(
    (selectedUsers) => {
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
                render: (value) => value,
              },
              {
                id: 'ipn',
                name: t('Ipn'),
                render: (value) => value,
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

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestExternalData: bindActionCreators(requestExternalData, dispatch),
  },
});

const translated = translate('UserSelect')(UserSelect);
export default connect(mapsStateToProps, mapDispatchToProps)(translated);

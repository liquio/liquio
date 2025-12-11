import React, { useEffect, useState } from 'react';
import { useTranslate } from 'react-translate';

import DataTable from 'components/DataTable';
import useTable from 'services/dataTable/useTable';

import endPoint from 'application/endPoints/registryKeyList';

export const RegisterKeyTable = ({
  busy,
  setBusy,
  register,
  selectedKeys,
  setSelectedKeys,
}) => {
  const t = useTranslate('RegistryListAdminPage');
  const tableProps = useTable(
    { ...endPoint, autoLoad: true },
    { filters: { registerId: register.id }, rowsPerPage: 10000 },
  );

  const [search, setSearch] = useState('');
  const [filteredData, setFilteredData] = useState(tableProps.data);

  useEffect(() => {
    if (!search || !tableProps.data) {
      return setFilteredData(tableProps.data);
    }

    setFilteredData(
      tableProps.data.filter((row) => {
        return [row.id, row.name, row.description].map(String).some((field) => {
          return field.toLocaleLowerCase().includes(search.toLocaleLowerCase());
        });
      }),
    );
  }, [search, tableProps.data]);

  useEffect(() => {
    setBusy(tableProps.loading);
  }, [setBusy, tableProps.loading]);

  useEffect(() => {
    tableProps.data && setSelectedKeys(tableProps.data.map(({ id }) => id));
  }, [setSelectedKeys, tableProps.data]);

  return (
    <DataTable
      {...tableProps}
      data={filteredData}
      search={search}
      actions={{
        ...tableProps.actions,
        onRowsSelect: busy ? null : setSelectedKeys,
        onSearchChange: busy ? null : setSearch,
      }}
      controls={{
        pagination: false,
        toolbar: true,
        search: true,
        header: false,
        refresh: false,
        customizateColumns: false,
        bottomPagination: false,
      }}
      rowsSelected={selectedKeys}
      updateOnChangeSearch={false}
      checkable={tableProps.data && tableProps.data.length > 1}
      darkTheme={true}
      columns={[
        {
          id: 'id',
          align: 'left',
          sortable: false,
          name: t('KeyId'),
        },
        {
          id: 'name',
          align: 'left',
          sortable: false,
          name: t('KeyName'),
        },
        {
          id: 'description',
          align: 'left',
          sortable: false,
          name: t('KeyDescription'),
        },
      ]}
    />
  );
};

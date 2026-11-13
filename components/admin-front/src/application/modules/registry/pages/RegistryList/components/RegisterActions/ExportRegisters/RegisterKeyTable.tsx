import React, { useEffect, useState } from 'react';
import { useTranslate } from 'react-translate';

import DataTableRaw from 'components/DataTable';
import useTable from 'services/dataTable/useTable';

import endPoint from 'application/endPoints/registryKeyList';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface RegisterKeyRow {
  id: string;
  name?: string;
  description?: string;
}

interface RegisterKeyTableProps {
  busy: boolean;
  setBusy: (busy: boolean) => void;
  register: { id: string };
  selectedKeys: string[];
  setSelectedKeys: (keys: string[]) => void;
}

export const RegisterKeyTable = ({
  busy,
  setBusy,
  register,
  selectedKeys,
  setSelectedKeys,
}: RegisterKeyTableProps) => {
  const t = useTranslate('RegistryListAdminPage');
  const tableProps = useTable(
    { ...endPoint, autoLoad: true } as never,
    { filters: { registerId: register.id }, rowsPerPage: 10000 } as never,
  ) as unknown as { data: RegisterKeyRow[]; loading: boolean; actions: Record<string, unknown>; [key: string]: unknown };

  const [search, setSearch] = useState('');
  const [filteredData, setFilteredData] = useState(tableProps.data);

  useEffect(() => {
    if (!search || !tableProps.data) {
      setFilteredData(tableProps.data);
      return;
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

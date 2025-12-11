import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';

import DataTable from 'components/DataTable';

const DataTableStated = ({
  data,
  isIncreasing,
  reserIsIncreasing,
  controls,
  actions,
  ...dataTableProps
}) => {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const getFilteredData = () => {
    const filtereList = (data || []).filter(Boolean).filter((item) => {
      const fields = Object.values(item);
      const compare = (val) =>
        (val + '').toUpperCase().indexOf((search || '').toUpperCase()) !== -1;
      const exists = fields.find(compare);
      return exists;
    });

    return filtereList;
  };

  const onChangePage = (page) => {
    setPage(page + 1);
    reserIsIncreasing && reserIsIncreasing();
  };

  const getData = () => {
    const firstIndex = (page - 1) * rowsPerPage;
    const lastIndex = page * rowsPerPage;

    const list = getFilteredData();

    isIncreasing && page !== 1 && setPage(1);

    if (list && (list || []).length <= firstIndex) {
      const start = firstIndex - rowsPerPage;
      return {
        list: list.slice(start < 0 ? 0 : start, lastIndex - rowsPerPage),
        count: list && list.length
      };
    }

    return {
      list: list && list.slice(firstIndex, lastIndex),
      count: list && list.length
    };
  };

  const { list, count } = getData();

  return (
    <DataTable
      {...dataTableProps}
      actions={{
        ...actions,
        onChangePage,
        onSearchChange: setSearch,
        onChangeRowsPerPage: setRowsPerPage
      }}
      data={list}
      page={page}
      search={search}
      count={count}
      rowsPerPage={rowsPerPage}
      controls={controls}
    />
  );
};

DataTableStated.propTypes = {
  controls: PropTypes.object,
  actions: PropTypes.object,
  data: PropTypes.array,
  reserIsIncreasing: PropTypes.func,
  isIncreasing: PropTypes.bool
};

DataTableStated.defaultProps = {
  actions: {},
  data: [],
  reserIsIncreasing: null,
  isIncreasing: false,
  controls: {
    pagination: false,
    toolbar: true,
    search: true,
    header: true,
    refresh: true,
    switchView: true
  }
};

export default translate('DataTableStated')(DataTableStated);

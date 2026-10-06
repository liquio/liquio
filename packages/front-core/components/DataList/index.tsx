import React from 'react';

import Preloader from 'components/Preloader';
import Pagination from 'components/DataList/Pagination';

interface DataListProps {
  data: unknown[] | null;
  page?: number;
  count: number;
  rowsPerPage?: number;
  ItemTemplate: React.ComponentType<Record<string, unknown>>;
  controls?: { pagination?: boolean };
  actions?: {
    onChangePage?: (page: number) => void;
    onChangeRowsPerPage?: (size: number) => void;
    [key: string]: unknown;
  };
  classNamePreloader?: string;
}

const DataList = ({
  data = null,
  page = 1,
  count,
  rowsPerPage = 10,
  ItemTemplate,
  controls = { pagination: false },
  actions = {},
  classNamePreloader = ''
}: DataListProps) => {
  if (data === null) {
    return <Preloader {...({ className: classNamePreloader } as unknown as Record<string, unknown>)} />;
  }

  return (
    <div aria-live="polite">
      {data.map((row, index) => (
        <ItemTemplate {...(row as Record<string, unknown>)} key={index} actions={actions} />
      ))}
      {controls.pagination ? (
        <Pagination
          page={page}
          count={count}
          rowsPerPage={rowsPerPage}
          onChangePage={actions.onChangePage}
          onChangeRowsPerPage={actions.onChangeRowsPerPage}
        />
      ) : null}
    </div>
  );
};

export default DataList;

import React from 'react';
import PropTypes from 'prop-types';

import Preloader from 'components/Preloader';
import Pagination from 'components/DataList/Pagination';

const DataList = ({
  data,
  page,
  count,
  rowsPerPage,
  ItemTemplate,
  controls,
  actions,
  classNamePreloader
}) => {
  if (data === null) {
    return <Preloader className={classNamePreloader} />;
  }

  return (
    <div aria-live="polite">
      {data.map((row, index) => (
        <ItemTemplate {...row} key={index} actions={actions} />
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

DataList.propTypes = {
  data: PropTypes.array,
  ItemTemplate: PropTypes.oneOfType([PropTypes.instanceOf(React.Component), PropTypes.func])
    .isRequired,
  page: PropTypes.number,
  count: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number,
  actions: PropTypes.object,
  controls: PropTypes.object,
  classNamePreloader: PropTypes.string
};

DataList.defaultProps = {
  data: null,
  page: 1,
  rowsPerPage: 10,
  actions: {},
  controls: {
    pagination: false
  },
  classNamePreloader: ''
};

export default DataList;

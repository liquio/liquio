import React from 'react';
import PropTypes from 'prop-types';
import { PagingState, CustomPaging } from '@devexpress/dx-react-grid';
import { Plugin } from '@devexpress/dx-react-core';

const propTypes = {
  currentPage: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  onCurrentPageChange: PropTypes.func.isRequired,
  onPageSizeChange: PropTypes.func.isRequired
};

class RemotePaginator extends React.Component {
  render() {
    const { currentPage, pageSize, totalCount, onCurrentPageChange, onPageSizeChange } = this.props;

    return (
      <Plugin>
        <PagingState
          currentPage={currentPage}
          onCurrentPageChange={onCurrentPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
        <CustomPaging totalCount={totalCount} />
      </Plugin>
    );
  }
}

RemotePaginator.propTypes = propTypes;

export default RemotePaginator;

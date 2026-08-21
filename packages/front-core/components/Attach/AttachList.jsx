import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import {
  ImageList,
  Table,
  TableCell,
  TableRow,
  TablePagination,
  TableFooter,
  IconButton,
  Typography
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { List, Apps } from '@mui/icons-material';
import cx from 'classnames';

import setComponentsId from 'helpers/setComponentsId';
import customInputStyle from 'variables/styles/customInputStyle';
import tableStyle from 'variables/styles/tableStyle';
import attachStyle from 'variables/styles/attaches';
import claimListStyles from 'variables/styles/claimList';
import Attach from './Attach';
import AttachTable from './AttachTable';

const styles = {
  ...customInputStyle,
  ...tableStyle,
  ...claimListStyles,
  ...attachStyle
};

class AttachList extends Component {
  state = {
    page: 0,
    start: 0,
    count: this.props.attaches.length > 12 ? 10 : 12,
    tablePreview: this.props.attaches.length > 12
  };

  pagination = (e, page) => {
    const { count } = this.state;
    const start = page * count;
    this.setState({ start, page });
  };

  changeCount = ({ target: { value } }) => this.setState({ start: 0, page: 0, count: value });

  toogleDisplay = () => {
    const { tablePreview } = this.state;
    this.setState({
      tablePreview: !tablePreview,
      page: 0,
      count: tablePreview ? 12 : 10,
      start: 0
    });
  };

  handleDelete = (attach) => () => {
    const { handleDelete, attaches } = this.props;
    const index = attaches.indexOf(attach);
    handleDelete(index)(attach);
  };

  renderTitle = () => {
    const { needTitle, classes, t } = this.props;
    const { tablePreview } = this.state;
    return (
      <Typography variant="h5" component="p" className={classes.subTitle}>
        <span className={classes.title}>{needTitle && t('TITLE')}</span>
        <IconButton
          color="inherit"
          onClick={this.toogleDisplay}
          className={classes.menuButton}
          size="large"
        >
          {tablePreview ? <Apps /> : <List />}
        </IconButton>
      </Typography>
    );
  };

  render() {
    const {
      cols,
      attaches,
      handleDelete,
      handleDownload,
      requestPreview,
      setId,
      classes,
      alwaysPreview,
      t
    } = this.props;
    const attachSetId = (index) => (elmentName) =>
      setId(`${index ? `${index + 1}-` : ''}${elmentName}`);
    const { start, count, page, tablePreview } = this.state;
    const filterAttaches = attaches.filter((item) => !!item && Object.keys(item).length > 0);
    const total = filterAttaches.length;
    const showPagination = count < total && total > 0;
    const list = filterAttaches.slice(start, start + count);
    list.meta = { pagination: { total } };
    if (total === 0) {
      return null;
    }
    if (tablePreview) {
      return (
        <Fragment>
          {this.renderTitle()}
          <AttachTable
            classes={classes}
            list={list}
            setId={attachSetId('table')}
            handleDownload={handleDownload}
            requestPreview={requestPreview}
            handleDelete={handleDelete && this.handleDelete}
            pagination={this.pagination}
            changeCount={this.changeCount}
            dataSource={{ ...this.state }}
          />
        </Fragment>
      );
    }
    return (
      <Fragment>
        {this.renderTitle()}
        <ImageList cols={cols || 4} id={attachSetId()('list')} className={classes.attachList}>
          {list.map((attach, index) => (
            <Attach
              setId={attachSetId(index)}
              alwaysPreview={alwaysPreview}
              key={`attach-${attach.fileName}${index}`}
              handleDelete={handleDelete && handleDelete(index)}
              handleDownload={handleDownload && handleDownload(attach)}
              requestPreview={requestPreview && requestPreview(attach)}
              {...attach}
            />
          ))}
        </ImageList>
        <Table className={cx(classes.table, classes.mobileBlock)} id={setId('table')}>
          <TableFooter id={setId('table-footer')}>
            <TableRow id={setId('table-footer-row')}>
              {showPagination && (
                <TablePagination
                  id={setId('pagination')}
                  className={classes.pagination}
                  count={total}
                  onPageChange={this.pagination}
                  rowsPerPage={count}
                  labelRowsPerPage={t('COUNT')}
                  labelDisplayedRows={({ from, to }) => t('DISPLAYED', { from, to, total })}
                  rowsPerPageOptions={[12, 16, 20]}
                  onRowsPerPageChange={this.changeCount}
                  page={page}
                  SelectProps={{ className: classes.pagSelect }}
                  backIconButtonProps={{ className: classes.pagButton }}
                  nextIconButtonProps={{ className: classes.pagButton }}
                />
              )}
              {!showPagination && (
                <TableCell
                  className={cx(classes.pagination, classes.totalCount)}
                  id={setId('totalCount')}
                >
                  {t('TOTAL', { total })}
                </TableCell>
              )}
            </TableRow>
          </TableFooter>
        </Table>
      </Fragment>
    );
  }
}

AttachList.propTypes = {
  setId: PropTypes.func,
  cols: PropTypes.number,
  attaches: PropTypes.array,
  handleDelete: PropTypes.func,
  handleDownload: PropTypes.func,
  requestPreview: PropTypes.func,
  classes: PropTypes.object.isRequired,
  alwaysPreview: PropTypes.bool,
  needTitle: PropTypes.bool,
  t: PropTypes.func.isRequired
};

AttachList.defaultProps = {
  setId: setComponentsId('attachList'),
  cols: null,
  attaches: [],
  handleDelete: undefined,
  handleDownload: undefined,
  requestPreview: undefined,
  alwaysPreview: true,
  needTitle: false
};

export default withStyles(styles)(translate('Attach')(AttachList));

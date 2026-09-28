import React, { Component, Fragment } from 'react';
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

interface AttachItem {
  fileName?: string;
  [key: string]: unknown;
}

interface AttachListProps {
  setId?: (elementName: string) => string;
  cols?: number | null;
  attaches?: AttachItem[];
  handleDelete?: (index: number) => (attach: AttachItem) => void;
  handleDownload?: (attach: AttachItem) => () => Promise<unknown>;
  requestPreview?: (attach: AttachItem) => (...args: unknown[]) => unknown;
  classes: Record<string, string>;
  alwaysPreview?: boolean;
  needTitle?: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
}

interface AttachListState {
  page: number;
  start: number;
  count: number;
  tablePreview: boolean;
}

class AttachList extends Component<AttachListProps, AttachListState> {
  static defaultProps: Partial<AttachListProps> = {
    setId: setComponentsId('attachList'),
    cols: null,
    attaches: [],
    handleDelete: undefined,
    handleDownload: undefined,
    requestPreview: undefined,
    alwaysPreview: true,
    needTitle: false
  };

  state: AttachListState = {
    page: 0,
    start: 0,
    count: (this.props.attaches as AttachItem[]).length > 12 ? 10 : 12,
    tablePreview: (this.props.attaches as AttachItem[]).length > 12
  };

  pagination = (e: unknown, page: number) => {
    const { count } = this.state;
    const start = page * count;
    this.setState({ start, page });
  };

  changeCount = ({ target: { value } }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    this.setState({ start: 0, page: 0, count: value as unknown as number });

  toogleDisplay = () => {
    const { tablePreview } = this.state;
    this.setState({
      tablePreview: !tablePreview,
      page: 0,
      count: tablePreview ? 12 : 10,
      start: 0
    });
  };

  handleDelete = (attach: AttachItem) => () => {
    const { handleDelete, attaches } = this.props;
    const index = (attaches as AttachItem[]).indexOf(attach);
    handleDelete!(index)(attach);
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
    const attachSetId = (index?: number | string) => (elmentName: string) =>
      setId!(`${index ? `${(index as number) + 1}-` : ''}${elmentName}`);
    const { start, count, page, tablePreview } = this.state;
    const filterAttaches = (attaches as AttachItem[]).filter(
      (item) => !!item && Object.keys(item).length > 0
    );
    const total = filterAttaches.length;
    const showPagination = count < total && total > 0;
    const list = filterAttaches.slice(start, start + count) as AttachItem[] & {
      meta?: { pagination: { total: number } };
    };
    list.meta = { pagination: { total } };
    if (total === 0) {
      return null;
    }
    if (tablePreview) {
      return (
        <Fragment>
          {this.renderTitle()}
          <AttachTable
            {...({
              classes,
              list,
              setId: attachSetId('table'),
              handleDownload,
              requestPreview,
              handleDelete: handleDelete && this.handleDelete,
              pagination: this.pagination,
              changeCount: this.changeCount,
              dataSource: { ...this.state }
            } as unknown as Record<string, unknown>)}
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
              key={`attach-${attach.fileName}${index}`}
              {...({
                setId: attachSetId(index),
                alwaysPreview,
                handleDelete: handleDelete && handleDelete(index),
                handleDownload: handleDownload && handleDownload(attach),
                requestPreview: requestPreview && requestPreview(attach),
                ...attach
              } as unknown as Record<string, unknown>)}
            />
          ))}
        </ImageList>
        <Table className={cx(classes.table, classes.mobileBlock)} id={setId!('table')}>
          <TableFooter id={setId!('table-footer')}>
            <TableRow id={setId!('table-footer-row')}>
              {showPagination && (
                <TablePagination
                  id={setId!('pagination')}
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
                  id={setId!('totalCount')}
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

export default withStyles(styles as never)(
  translate('Attach')(AttachList as never) as never
) as unknown as React.ComponentType<Record<string, unknown>>;

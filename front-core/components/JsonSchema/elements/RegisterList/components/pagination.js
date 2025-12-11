/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { useTranslate } from 'react-translate';
import _ from 'lodash';
import classNames from 'classnames';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardTabIcon from '@mui/icons-material/KeyboardTab';
import ProgressLine from 'components/Preloader/ProgressLine';
import StringElement from 'components/JsonSchema/elements/StringElement';
import DataGridPagination from 'components/DataGridPremium/components/Pagination';
import theme from 'theme';

const styles = (theme) => ({
  contentWrapper: {
    maxWidth: 827,
  },
  selectedName: {
    fontSize: '28px',
    lineHeight: '32px',
    marginLeft: 20,
  },
  selectedNameWrapper: {
    marginBottom: 20,
    marginTop: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    [theme.breakpoints.down('md')]: {
      marginTop: 0,
    },
  },
  root: {
    margin: 0,
    marginBottom: 20,
  },
  rootTab: {
    margin: 0,
    padding: 0,
    marginRight: 20,
  },
  actionsWrapper: {
    borderTop: '2px solid #000',
    paddingTop: 15,
    marginTop: 15,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    [theme.breakpoints.down('md')]: {
      display: 'block',
      textAlign: 'center',
    },
  },
  perPageWrapper: {
    display: 'flex',
    [theme.breakpoints.down('md')]: {
      justifyContent: 'center',
    },
  },
  perPageitem: {
    color: '#000',
    fontSize: 13,
    marginRight: 10,
    border: '2px solid transparent',
    '&:focus': {
      outline: '3px solid #0073E6',
      outlineOffset: '2px',
    },
  },
  perPageitemActive: {
    border: '2px solid #000',
  },
  paginationState: {
    fontSize: 13,
    lineHeight: '16px',
  },
  paginationItems: {
    fontSize: 13,
    display: 'flex',
    marginRight: 27,
    cursor: 'pointer',
    '&:last-child': {
      marginRight: 0,
    },
    '& > svg': {
      width: 15,
      marginLeft: 5,
      marginRight: 5,
    },
    [theme.breakpoints.down('md')]: {
      marginRight: 0,
      marginBottom: 10,
      marginTop: 10,
      width: '100%',
      justifyContent: 'center',
    },
  },
  hideOnXs: {
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  disabled: {
    color: '#444444',
    cursor: 'initial',
    pointerEvents: 'none',
  },
  rotateItem: {
    transform: 'rotate(180deg)',
  },
  initialCursor: {
    cursor: 'initial',
  },
  borderBottom: {
    display: 'inline-block',
    minWidth: 25,
    textAlign: 'center',
    marginRight: 5,
    borderBottom: '2px solid #000',
  },
  lastPageValueWrapper: {
    paddingLeft: 5,
  },
  exportToExelIcon: {
    transform: 'rotate(90deg)',
    color: '#000',
  },
  createButton: {
    marginLeft: 50,
  },
  toolbar: {
    borderBottom: 'none',
    padding: 0,
    marginBottom: 30,
  },
  createNewRecordButton: {
    marginLeft: 40,
    marginRight: 0,
  },
  exportToExelWrapper: {
    color: '#000',
    marginLeft: 20,
  },
  progressBar: {
    marginTop: 15,
  },
  tableCell: {
    paddingLeft: 0,
    '&:first-child': {
      paddingLeft: 0,
    },
  },
  tableHeaderRow: {
    '& > th': {
      paddingLeft: 0,
    },
    '& > th:first-child': {
      paddingLeft: 0,
    },
  },
  searchIcon: {
    marginBottom: 5,
  },
  searchInput: {
    '& label': {
      transform: 'translate(30px, 21px) scale(1)',
    },
  },
  pageInput: {
    marginRight: 5,
    '& input': {
      textAlign: 'center',
      paddingTop: 0,
    },
  },
});

const Pagination = ({
  classes,
  count,
  limit,
  loading,
  setLimit,
  handleChangePagination,
  offset,
}) => {
  const t = useTranslate('RegistryPage');
  const dataGridTranslate = useTranslate('Elements');

  const page = offset / limit;
  const lastPageValue = Math.ceil(count / limit);
  const isLastPage = lastPageValue === page + 1;
  const isFirstPage = page === 0;

  const isDataGrig = theme?.fileDataTableTypePremium;

  const memoizedOnChangePage = React.useCallback(
    (page) => handleChangePagination(page),
    [handleChangePagination],
  );

  const memoizedOnPageSizeChange = React.useCallback(
    (pageSize) => setLimit(pageSize),
    [setLimit],
  );

  if (isDataGrig) {
    return (
      <>
        <ProgressLine loading={loading} />

        <DataGridPagination
          t={dataGridTranslate}
          count={count}
          page={page + 1}
          pageSize={limit}
          customActions={true}
          onChangePage={memoizedOnChangePage}
          onChangePageSize={memoizedOnPageSizeChange}
        />
      </>
    );
  }

  return (
    <>
      <ProgressLine loading={loading} />

      <div className={classes.actionsWrapper}>
        <div className={classes.perPageWrapper}>
          {[10, 50, 100].map((item) => (
            <IconButton
              key={_.uniqueId()}
              className={classNames({
                [classes.perPageitem]: true,
                [classes.perPageitemActive]: limit === item,
              })}
              onClick={() => setLimit(item)}
            >
              {item}
            </IconButton>
          ))}
        </div>

        <div className={classes.paginationItems}>
          <div
            className={classNames({
              [classes.paginationItems]: true,
              [classes.disabled]: isFirstPage,
            })}
            tabIndex={isFirstPage ? -1 : 0}
            onClick={() => handleChangePagination(0)}
          >
            <KeyboardTabIcon className={classes.rotateItem} />
            <span className={classes.hideOnXs}>{t('FirstPage')}</span>
          </div>

          <div
            className={classNames({
              [classes.paginationItems]: true,
              [classes.disabled]: isFirstPage,
            })}
            tabIndex={isFirstPage ? -1 : 0}
            onClick={() => handleChangePagination(page - 1)}
          >
            <ArrowBackIcon />
            <span className={classes.hideOnXs}>{t('Backward')}</span>
          </div>

          <div
            className={classNames(
              classes.paginationItems,
              classes.initialCursor,
            )}
          >
            <StringElement
              width={30}
              value={page + 1}
              fullWidth={true}
              required={true}
              noMargin={true}
              className={classes.pageInput}
              onChange={(value) => {
                const input = Number(value);
                if (!isNaN(input)) {
                  if (input >= lastPageValue) {
                    handleChangePagination(lastPageValue - 1);
                  } else {
                    handleChangePagination(input === 0 ? 0 : input - 1);
                  }
                }
              }}
            />
            {t('From')}{' '}
            <span className={classes.lastPageValueWrapper}>
              {lastPageValue}
            </span>
          </div>

          <div
            className={classNames({
              [classes.paginationItems]: true,
              [classes.disabled]: isLastPage,
            })}
            tabIndex={isLastPage ? -1 : 0}
            onClick={() => handleChangePagination(page + 1)}
          >
            <span className={classes.hideOnXs}>{t('Forward')}</span>
            <ArrowForwardIcon />
          </div>

          <div
            className={classNames({
              [classes.paginationItems]: true,
              [classes.disabled]: isLastPage,
            })}
            tabIndex={isLastPage ? -1 : 0}
            onClick={() => handleChangePagination(lastPageValue - 1)}
          >
            <span className={classes.hideOnXs}>{t('LastPage')}</span>
            <KeyboardTabIcon />
          </div>
        </div>

        <div tabIndex={0} className={classes.paginationState}>
          {page * limit + 1} {' - '}{' '}
          {offset + limit > count ? count : offset + limit} {t('From')} {count}
        </div>
      </div>
    </>
  );
};

const styled = withStyles(styles)(Pagination);

export default styled;

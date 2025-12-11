import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import NumberFormat from 'react-number-format';
import { Select, MenuItem, IconButton, TextField, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';

const styles = (theme) => ({
  actionsWrapper: {
    padding: '0px 5px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 25,
    [theme.breakpoints.down('md')]: {
      textAlign: 'center',
      padding: 0
    },
    color: theme?.palette?.text?.primary
  },
  perPageWrapper: {
    display: 'flex',
    alignItems: 'center',
    [theme.breakpoints.down('md')]: {
      justifyContent: 'center'
    }
  },
  perPageWrapperText: {
    paddingRight: 7,
    paddingLeft: 7
  },
  perPageitem: {
    color: '#000',
    fontSize: 14,
    lineHeight: '16px',
    height: 32,
    marginRight: 10
  },
  perPageitemActive: {
    border: '2px solid #000'
  },
  paginationState: {
    fontSize: 14,
    lineHeight: '16px',
    marginLeft: 40,
    [theme.breakpoints.down('md')]: {
      minWidth: 100
    }
  },
  paginationItems: {
    fontSize: 14,
    display: 'flex',
    cursor: 'pointer',
    alignItems: 'center',
    position: 'relative',
    '&:last-child': {
      marginRight: 0
    },
    [theme.breakpoints.down('md')]: {
      marginRight: 0,
      marginBottom: 10,
      marginTop: 10,
      width: '100%',
      justifyContent: 'center'
    }
  },
  pageInput: {
    marginRight: 7,
    '& fieldset': {
      borderColor: 'transparent'
    },
    '& input': {
      textAlign: 'center'
    }
  },
  pageInputDark: {
    '& input': {
      backgroundColor: theme?.buttonHoverBg,
      borderRadius: '4px 4px 0px 0px',
      padding: 5,
      textAlign: 'center'
    }
  },
  disabled: {
    opacity: 0.4,
    pointerEvents: 'none'
  },
  lastPageValueWrapper: {
    paddingLeft: 7
  },
  flexActionsBlock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    [theme.breakpoints.down('md')]: {
      width: '100%'
    }
  },
  toFirstPage: {
    width: 25,
    height: 25,
    right: 2,
    '& svg': {
      position: 'absolute',
      left: -2
    },
    '& svg:first-child': {
      left: 5
    }
  },
  toLastPage: {
    width: 25,
    height: 25,
    left: 2,
    '& svg': {
      position: 'absolute',
      right: -2
    },
    '& svg:last-child': {
      right: 5
    }
  },
  mr5: {
    marginRight: 5
  },
  ml5: {
    marginLeft: 5
  },
  m5: {
    marginLeft: 5,
    marginRight: 5
  },
  iconButton: {
    padding: 2,
    width: 28,
    height: 28
  },
  darkThemePaper: {
    ...theme?.listBackground,
    '& li': {
      color: theme?.header?.textColor,
      paddingTop: 10,
      paddingBottom: 10,
      '&:hover': {
        background: theme?.listHover
      }
    }
  },
  darkThemeLabel: {
    '& fieldset': {
      borderColor: 'transparent'
    },
    '& label': {
      color: '#fff'
    }
  },
  darkThemeSelect: {
    color: theme?.header?.textColor,
    backgroundColor: theme?.buttonHoverBg,
    borderRadius: '4px 4px 0px 0px',
    padding: 5
  },
  loading: {
    color: '#444444',
    pointerEvents: 'none'
  }
});

const NumberFormatCustom = ({ ref, format, ...props }) => (
  <NumberFormat {...props} getInputRef={ref} format={format} thousandSeparator={''} />
);

const countInputWidth = (page) => ((page + '').length + 1) * 12;

const DataTablePagination = ({
  t,
  rowsPerPage,
  page: pageOrigin,
  count,
  classes,
  onChangeRowsPerPage,
  onChangePage,
  withPerPage,
  darkTheme,
  loading
}) => {
  const [perPageValue, setPerPage] = React.useState(rowsPerPage || 10);
  let [timeout] = React.useState(null);

  const page = pageOrigin < 0 || Number.isNaN(pageOrigin) ? 0 : pageOrigin;

  const lastPageValue = Math.ceil(count / rowsPerPage);
  const isLastPage = lastPageValue === page + 1 || !count;
  const isFirstPage = page === 0;
  let lastValueOnPage = page * rowsPerPage + perPageValue;
  lastValueOnPage = lastValueOnPage > count ? count : lastValueOnPage;

  return (
    <div
      className={classNames({
        [classes.actionsWrapper]: true,
        [classes.loading]: loading
      })}
    >
      {withPerPage ? (
        <div className={classes.perPageWrapper}>
          <span className={classes.perPageWrapperText}>{t('PerPageText')}</span>

          <Select
            variant="standard"
            value={perPageValue}
            className={classNames({
              [classes.pageInput]: true,
              [classes.pageInputDark]: darkTheme
            })}
            MenuProps={{
              classes: {
                paper: classNames({
                  [classes.darkThemePaper]: darkTheme
                })
              }
            }}
            classes={{
              select: classNames({
                [classes.darkThemeSelect]: darkTheme
              })
            }}
            onChange={({ target: { value } }) => {
              setPerPage(value);
              onChangeRowsPerPage(value);
            }}
          >
            {[10, 50, 100].map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
        </div>
      ) : null}

      <div
        className={classNames({
          [classes.flexActionsBlock]: true
        })}
      >
        <div className={classes.paginationItems}>
          <Tooltip title={t('toFirstPage')}>
            <div>
              <IconButton
                onClick={() => onChangePage(0)}
                className={classes.iconButton}
                disabled={isFirstPage}
                size="large"
              >
                <div
                  className={classNames({
                    [classes.paginationItems]: true,
                    [classes.toFirstPage]: true,
                    [classes.disabled]: isFirstPage,
                    [classes.paginationItemsDark]: darkTheme
                  })}
                >
                  <NavigateBeforeIcon />
                  <NavigateBeforeIcon />
                </div>
              </IconButton>
            </div>
          </Tooltip>
          <Tooltip title={t('toPrevPage')}>
            <div>
              <IconButton
                onClick={() => onChangePage(page - 1)}
                className={classes.iconButton}
                disabled={isFirstPage}
                size="large"
              >
                <div
                  className={classNames({
                    [classes.paginationItems]: true,
                    [classes.disabled]: isFirstPage,
                    [classes.paginationItemsDark]: darkTheme
                  })}
                >
                  <NavigateBeforeIcon />
                </div>
              </IconButton>
            </div>
          </Tooltip>

          <div
            className={classNames({
              [classes.paginationItems]: true,
              [classes.initialCursor]: true,
              [classes.m5]: true
            })}
          >
            <TextField
              variant="standard"
              style={{
                width: countInputWidth(page)
              }}
              className={classNames({
                [classes.pageInput]: true,
                [classes.pageInputDark]: darkTheme
              })}
              value={page + 1}
              onChange={({ target: { value } }) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                  const newValue = Number(value) - 1;
                  if (newValue > lastPageValue) {
                    onChangePage(lastPageValue - 1);
                    return;
                  }
                  const check = newValue > lastPageValue ? lastPageValue - 1 : newValue;
                  onChangePage(check);
                }, 500);
              }}
              InputProps={{
                readOnly: !count,
                inputComponent: NumberFormatCustom
              }}
            />

            <>
              {t('From')} <span className={classes.lastPageValueWrapper}>{lastPageValue}</span>
            </>
          </div>

          <Tooltip title={t('toNextPage')}>
            <div>
              <IconButton
                onClick={() => onChangePage(page + 1)}
                className={classes.iconButton}
                disabled={isLastPage}
                size="large"
              >
                <div
                  className={classNames({
                    [classes.paginationItems]: true,
                    [classes.disabled]: isLastPage,
                    [classes.paginationItemsDark]: darkTheme
                  })}
                >
                  <NavigateNextIcon />
                </div>
              </IconButton>
            </div>
          </Tooltip>
          <Tooltip title={t('toLastPage')}>
            <div>
              <IconButton
                onClick={() => onChangePage(lastPageValue - 1)}
                className={classes.iconButton}
                disabled={isLastPage}
                size="large"
              >
                <div
                  className={classNames({
                    [classes.paginationItems]: true,
                    [classes.toLastPage]: true,
                    [classes.disabled]: isLastPage,
                    [classes.paginationItemsDark]: darkTheme
                  })}
                >
                  <NavigateNextIcon />
                  <NavigateNextIcon />
                </div>
              </IconButton>
            </div>
          </Tooltip>
        </div>

        <div className={classes.paginationState}>
          {page * rowsPerPage + 1}
          {' - '}
          {lastValueOnPage} {t('From')} {count}
        </div>
      </div>
    </div>
  );
};

DataTablePagination.propTypes = {
  t: PropTypes.func,
  rowsPerPage: PropTypes.number,
  page: PropTypes.number,
  count: PropTypes.number,
  classes: PropTypes.object,
  onChangeRowsPerPage: PropTypes.func,
  onChangePage: PropTypes.func,
  withPerPage: PropTypes.bool,
  loading: PropTypes.bool
};

DataTablePagination.defaultProps = {
  t: null,
  classes: null,
  page: 0,
  count: 0,
  rowsPerPage: 10,
  rowsSelected: [],
  onChangeRowsPerPage: null,
  onChangePage: null,
  withPerPage: true,
  loading: false
};

export default withStyles(styles)(DataTablePagination);

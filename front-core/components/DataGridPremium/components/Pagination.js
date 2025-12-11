import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import MuiPagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';
import { makeStyles } from '@mui/styles';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { Button, Select, MenuItem } from '@mui/material';
import MobileDetect from 'mobile-detect';
import { connect } from 'react-redux';

const useStyles = makeStyles((theme) => ({
  paginationWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
    marginTop: 20,
    marginBottom: 20,
    [theme.breakpoints.down('md')]: {
      flexDirection: 'column-reverse',
      minHeight: 'auto',
    },
  },
  customActions: {
    backgroundColor: 'transparent',
    [theme.breakpoints.down('lg')]: {
      minWidth: 'auto',
      padding: '10px 0',
      '&[type=first]': {
        display: 'none',
      },
      '&[type=last]': {
        display: 'none',
      },
      '& .MuiButton-startIcon': {
        marginLeft: '-8px',
      },
      '& .MuiButton-endIcon': {
        marginRight: '-8px',
      },
    },
  },
  select: {
    background: 'transparent',
    border: '1px solid #E1E7F3',
    padding: '5px 7px',
    marginLeft: 12,
    borderRadius: 4,
    [theme.breakpoints.down('md')]: {
      marginLeft: 8,
    },
  },
  selectRoot: {
    padding: 0,
  },
  buttonRoot: {
    '&.pagination-action.Mui-disabled': {
      backgroundColor: '#fff',
      color: '#767676',
    },
  },
  buttonTitle: {
    [theme.breakpoints.down('lg')]: {
      display: 'none',
    },
  },
  paginationContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    [theme.breakpoints.down('md')]: {
      width: '100%',
      marginTop: '16px',
    },
  },
  paginationCount: {
    display: 'none',
    margin: 0,
    [theme.breakpoints.down('md')]: {
      display: 'block',
      fontSize: '12px',
      marginLeft: '-4px',
    },
  },
  paginationSelect: {
    [theme.breakpoints.down('md')]: {
      marginRight: '-4px',
    },
  },
  disableFocusVisible: {
    outline: 'none !important',
  },
  selectOutlineVisible: {
    '& .MuiSelect-select': {
      outline: 'none !important',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none !important',
    },
  },
  withRowCount: {
    flex: 1,
    alignItems: 'flex-end',
  },
}));

const Pagination = ({
  t,
  page,
  count,
  pageSize,
  onChangePage,
  onChangePageSize,
  pageSizeOptions,
  mainScrollbar,
  showRowCount,
}) => {
  const classes = useStyles();

  const total = React.useMemo(
    () => Math.ceil(count / pageSize),
    [count, pageSize],
  );
  const itemFrom = React.useMemo(
    () => pageSize * ((page || 1) - 1) + 1,
    [page, pageSize],
  );
  const itemTo = React.useMemo(() => {
    return page === total ? count : pageSize * ((page || 1) - 1) + pageSize;
  }, [page, pageSize, total, count]);

  const [manual, setManual] = React.useState(false);

  const [selectOutline, setSelectOutline] = React.useState(false);

  const handlePageSizeChange = React.useCallback(
    (event) => {
      onChangePageSize(event.target.value);
      setTimeout(() => {
        if (event.target.value < pageSize && mainScrollbar) {
          mainScrollbar._container.scrollTop = 0;
          mainScrollbar.updateScroll();
        }
      }, 0);
    },
    [onChangePageSize, mainScrollbar, pageSize],
  );

  const getIcons = React.useCallback((type) => {
    const icons = {
      first: <FirstPageIcon />,
      last: <LastPageIcon />,
      previous: <KeyboardArrowLeftIcon />,
      next: <KeyboardArrowRightIcon />,
    };

    return icons[type];
  }, []);

  const handleChangePage = React.useCallback(
    (_, page) => {
      setTimeout(() => {
        mainScrollbar._container.scrollTop = 0;
        mainScrollbar.updateScroll();
      }, 0);
      onChangePage(page - 1);
    },
    [onChangePage, mainScrollbar],
  );

  const renderItem = React.useCallback(
    (item) => {
      const { type } = item;

      const prev = ['first', 'previous'];
      const next = ['last', 'next'];

      if (prev.concat(next).includes(type)) {
        const startIcon = prev.includes(type) ? getIcons(type) : null;
        const endIcon = next.includes(type) ? getIcons(type) : null;

        return (
          <Button
            {...item}
            startIcon={startIcon}
            endIcon={endIcon}
            className={classNames(classes.customActions, 'pagination-action')}
            aria-label={t(`pagination.${type}`)}
            classes={{
              root: classes.buttonRoot,
            }}
          >
            <span className={classes.buttonTitle}>
              {t(`pagination.${type}`)}
            </span>
          </Button>
        );
      }

      return <PaginationItem {...item} />;
    },
    [getIcons, t, classes],
  );

  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const size = isMobile ? 'large' : 'medium';
  const siblingCount = isMobile ? 0 : 1;
  return (
    <div
      className={classNames({
        [classes.paginationWrapper]: true,
        [classes.withRowCount]: showRowCount,
      })}
      aria-label={t('paginationAriaLabel')}
    >
      <div className={classes.paginationContent}>
        <p className={classes.paginationCount}>
          {itemFrom}-{itemTo} {t('of')} {count}
        </p>
        <div className={classes.paginationSelect}>
          <span>{t('pagination.pageSize')}</span>
          <Select
            value={pageSize}
            onChange={handlePageSizeChange}
            variant="outlined"
            className={classNames({
              [classes.select]: true,
              [classes.selectOutlineVisible]: selectOutline,
            })}
            classes={{
              select: classes.selectRoot,
            }}
            aria-label={t('perPageAriaLabel')}
            onMouseDown={(e) => {
              e.stopPropagation();
              setManual(true);
              setSelectOutline(true);
            }}
            onBlur={(e) => {
              e.stopPropagation();
              setSelectOutline(false);
            }}
            onClose={() => {
              setManual(false);
            }}
          >
            {pageSizeOptions.map((option) => (
              <MenuItem
                key={option}
                value={option}
                classes={{
                  root: classNames({
                    [classes.disableFocusVisible]: manual,
                  }),
                }}
              >
                {option}
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>

      <MuiPagination
        color="primary"
        showFirstButton={true}
        showLastButton={true}
        page={page}
        count={total}
        onChange={handleChangePage}
        renderItem={renderItem}
        size={size}
        siblingCount={siblingCount}
      />
    </div>
  );
};

Pagination.propTypes = {
  t: PropTypes.func,
  page: PropTypes.number,
  count: PropTypes.number,
  pageSize: PropTypes.number,
  onChangePage: PropTypes.func,
  onChangePageSize: PropTypes.func,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  showRowCount: PropTypes.bool,
};

Pagination.defaultProps = {
  t: () => {},
  page: 0,
  count: 0,
  pageSize: 10,
  onChangePage: () => {},
  onChangePageSize: () => {},
  pageSizeOptions: [10, 50, 100],
  showRowCount: false,
};

const mapStateToProps = ({ app: { mainScrollbar } }) => ({ mainScrollbar });
const mapDispatchToProps = () => ({});
export default connect(mapStateToProps, mapDispatchToProps)(Pagination);

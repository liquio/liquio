import theme from 'theme';

const styles = () => ({
  wrapper: {
    display: 'flex',
    justifyContent: 'start',
    alignItems: 'flex-end',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: '8px',
    clear: 'both'
  },
  filterItem: {
    marginRight: 8,
    maxWidth: '100%',
    '& > .MuiInputBase-root': {
      padding: '8px 17px',
      '& span.MuiTypography-root': {
        lineHeight: '24px',
        fontWeight: 400,
      },
    },
  },
  noBorder: {
    border: 'none',
    '&>svg': {
      fontSize: 20,
      color: '#444444',
    },
    '&:after': {
      display: 'none',
    },
    '&:before': {
      display: 'none',
    },
  },
  selectMenu: {
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)',
    '& ul': {
      padding: 0,
    },
  },
  selectRoot: {
    fontSize: 13,
    paddingRight: '10px!important',
    '& svg': {
      display: 'none',
    },
  },
  dropArrow: {
    fontSize: 20,
    color: '#444444',
    cursor: 'pointer',
  },
  menuItem: {
    fontSize: 13,
    lineHeight: '32px',
    paddingLeft: 46,
    paddingTop: 4,
    paddingBottom: 4,
    '& svg': {
      position: 'absolute',
      left: 17,
      top: 7,
    },
  },
  checkboxLabel: {
    fontSize: 13,
  },
  paper: {
    padding: 12,
    minWidth: 300,
  },
  popupButton: {
    fontWeight: 400,
  },
  select: {
    padding: 0,
  },
  filterSelect: {
    ...(theme?.filterSelect || {}),
  },
  selectRoot: {
    ...(theme?.selectRoot || {}),
  },
  detailsCollapse: {
    backgroundColor: '#fff',
    borderRadius: 40,
    border: '2px solid #000000',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 38,
    display: 'flex',
    alignItems: 'center',
    width: 'max-content',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
    },
  },
  opened: {
    borderTop: 'none',
  },
  detailsCollapseButton: {
    color: '#000000',
    fontSize: 13,
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  multiFiltersItem: {
    marginBottom: 24,
  },
  loader: {
    marginBottom: 8,
  },
  actionBlock: {
    marginTop: 24,
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    '& button': {
      backgroundColor: '#fff',
      color: '#0068FF',
    },
    '& button:first-child': {
      border: '1px solid #0068FF',
      marginBottom: 8,
    },
  },
  checkSortIcon: {
    marginRight: 5,
  },
  sortTextWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  disableTransition: {
    '& label': {
      transition:
        'color 0ms cubic-bezier(0.0, 0, 0.2, 1) 0ms, transform 0ms cubic-bezier(0.0, 0, 0.2, 1) 0ms, max-width 0ms cubic-bezier(0.0, 0, 0.2, 1) 0ms;',
    },
    '& *:after': {
      transition: 'transform 0ms cubic-bezier(0.0, 0, 0.2, 1) 0ms',
    },
  },
  clearFilter: {
    marginBottom: '16px',
    backgroundColor: 'transparent',
    color: '#B01038',
    '&:hover': {
      backgroundColor: 'transparent',
    },
    '& > svg': {
      marginRight: '2px',
    },
  },
  filterLabel: {
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  fixMargin: {
    marginTop: -10,
  },
  export: {
    marginBottom: 24,
    padding: '13px 62px'
  },
  LoadingButton: {
    color: '#fff',
    marginRight: 10
  }
});

export default styles;

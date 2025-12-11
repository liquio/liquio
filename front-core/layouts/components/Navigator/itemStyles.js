export default (theme) => ({
  navLink: {
    color: '#000',
    textDecoration: 'none',
    borderRadius: 40,
    display: 'block',
    '&.active': {
      backgroundColor: theme.categoryWrapperActive,
    },
    ...(theme?.navLink || {}),
  },
  item: {
    paddingLeft: 0,
    paddingTop: 6,
    paddingBottom: 6,
    paddingRight: 0,
  },
  itemActionable: {
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, .1)',
    },
    '& svg': {
      fill: '#eee',
      backgroundColor: 'rgba(255, 255, 255, .1)',
    },
  },
  subNavLink: {
    padding: '6px 0',
    borderRadius: 40,
    transition: 'all .2s ease-in-out',
    '&:hover': {
      backgroundColor: theme.categoryWrapperActive,
    },
    ...(theme?.subNavLink || {}),
  },
  noPadding: {
    paddingLeft: 4,
    paddingRight: 4,
  },
  itemPrimary: {
    color: 'inherit',
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: 500,
    lineHeight: '20px',
    letterSpacing: '0.1px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 15,
    ...(theme?.itemPrimary || {}),
  },
  badge: {
    position: 'absolute',
    right: 23,
    fontSize: 11,
    fontStyle: 'normal',
    fontHeight: 500,
    lineHeight: '16px',
    letterSpacing: '0.5px',
  },
  paper: {
    background: '#122945',
  },
});

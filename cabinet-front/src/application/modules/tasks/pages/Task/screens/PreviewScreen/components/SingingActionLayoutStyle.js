export default (theme) => ({
  grow: {
    flexGrow: 1
  },
  toolbar: {
    position: 'fixed',
    width: '100%',
    maxWidth: 'calc(100% - 300px)',
    bottom: 0,
    background: '#fff',
    padding: '24px 40px',
    borderTop: '1px solid #E2E8F0',
    zIndex: 10,
    transition: 'max-width 0.1s ease-in-out',
    [theme.breakpoints.down('sm')]: {
      display: 'block',
      margin: 0,
      padding: 20
    }
  },
  appBarShift: {
    position: 'static',
    maxWidth: '100%'
  },
  appBarShiftSidebar: {
    maxWidth: '100%'
  },
  backButton: {
    marginRight: 10,
    [theme.breakpoints.down('sm')]: {
      margin: 0,
      marginRight: 16
    }
  }
});

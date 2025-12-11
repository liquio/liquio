const style = (theme) => ({
  appBar: {
    top: 'auto',
    backgroundColor: '#FFFFFF',
    bottom: 0,
    borderTop: '1px solid #E2E8F0',
    position: 'fixed',
    zIndex: 1000,
    maxWidth: 'calc(100% - 300px)',
    transition: 'max-width 0.1s ease-in-out'
  },
  appBarShift: {
    position: 'static',
    maxWidth: '100%'
  },
  appBarShiftSidebar: {
    maxWidth: '100%'
  },
  toolbar: {
    margin: 0,
    padding: 20,
    [theme.breakpoints.up('sm')]: {
      padding: '24px 40px'
    }
  },
  button: {
    marginRight: 16,
    outlineOffset: 2
  },
  createPDF: {
    [theme.breakpoints.up('sm')]: {
      fontSize: '0.8rem'
    }
  },
  removeBtn: {
    color: 'rgba(0, 0, 0, 0.54)',
    borderColor: 'transparent',
    marginLeft: 'auto'
  },
  disabledBorder: {
    border: 'none'
  },
  appBarOnboarding: {
    border: 'none',
    ...(theme.appBarOnboarding || {})
  }
});

export default style;

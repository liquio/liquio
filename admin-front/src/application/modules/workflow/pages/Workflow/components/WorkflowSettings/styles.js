const styles = (theme) => ({
  exportButton: {
    color: theme?.navigator?.navItem?.linkActiveColor,
    marginTop: 11,
    marginBottom: 26,
    textTransform: 'upper-case',
    '& img': {
      marginRight: 11,
    },
    '&:hover': {
      backgroundColor: theme.buttonHoverBg,
    },
  },
  fillSvg: {
    fill: theme.textColorDark,
    color: theme.textColorDark,
    marginRight: 10,
  },
  actionWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    width: 'calc(100% + 17px)',
    position: 'relative',
    left: -8,
    '&:hover': {
      backgroundColor: theme.buttonHoverBg,
    },
  },
  actionLabel: {
    fontWeight: 500,
    lineHeight: '19px',
    color: '#FFFFFF',
    fontSize: 16,
    textTransform: 'initial',
    textAlign: 'left',
  },
  addTableWrapper: {
    marginBottom: 20,
    width: 'calc(100% + 12px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  icon: {
    fill: theme.textColorDark,
    marginRight: 5,
  },
  dialogTitle: {
    paddingBottom: 0,
    paddingTop: 30,
    '& h2': {
      fontWeight: 400,
      fontSize: 32,
      lineHeight: '38px',
      letterSpacing: '-0.02em',
      color: '#FFFFFF',
      display: 'flex',
      justifyContent: 'space-between',
    },
  },
  dialogPaper: {
    background: theme?.navigator?.sidebarBg,
    width: 780,
    maxWidth: 780,
    [theme.breakpoints.down('lg')]: {
      maxWidth: '100%',
    },
  },
  dialogActionsRoot: {
    padding: '0 24px',
    paddingBottom: 25,
  },
  biggerLabel: {
    fontSize: 16,
    lineHeight: '19px',
  },
  actionWrapperMargin: {
    marginBottom: 20,
  },
  closeDialog: {
    color: theme?.navigator?.navItem?.linkActiveColor,
    '&:hover': {
      backgroundColor: theme.buttonHoverBg,
    },
  },
  noMargin: {
    marginBottom: 0,
  },
  exportBlockWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorLabel: {
    marginBottom: 10,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  firstStatus: {
    marginTop: 30,
  },
  statusWrapper: {
    marginBottom: 30,
    '& > div': {
      width: '100%',
      maxWidth: '100%',
    },
    '& .MuiFormControl-fullWidth': {
      maxWidth: '100%',
    },
  },
  deleteButtonContainer: {
    float: 'right',
    marginTop: 20,
    marginBottom: 10,
  },
  switchWrapper: {
    marginBottom: 15,
  },
});

export default styles;

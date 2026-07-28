const styles = (theme) => ({
  inlineDisplay: {
    [theme.breakpoints.down('md')]: {
      flexDirection: 'column',
    },
  },
  card: {
    margin: '24px 0 16px',
    border: '1px solid #DFE0E0',
    boxShadow: '0px 2px 4px rgba(84, 110, 122, 0.08)',
    borderRadius: 4,
    padding: 32,
    maxWidth: 800,
    [theme.breakpoints.down('xl')]: {
      padding: 16,
    },
  },
  cardHeader: {
    padding: 0,
    paddingBottom: 32,
    [theme.breakpoints.down('xl')]: {
      flexWrap: 'wrap',
      paddingBottom: 16,
    },
  },
  cardHeaderContent: {
    [theme.breakpoints.down('xl')]: {
      order: 2,
      flex: '0 1 100%',
    },
  },
  cardHeaderAction: {
    [theme.breakpoints.down('xl')]: {
      order: 1,
      flex: '0 1 100%',
      display: 'flex',
      justifyContent: 'flex-end',
    },
  },
  cardContent: {
    padding: 0,
  },
  link: {
    display: 'flex',
    textDecoration: 'none',
  },
  linkHidden: {
    display: 'none',
  },
  button: {
    borderRadius: 0,
    color: '#004BC1',
    fontWeight: 500,
    fontSize: 14,
    lineHeight: '1.2',
    textAlign: 'center',
    letterSpacing: '0.75px',
  },
  buttonIcon: {
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    width: 24,
    height: 24,
    marginRight: 8,
  },
});

export default styles;

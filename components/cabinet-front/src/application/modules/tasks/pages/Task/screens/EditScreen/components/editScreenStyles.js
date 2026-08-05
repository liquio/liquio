export default (theme) => ({
  schemaTitle: {
    padding: 0,
    marginBottom: 24
  },
  oneStepTitle: {
    paddingTop: 30
  },
  drawer: {
    display: 'flex',
    flexDirection: 'column'
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
    paddingBottom: 20,
    [theme.breakpoints.down('md')]: {
      paddingBottom: 100
    }
  },
  hideStepperTitles: {
    fontSize: 20
  },
  progressLine: {
    marginTop: 30
  },
  closeIcon: {
    position: 'absolute',
    top: 14,
    right: 30,
    fontSize: 50,
    padding: 6,
    minWidth: 40,
    [theme.breakpoints.down('lg')]: {
      top: 7,
      right: 10
    }
  }
});

const styles = (theme) => ({
  root: {
    marginTop: 10,
    marginBottom: 10,
    display: 'block',
  },
  errored: {
    boxShadow:
      '0px 1px 3px 0px rgba(255,0,0,0.2), 0px 1px 1px 0px rgba(255,0,0,0.14), 0px 2px 1px -1px rgba(255,0,0,0.12)',
  },
  dropZone: {
    outline: 'none',
    padding: 0,
    textAlign: 'center',
    border: '#aaa 2px dashed',
    borderRadius: 3,
    ...(theme.selectFilesAlt
      ? {
          padding: 24,
          borderColor: 'rgba(68, 68, 68, 0.50)',
        }
      : {}),
    [theme.breakpoints.down('sm')]: {
      padding: 15,
    },
  },
  dropZoneActive: {
    background: '#cdd7e3',
  },
  uploadButton: {
    marginLeft: 16,
  },
  uploadButtonContainer: {
    fontSize: 18,
    paddingTop: 20,
    paddingBottom: 20,
    ...(theme.selectFilesAlt
      ? {
          fontSize: 16,
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: '28px',
          letterSpacing: '0.15px',
          paddingTop: 8,
          paddingBottom: 8,
        }
      : {}),
    [theme.breakpoints.down('sm')]: {
      padding: 0,
      paddingBottom: 15,
    },
  },
  raw: {
    padding: 20,
    fontSize: 18,
    textAlign: 'left',
    '& ul, ol, p, a': {
      margin: 0,
      marginBottom: 15,
    },
    '& ul, ol': {
      paddingLeft: 15,
      '& li': {
        marginBottom: 10,
      },
    },
    '& a': {
      color: '#009be5',
    },
  },
  fontReg: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize,
    fontWeight: theme.typography.fontWeightRegular,
    lineHeight: '20px',
  },
  link: {
    textDecoration: 'underline',
    cursor: 'pointer',
    ...(theme.selectFilesAlt
      ? {
          color: theme.palette.primary.main,
        }
      : {}),
  },
  label: {
    marginTop: 20,
  },
  mb20: {
    marginBottom: 20,
  },
  limits: {
    paddingLeft: 5,
    paddingRight: 5,
    opacity: 0.7,
    ...(theme.selectFilesAlt
      ? {
          fontSize: 14,
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: '20px',
          letterSpacing: '0.17px',
          color: '#444',
        }
      : {}),
  },
  focusedItem: {
    marginBottom: 20,
    ...(theme.selectFilesAlt
      ? {
          marginBottom: 0,
        }
      : {}),
  },
});

export default styles;

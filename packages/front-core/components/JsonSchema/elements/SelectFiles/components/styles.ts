import { Theme } from '@mui/material/styles';

const styles = (theme: Theme) => {
  const selectFilesAlt = (theme as unknown as { selectFilesAlt?: boolean }).selectFilesAlt;

  return {
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
      textAlign: 'center' as const,
      border: '#aaa 2px dashed',
      borderRadius: 3,
      ...(selectFilesAlt
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
      ...(selectFilesAlt
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
      textAlign: 'left' as const,
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
      ...(selectFilesAlt
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
      ...(selectFilesAlt
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
      ...(selectFilesAlt
        ? {
            marginBottom: 0,
          }
        : {}),
    },
  };
};

export default styles;

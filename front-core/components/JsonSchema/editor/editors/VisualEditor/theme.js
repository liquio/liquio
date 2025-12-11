const OUTLINE_COLOR = '#0073E6';

export default {
  breakpoints: {
    keys: ['xs', 'sm', 'md', 'lg', 'xl'],
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  direction: 'ltr',
  overrides: {
    MuiStepButton: {
      root: {
        padding: 0,
        margin: 0,
      },
    },
    MuiStepLabel: {
      iconContainer: {
        width: 32,
        height: 32,
        boxSizing: 'border-box',
        padding: 4,
        '&.MuiStepLabel-alternativeLabel': {
          paddingRight: 4,
          '&.Mui-active': {
            padding: 0,
          },
          '&.Mui-completed': {
            padding: 0,
          },
        },
      },
      alternativeLabel: {
        fontSize: 14,
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: '21px',
        letterSpacing: '0.1px',
      },
      label: {
        '&.Mui-active': {
          fontWeight: 500,
        },
        '&.Mui-completed': {
          fontWeight: 500,
        },
      },
    },
    MuiStepConnector: {
      line: {
        borderColor: 'rgba(0, 104, 255, 0.20)',
        borderTopWidth: 1,
        borderRadius: 2,
      },
      root: {
        top: 14,
        left: 'calc(-50% + 22px)',
        right: 'calc(50% + 22px)',
      },
    },
    MuiFormHelperText: {
      root: {
        fontSize: 12,
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: '19.92px',
        letterSpacing: '0.4px',
      },
    },
    MuiButton: {
      root: {
        padding: '10px 12px',
        borderRadius: 8,
        background: '#F2F7FF',
        fontSize: 14,
        fontStyle: 'normal',
        fontWeight: 500,
        lineHeight: '20px',
        letterSpacing: '0.1px',
        color: '#000',
        textTransform: 'inherit',
        maxHeight: 40,
        '&.Mui-focusVisible': {
          outline: `${OUTLINE_COLOR} solid 3px`,
          borderRadius: 0,
          zIndex: 1,
        },
        '&.MuiButton-textError': {
          color: '#B01038',
          backgroundColor: '#F7E7EB',
        },
      },
      containedPrimary: {
        borderRadius: 8,
        fontWeight: 500,
        fontSize: '14px',
        fontStyle: 'normal',
        lineHeight: '20px',
        letterSpacing: '0.1px',
        textTransform: 'inherit',
        padding: '10px 25px',
        background: '#0068FF',
        color: '#fff',
        maxHeight: 'unset',
      },
      outlinedPrimary: {
        backgroundColor: '#fff',
        color: '#0068FF',
        borderRadius: 8,
      },
    },
    MuiPopover: {
      paper: {
        borderRadius: 4,
        background: '#FFF',
        boxShadow:
          '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
      },
    },
    MuiFormControl: {
      root: {
        display: 'flex',
        zIndex: 'unset',
      },
    },
    MuiInputBase: {
      input: {
        height: 'auto',
        '&.MuiInput-input.Mui-disabled': {
          color: '#767676',
          '-webkit-text-fill-color': 'unset',
        },
      },
      root: {
        '&.Mui-error:after': {
          borderBottomWidth: 2,
        },
        '&.MuiInput-root.Mui-disabled:before': {
          borderBottomStyle: 'solid',
        },
      },
    },
    MuiFormLabel: {
      root: {
        '&.Mui-disabled': {
          color: '#767676',
        },
      },
    },
    MuiListItem: {
      root: {
        ':hover': {
          backgroundColor: '#F0F0F0',
        },
      },
    },
    MuiStepIcon: {
      root: {
        '&.Mui-completed': {
          color: '#007A64',
        },
      },
    },
    MuiTableRow: {
      root: {
        '&.MuiTableRow-hover': {
          '&:hover': {
            backgroundColor: '#B7D5FF',
          },
        },
      },
    },
    MuiDataGrid: {
      root: {
        marginBottom: 10,
        marginTop: 10,
      },
      toolbarContainer: {
        padding: 0,
        paddingBottom: 12,
        borderBottom: '1px solid rgba(224, 224, 224, 1)',
      },
      columnHeaderTitle: {
        fontWeight: 500,
        fontSize: 14,
        fontStyle: 'normal',
        lineHeight: '20px',
        letterSpacing: '0.1px',
      },
      columnHeader: {
        '&:focus-visible': {
          outline: `${OUTLINE_COLOR} solid 3px`,
          outlineOffset: -3,
          zIndex: 1,
          borderRadius: 0,
          '& .MuiDataGrid-menuIcon': {
            display: 'none',
          },
        },
      },
      cellContent: {
        color: '#000',
        fontSize: 14,
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: '21px',
        letterSpacing: '0.25px',
      },
      panelHeader: {
        padding: 12,
      },
      panelFooter: {
        padding: 12,
      },
      virtualScroller: {
        minHeight: 40,
      },
      columnsPanel: {
        padding: 0,
      },
      cell: {
        '&:focus-visible': {
          outline: `${OUTLINE_COLOR} solid 3px`,
          zIndex: 1,
          outlineOffset: -3,
        },
      },
      columnHeaderTitleContainer: {
        '&:focus-visible': {
          outline: `${OUTLINE_COLOR} solid 3px`,
          zIndex: 1,
          outlineOffset: -3,
        },
      },
      columnsPanelRow: {
        padding: 0,
        margin: 0,
        '& .MuiFormControlLabel-root': {
          justifyContent: 'space-between',
          width: '100%',
          flexDirection: 'row-reverse',
          margin: 0,
          padding: 12,
          borderBottom: '1px solid rgba(0, 104, 255, 0.10)',
          '&:hover': {
            backgroundColor: '#E5F0FF',
          },
        },
      },
    },
    MuiButtonBase: {
      root: {
        '&.Mui-disabled': {
          opacity: 0.9,
          '& svg': {
            opacity: 0.9,
          },
        },
        '&.Mui-focusVisible': {
          outline: `${OUTLINE_COLOR} solid 3px`,
          borderRadius: 0,
          zIndex: 1,
          '& .MuiTouchRipple-root': {
            opacity: 0,
          },
        },
        '&.MuiSwitch-switchBase.Mui-focusVisible': {
          outlineOffset: -3,
        },
        '&.MuiCheckbox-root:hover': {
          backgroundColor: '#0068ff1f',
        },
        '&.MuiIconButton-root:hover': {
          backgroundColor: '#0068ff1f',
        },
        '&.MuiRadio-root:hover': {
          backgroundColor: '#0068ff1f',
        },
        '&.MuiSwitch-switchBase.Mui-checked:hover': {
          backgroundColor: '#0068ff1f',
        },
        '&.MuiButton-root.Mui-disabled': {
          backgroundColor: '#767676',
          color: '#fff',
        },
      },
    },
    MuiIconButton: {
      root: {
        '&.Mui-disabled': {
          opacity: 0.9,
        },
      },
    },
    MuiChip: {
      root: {
        height: 20,
        fontSize: 12,
        fontStyle: 'normal',
        fontWeight: 500,
        lineHeight: '16px',
        letterSpacing: '0.5px',
        color: '#000',
        textTransform: 'inherit',
      },
      filledError: {
        color: '#fff',
      },
    },
    MuiSelect: {
      root: {
        borderRadius: 8,
        background: '#F2F7FF',
        fontSize: 14,
        fontStyle: 'normal',
        fontWeight: 500,
        lineHeight: '20px',
        letterSpacing: '0.1px',
        color: '#000',
        textTransform: 'inherit',
        padding: '10px 17px',
        boxSizing: 'content-box',
        '&.Mui-focused > div:focus-visible': {
          outline: `${OUTLINE_COLOR} solid 3px`,
          outlineOffset: 10,
          borderRadius: 0,
          zIndex: 1,
        },
        '& .MuiOutlinedInput-notchedOutline': {
          border: 'none',
        },
      },
    },
    MuiMenuItem: {
      root: {
        paddingTop: 11,
        paddingBottom: 11,
        '&.Mui-focusVisible': {
          outlineOffset: -3,
        },
      },
    },
    MuiDrawer: {
      paper: {
        borderRight: 'none',
      },
    },
    MuiListItemIcon: {
      root: {
        minWidth: 45,
      },
    },
    MuiTooltip: {
      tooltip: {
        backgroundColor: '#000',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: '16px',
        letterSpacing: '0.5px',
        color: '#fff',
        '& *': {
          color: '#fff',
        },
      },
    },
    MuiTabs: {
      root: {
        minHeight: 42,
        borderBottom: '1px solid rgba(19, 63, 158, 0.10)',
        marginBottom: 28,
      },
      flexContainer: {
        '& .MuiTab-root': {
          boxSizing: 'border-box',
          border: '3px solid transparent',
        },
      },
      indicator: {
        display: 'block!important',
      },
    },
    MuiTab: {
      root: {
        fontSize: 14,
        fontStyle: 'normal',
        fontWeight: 500,
        lineHeight: '24px',
        letterSpacing: '0.4px',
        textTransform: 'initial',
        minWidth: 82,
        minHeight: 42,
        padding: '9px 16px',
        color: '#444',
        '&.Mui-selected': {
          background: '#F5FAFF',
        },
        '&.Mui-focusVisible': {
          outlineColor: 'transparent',
          borderRadius: 0,
          border: `3px solid ${OUTLINE_COLOR}`,
        },
      },
    },
    MuiFormControlLabel: {
      label: {
        '&.Mui-disabled': {
          color: '#797878',
        },
      },
    },
    MuiRadio: {
      root: {
        '&.Mui-disabled': {
          color: '#767676',
          opacity: 1,
        },
      },
    },
    MuiCheckbox: {
      root: {
        '&.Mui-disabled': {
          color: '#767676',
          opacity: 1,
        },
      },
    },
    MuiPaginationItem: {
      root: {
        '&.Mui-selected': {
          backgroundColor: '#0068FF',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#0068FF',
            color: '#fff',
          },
        },
        '&:hover': {
          backgroundColor: '#F2F7FF',
          color: '#000',
        },
      },
    },
    MuiDialog: {
      backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.80)',
      },
    },
  },
  palette: {
    type: 'light',
    primary: {
      light: '#63ccff',
      main: '#0068FF',
      dark: '#006db3',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ff4081',
      main: '#000000',
      dark: '#c51162',
      contrastText: '#fff',
    },
    error: {
      light: '#e57373',
      main: '#B01038',
      dark: '#d32f2f',
      contrastText: '#fff',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
      A100: '#d5d5d5',
      A200: '#aaaaaa',
      A400: '#303030',
      A700: '#616161',
    },
    contrastThreshold: 3,
    tonalOffset: 0.2,
  },
  typography: {
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    button: {
      color: 'rgba(0, 0, 0, 0.87)',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.75,
      letterSpacing: '0.02857em',
      textTransform: 'uppercase',
    },
    h1: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '36px',
      fontStyle: 'normal',
      lineHeight: '44px',
      letterSpacing: '-0.01562em',
      maxWidth: 820,
    },
    h2: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '32px',
      fontStyle: 'normal',
      lineHeight: '40px',
    },
    h3: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '28px',
      fontStyle: 'normal',
      lineHeight: '36px',
    },
    h4: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '24px',
      fontStyle: 'normal',
      lineHeight: '32px',
    },
    h5: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '20px',
      fontStyle: 'normal',
      lineHeight: '24px',
    },
    title: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '20px',
      fontStyle: 'normal',
      lineHeight: '30px',
    },
    subheading: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '16px',
      fontStyle: 'normal',
      lineHeight: '24px',
      letterSpacing: '0.15px',
    },
    subheading2: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      fontStyle: 'normal',
      lineHeight: '21px',
      letterSpacing: '0.1px',
    },
    body1: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '16px',
      fontStyle: 'normal',
      lineHeight: '24px',
      letterSpacing: '0.5px',
    },
    body2: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '14px',
      fontStyle: 'normal',
      lineHeight: '21px',
      letterSpacing: '0.5px',
    },
    caption: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '12px',
      fontStyle: 'normal',
      lineHeight: '16px',
      letterSpacing: '0.4px',
    },
    label: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      fontStyle: 'normal',
      lineHeight: '20px',
      letterSpacing: '0.1px',
    },
    label1: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '12px',
      fontStyle: 'normal',
      lineHeight: '16px',
      letterSpacing: '0.5px',
    },
    label2: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '11px',
      fontStyle: 'normal',
      lineHeight: '16px',
      letterSpacing: '0.5px',
    },
    breadcrumbs: {
      color: '#000',
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '14px',
      fontStyle: 'normal',
      lineHeight: '21px',
      letterSpacing: '0.25px',
    },
    useNextVariants: true,
  },
  tabItemSchema: {
    borderRadius: 0,
    margin: 0,
    background: '#fff',
  },
  tabItemTextSchema: {
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: 500,
    lineHeight: '24px',
    letterSpacing: '0.4px',
    minWidth: 'unset',
  },
  leftSidebarBg: '#F2F7FF',
  buttonBg: '#FFD800',
  buttonHoverBg: '#ffe565',
  textColorDark: '#000',
  headerBg: '#fff',
  borderColor: '#e0e0e0',
  navLinkActive: 'rgba(255, 255, 255, .1)',
  dataTableHighlights: '#FFD9091A',
  categoryWrapperActive: '#B7D5FF',
  categoryHeaderPrimary: '#000',
  outlineColor: OUTLINE_COLOR,
  confirmDialogCloseIcon: {
    display: 'none',
  },
  fileDataTableTypePremium: true,
  selectFilesAlt: true,
  filtersButtonMobile: {
    fontSize: 0,
    minWidth: 'unset',
    padding: 8,
    border: '1px solid transparent',
    '&:hover': {
      border: '1px solid #000',
    },
    '& .MuiButton-startIcon': {
      margin: 0,
    },
  },
  pdfPaginationActions: {
    backgroundColor: 'transparent',
    '&.pagination-action.Mui-disabled': {
      backgroundColor: '#fff',
      color: '#767676',
    },
  },
  popupWrapperStyles: {
    border: '1px solid #E1E7F3',
    borderRadius: 8,
  },
  popupWrapperActions: {
    padding: '10px 12px',
    minWidth: 'unset',
  },
  paymentSuccessButton: {
    color: '#007A64!important',
    background: '#EFEFEF!important',
  },
  confirmDialogAcceptButton: {
    padding: '10px 12px',
  }
};

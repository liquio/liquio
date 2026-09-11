const customInputStyle = {
  dummy: {
    fontWeight: '400',
    fontSize: '16px',
    borderBottom: '1px dashed rgb(149, 149, 149);',
  },
  dummyLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    margin: 0,
    padding: 0,
  },
  disabled: {
    '&:before': {
      backgroundColor: 'transparent !important',
    },
  },
  underline: {
    '&:before': {
      backgroundColor: '#D2D2D2',
      height: '1px !important',
    },
  },
  labelRoot: {
    color: '#AAAAAA',
    fontWeight: '400',
    fontSize: '14px',
    lineHeight: '1.42857',
  },
  feedback: {
    position: 'absolute',
    top: '18px',
    right: '0',
    zIndex: '2',
    display: 'block',
    width: '24px',
    height: '24px',
    textAlign: 'center',
  },
  marginTop: {
    marginTop: '16px',
  },
  formControl: {
    paddingBottom: '10px',
    margin: '27px 0 0 0',
    position: 'relative',
    display: 'flex',
  },
  ipn: {
    '& > div': {
      marginTop: 26,
    },
  },
  formMultiControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passportNumber: {
    flexGrow: '1',
    marginLeft: '10px',
  },
  quillErrored: {
    '& .ql-toolbar': {
      borderBottomColor: '#ccc',
    },
  },
  wrapper: {
    padding: '0 0 0 27px',
    marginTop: '0',
  },
  heading: {
    fontSize: '16px',
  },
  panelContent: {
    display: 'block',
  },
  toolTipIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  toolTip: {
    maxWidth: 400,
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: 16,
    background: '#fff',
    boxShadow: '0px 1px 3px 0px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 2px 1px -1px rgba(0, 0, 0, 0.12)',

    ['@media (max-width:767px)']: {
      // eslint-disable-line no-useless-computed-key
      maxWidth: 165,
      fontSize: '14px',
    },
  },
  group: {
    display: 'flex',
  },
  flex: {
    flex: 1,
  },
  aboutLink: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  aboutLinkWrapper: {
    '& a, & a:hover, & a:active, & a:focus': {
      textDecoration: 'none',
      fontWeight: 400,
      fontSize: 12,
      color: '#0059aa',
      cursor: 'pointer',
      textTransform: 'uppercase',
    },
    '& svg': {
      top: 2,
      width: 18,
      height: 18,
      display: 'inline-block',
      position: 'relative',
      marginRight: 4,
      verticalAlign: 'middle',
      fill: '#0059aa',
      fontSize: 24,
      transition: 'fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
      userSelect: 'none',
      flexShrink: 0,
    },
  },
  faqLink: {
    '& a, & a:hover, & a:active, & a:focus': {
      textDecoration: 'none',
      color: '#0059aa',
      cursor: 'pointer',
      outline: 0,
    },
  },
  tooltipRadio: {
    ['@media (max-width:767px)']: {
      // eslint-disable-line no-useless-computed-key
      display: 'none',
    },
  },
  tooltipRadioMobile: {
    display: 'none',
    ['@media (max-width:767px)']: {
      // eslint-disable-line no-useless-computed-key
      display: 'inline-flex',
    },
  },
  dialog: {
    '& > :last-child': {
      maxWidth: '610px',

      ['@media (max-width:767px)']: {
        // eslint-disable-line no-useless-computed-key
        margin: '48px 10px',
        fontSize: '.7rem',
      },
    },
  },
  dialogContentWrappers: {
    ['@media (max-width:767px)']: {
      // eslint-disable-line no-useless-computed-key
      padding: '24px 15px 20px',
    },
  },
  attachList: {
    '& > li': {
      ['@media (max-width:767px)']: {
        // eslint-disable-line no-useless-computed-key
        width: '50%!important',
      },
    },
  },
  menuItem: {
    ['@media (max-width:767px)']: {
      // eslint-disable-line no-useless-computed-key
      display: 'block',
      fontSize: '12px',
      height: '16px',
    },
  },
  floatRight: {
    float: 'right',
  },
  edsFormControl: {
    paddingBottom: '10px',
    margin: '27px 0 0 0',
    position: 'relative',
    maxWidth: 700,
    display: 'flex',
    '& label': {
      fontSize: '0.9rem',
    },
    ['@media (max-width:610px)']: {
      // eslint-disable-line no-useless-computed-key
      '& label': {
        fontSize: '0.75rem',
      },
    },
  },
};

export default customInputStyle;

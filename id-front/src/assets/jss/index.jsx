import theme from 'themes';

import customInputStyle from './components/customInputStyle';

export default {
  ...customInputStyle,
  mt16: {
    marginTop: 16,
  },
  topHeaderLayoutContent: {
    width: 780,
    margin: 'auto',
    border: '1px solid #DADCE0',
    background: '#FFF',
    boxShadow: '0px 4px 10px 0px rgba(0, 0, 0, 0.04)',
    borderRadius: 8,
    marginTop: 24,
    padding: '39px',
    boxSizing: 'border-box',
    ['@media (max-width:767px)']: {
      width: '100%',
      padding: 16,
      marginTop: 8,
      paddingBottom: 32,
    },
  },
  topHeaderLayout: {
    marginTop: 74,
    border: 'none',
    boxShadow: 'none',
    height: 56,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 0,
    ['@media (max-width:767px)']: {
      marginTop: 16,
      height: 40,
    },
    ...(theme.topHeaderLayoutStyles || {}),
  },
  logoLink: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    '& svg': {
      height: '100%',
      width: '100%',
    },
    '&:focus-visible': {
      outline: `3px solid ${theme.outlineColor}`,
      outlineOffset: -4,
      borderRadius: 0,
    },
    ['@media (max-width:767px)']: {
      paddingLeft: 16,
      paddingRight: 16,
    },
  },
  logoLinkRegister: {
    width: 'unset',
  },
  topHeaderLayoutContentRegister: {
    width: 'unset',
    maxWidth: 1128,
    border: 'none',
    boxShadow: 'none',
    backgroundColor: 'transparent',
    padding: 0,
    ['@media (max-width:767px)']: {
      paddingLeft: 16,
      paddingRight: 16,
    },
  },
  topHeaderLayoutRegister: {
    borderBottom: '1px solid rgba(0, 0, 0, 0.10)',
    borderRadius: 0,
    display: 'flex',
    justifyContent: 'start',
    '& svg': {
      height: 'unset',
      width: 'unset',
    },
    ['@media (max-width:767px)']: {
      marginBottom: 8,
      borderBottom: 'none',
    },
  },
  hideHeaderBorder: {
    borderBottom: 'none',
    padding: '0px 20px',
  },
  leftSidebarLayout: {
    minWidth: 275,
    maxWidth: 840,
    margin: 'auto',
  },
  fullPageLayout: {
    minWidth: 275,
    maxWidth: 1000,
    margin: 'auto',
  },
  footer: {
    background: '#fffce5',
  },
  body: {
    background: '#ffffff',
  },
  bodyRegister: {
    background: 'transparent',
  },
  logo: {
    maxWidth: 200,
  },
  subheader: {
    color: '#ffffff',
    marginTop: 20,
  },
  ul: {
    backgroundColor: 'inherit',
    padding: 0,
  },
  listSection: {
    backgroundColor: 'inherit',
  },
  floatRight: {
    float: 'right',
  },
  fullWidth: {
    width: '100%',
    marginBottom: '10px',
  },
  successSnackbar: {
    backgroundColor: '#43a047',
    boxShadow: 'none',
    padding: '0px 12px',
    marginBottom: '5px',
  },
  successIcon: {
    color: '#43a047',
  },
  minButton: {
    marginLeft: 10,
    padding: 0,
    textTransform: 'none',
    color: '#0068FF',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '16px',
    letterSpacing: '0.4px',
    background: 'transparent',
    '&:hover': {
      background: 'transparent',
    },
  },
  '@media (min-width: 840px)': {
    leftSidebarLayout: {
      margin: '20px auto',
    },
    fullPageLayout: {
      margin: '20px auto',
    },
  },
  dialog: {
    '& > :last-child': {
      maxWidth: '610px',
      ['@media (max-width:767px)']: {
        margin: '48px 10px',
      },
    },
  },
  dialogContentWrappers: {
    ['@media (max-width:767px)']: {
      padding: '24px 15px 20px',
    },
  },
  videoLink: {
    display: 'flex',
    height: '24px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    ['@media (max-width:767px)']: {
      position: 'absolute',
      right: 0,
      top: 0,
    },
  },
  videoLinkText: {
    ['@media (max-width:767px)']: {
      display: 'none',
    },
  },
  videoIcon: {
    opacity: '0.5',
  },
  videoFrame: {
    width: '560px',
    height: '315px',
    ['@media (max-width:767px)']: {
      width: '100%',
    },
  },
  smallButton: {
    margin: 0,
    padding: 0,
    minHeight: 26,
    minWidth: 26,
  },
  stepLabel: {
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: 20,
    fontStyle: 'normal',
    fontWeight: 500,
    lineHeight: '30px',
    letterSpacing: '0.1px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ['@media (max-width:767px)']: {
      fontSize: 16,
      lineHeight: '24px',
    },
  },
  stepIconContainer: {
    display: 'none',
  },
  stepRoot: {
    backgroundColor: '#fff',
    padding: '28px 40px',
    marginBottom: 8,
    borderRadius: 4,
    border: '1px solid rgba(19, 63, 158, 0.20)',
    boxShadow: '0px 4px 10px 0px rgba(0, 0, 0, 0.04)',
    ['@media (max-width:767px)']: {
      padding: 16,
      paddingBottom: 32,
    },
  },
  stepContentRoot: {
    borderLeft: 'none',
    maxWidth: 464,
    ['@media (max-width:767px)']: {
      padding: 0,
      margin: 0,
    },
  },
  stepContentRootCustom: {
    ...(theme.stepContentStyles || {}),
  },
  stepperRoot: {
    marginTop: 24,
    marginBottom: 24,
  },
  stepNumber: {
    display: 'inline-block',
    width: 30,
    ['@media (max-width:767px)']: {
      display: 'inline',
    },
  },
  textField: {
    marginBottom: 24,
  },
  stepperButton: {
    marginTop: 0,
  },
  editStepButton: {
    background: '#fff',
    color: '#0068FF',
  },
  formControlAgreement: {
    marginBottom: 30,
  },
  toolbarRoot: {
    padding: 0,
    minHeight: 'unset',
  },
  stepRootError: {
    borderColor: '#B01038',
  },
  mb16: {
    marginBottom: 16,
    marginTop: 8,
    display: 'block',
  },
  resendButton: {
    padding: 0,
    textTransform: 'none',
    color: '#0068FF',
    fontSize: 12,
    fontWeight: 400,
    lineHeight: '16px',
    letterSpacing: '0.4px',
    background: 'transparent',
    '&:hover': {
      background: 'transparent',
    },
  },
  topHeaderLayoutContentGreeting: {
    width: 'unset',
    maxWidth: 936,
    padding: '90px 192px',
    marginTop: 80,
    ['@media (max-width:767px)']: {
      width: '100%',
      padding: 16,
      marginTop: 24,
      paddingBottom: 32,
    },
  },
  topHeaderLayoutHeaderGreeting: {
    marginTop: 0,
    padding: 0,
    marginBottom: 32,
    width: '100%',
  },
  bodyGreetings: {
    textAlign: 'center',
  },
  mainHeadline: {
    letterSpacing: 'normal',
    ['@media (max-width:767px)']: {
      fontSize: 24,
      lineHeight: '32px',
      letterSpacing: '0.3px',
    },
  },
  laterButton: {
    marginTop: 8,
  },
  alignActions: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 24,
  },
  stepActions: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  logoTop: {
    ...(theme.logoTop || {}),
  },
  flexColumnWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  ...theme.overrides,
};

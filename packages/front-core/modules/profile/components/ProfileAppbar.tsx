import React from 'react';
import { FormControlLabel, MenuItem, MenuList, Switch } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import MobileDetect from 'mobile-detect';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import { history } from 'store';

import { logout, toggleDebugMode } from 'actions/auth';
import UserNameRaw from 'components/Auth/UserName';
import checkAccess from 'helpers/checkAccess';
import { getConfig } from 'helpers/configLoader';
import { LanguageSelector } from './LanguageSelector';

const UserName = UserNameRaw as unknown as React.ComponentType<Record<string, unknown>>;

// `cabinetUrl`/`adminPanelUrl` are read from getConfig() in the constructor below
// but only ever assigned to local consts there, never stored on `this` — the two
// usages inside render() (via renderOuterLink) reference these as bare, undeclared
// identifiers, which throws `ReferenceError` at runtime if that branch is ever hit.
// Preserved exactly via these ambient declarations, which let this compile without
// providing an actual binding.
declare const cabinetUrl: string;
declare const adminPanelUrl: string;

type AppTheme = Theme & {
  textColorDark?: string;
  userName?: Record<string, unknown>;
  linksColor?: string;
  menuListRootLinksColor?: { color?: string };
  borderColor?: string;
};

const styles = (theme: AppTheme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    minWidth: 0,
    [theme.breakpoints.down('sm')]: {
      alignItems: 'flex-end'
    }
  },
  userName: {
    fontWeight: 500,
    fontSize: 14,
    lineHeight: '20px',
    letterSpacing: '.1px',
    margin: '0 0 4px 0',
    color: theme?.textColorDark || theme?.palette?.text?.primary,
    ...(theme?.userName || {})
  },
  subTitle: {
    fontSize: 10,
    maxWidth: '135px',
    display: 'block',
    textOverflow: 'ellipsis',
    overflow: 'hidden'
  },
  iconButtonAvatar: {
    padding: 0,
    outlineOffset: 3
  },
  avatar: {
    width: 24,
    height: 24
  },
  menuLink: {
    textDecoration: 'none'
  },
  outerLinkRoot: {
    padding: 0
  },
  outerLink: {
    color: theme?.palette?.text?.primary,
    textDecoration: 'none',
    width: '100%',
    height: '100%',
    padding: '6px 16px'
  },
  menuListRoot: {
    padding: 0,
    display: 'flex',
    '& > li': {
      textDecoration: 'underline',
      color: theme?.linksColor || theme?.menuListRootLinksColor?.color || theme?.palette?.primary?.main,
      fontSize: 12,
      fontWeight: 400,
      lineHeight: '16px',
      letterSpacing: '.4px',
      padding: 0,
      outline: 'none',
      minHeight: 'auto',
      '&:not(:last-child)': {
        marginRight: 18,
        '&:before': {
          display: 'block',
          width: 2,
          height: 16,
          backgroundColor: theme?.borderColor || theme?.palette?.divider,
          content: '""',
          position: 'absolute' as const,
          right: '-9px'
        }
      },
      '&:hover': {
        backgroundColor: 'transparent'
      }
    },
    [theme.breakpoints.down('sm')]: {
      '& > li': {
        fontSize: 11,
        lineHeight: '14px'
      }
    }
  }
});

interface ProfileAppBarProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  actions: { logout: (redirect?: boolean) => void; toggleDebugMode: () => void };
  userInfo?: Record<string, unknown>;
  userUnits?: unknown[];
  debugMode?: boolean;
}

class ProfileAppBar extends React.Component<ProfileAppBarProps> {
  static defaultProps = {
    userInfo: {},
    userUnits: []
  };

  isAdmin: boolean;
  isCabinet: boolean;
  applicationType: string | undefined;
  state: { anchorEl: Element | null };

  constructor(props: ProfileAppBarProps) {
    super(props);

    const {
      application: { type: applicationType },
      cabinetUrl,
      adminPanelUrl
    } = getConfig();

    const { origin } = window.location;
    this.isAdmin = origin === adminPanelUrl;
    this.isCabinet = origin === cabinetUrl;
    this.applicationType = applicationType;

    this.state = { anchorEl: null };
  }

  handleMenuOpen = ({ currentTarget }: React.MouseEvent<HTMLElement>) => this.setState({ anchorEl: currentTarget });

  handleMenuClose = () => this.setState({ anchorEl: null });

  handleLogout = () => {
    const { actions } = this.props;
    this.handleMenuClose();
    actions.logout(true);
  };

  renderOuterLink = (url: string, title: string) => {
    const { classes } = this.props;

    return (
      <MenuItem
        classes={{
          root: classes.outerLinkRoot
        }}
      >
        <a
          href={url}
          className={classes.outerLink}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={0}
          aria-label={title}
        >
          {title}
        </a>
      </MenuItem>
    );
  };

  render() {
    const { t, classes, userInfo, userUnits, debugMode, actions } = this.props;

    const userIsGod = checkAccess({ userIsGod: true }, userInfo as never, userUnits as never);
    const userIsAdmin = checkAccess({ userIsAdmin: true }, userInfo as never, userUnits as never);

    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();

    return (
      <>
        <div style={{ flex: '1 1 0%' }} />
        <LanguageSelector />
        <div className={classes.root}>
          <p className={classes.userName}>
            <UserName {...(userInfo as unknown as Record<string, unknown>)} />
          </p>
          <MenuList
            classes={{
              root: classes.menuListRoot
            }}
          >
            {this.applicationType !== 'adminpanel' ? (
              <MenuItem
                autoFocus={true}
                aria-label={t('MyProfile')}
                tabIndex={0}
                onClick={() => {
                  history.push('/profile');
                  this.handleMenuClose();
                }}
              >
                {t('MyProfile')}
              </MenuItem>
            ) : null}
            {userIsGod && userIsAdmin ? (
              <>
                {this.isAdmin ? this.renderOuterLink(cabinetUrl, t('ToCabinet')) : null}
                {this.isCabinet ? this.renderOuterLink(adminPanelUrl, t('ToAdminPanel')) : null}
                <MenuItem>
                  <FormControlLabel
                    control={<Switch checked={debugMode} onChange={actions.toggleDebugMode} />}
                    label={t('DebugMode')}
                  />
                </MenuItem>
              </>
            ) : null}
            {this.applicationType !== 'adminpanel' && isMobile ? null : (
              <MenuItem tabIndex={0} aria-label={t('Logout')} onClick={this.handleLogout}>
                {t('Logout')}
              </MenuItem>
            )}
          </MenuList>
        </div>
      </>
    );
  }
}

const mapStateToProps = ({ auth: { info: userInfo, userUnits, debugMode } }: {
  auth: { info: Record<string, unknown>; userUnits: unknown[]; debugMode: boolean };
}) => ({
  userInfo,
  userUnits,
  debugMode
});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    logout: bindActionCreators(logout, dispatch),
    toggleDebugMode: bindActionCreators(toggleDebugMode, dispatch)
  }
});

const styled = withStyles(styles)(ProfileAppBar as never);
const translated = translate('Navigator')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;

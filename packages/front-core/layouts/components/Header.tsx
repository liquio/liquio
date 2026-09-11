import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Button,
  ClickAwayListener,
  IconButton,
  Toolbar,
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { translate } from 'react-translate';

import logo from 'assets/img/logo.svg';
import theme from 'core/theme';
import checkAccess from 'helpers/checkAccess';
import getModules from 'modules/index';

interface RawThemeExtras {
  logoStyles?: { src?: string; width?: number; [key: string]: unknown };
  logo?: Record<string, unknown> & { src?: string };
  headerMenuIconButtonColor?: { color?: string };
}

const rawTheme = theme as unknown as RawThemeExtras;

type AppTheme = Theme & {
  textColorDark?: string;
  headerBg?: string;
  borderColor?: string;
  headerBgSm?: string;
  leftSidebarBg?: string;
  logoStyles?: { width?: number; [key: string]: unknown };
  outlineColor?: string;
};

const styles = (theme: AppTheme) => ({
  menuButton: {},
  header: {
    color: theme?.textColorDark || theme?.palette?.text?.primary,
    padding: '16px 24px',
    backgroundColor: theme.headerBg,
    borderBottom: `1px solid ${theme?.borderColor || theme?.palette?.divider}`,
    position: 'relative' as const,
    [theme.breakpoints.down('md')]: {
      padding: 8,
      backgroundColor: theme.headerBgSm || theme.leftSidebarBg,
      color: theme?.palette?.primary?.contrastText,
    },
  },
  toolbar: {
    padding: 0,
    minHeight: 'auto',
    gap: 16,
  },
  flexDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  iconButtonRoot: {
    width: 40,
    height: 40,
  },
  backLink: {
    color: theme?.palette?.text?.secondary,
    [theme.breakpoints.down('md')]: {
      color: theme?.palette?.primary?.contrastText,
    },
  },
  logo: {
    width: 160,
    height: 48,
    maxWidth: 240,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    flexShrink: 0,
    ...(theme.logoStyles || {}),
    [theme.breakpoints.down('sm')]: {
      ...((theme.logoStyles as unknown as Record<string, Record<string, unknown>>)?.[theme.breakpoints.down('sm')] || {}),
      width: theme.logoStyles?.width || 160,
      backgroundSize: 'contain',
    },
  },
  logoLink: {
    '&:focus': {
      borderRadius: 0,
      outline: `${theme.outlineColor} solid 3px`,
    },
  },
  popoverContent: {
    position: 'absolute' as const,
    top: 30,
    left: 45,
    zIndex: 10,
    backgroundColor: theme?.palette?.background?.paper,
    padding: 3,
    '& button': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      padding: '5px 16px',
      outlineOffset: 3,
    },
  },
  hidden: {
    display: 'none',
  },
});

const getLogoSrc = () => rawTheme?.logoStyles?.src || rawTheme?.logo?.src || logo;

interface Widget {
  component: React.ComponentType;
  access?: unknown;
  [key: string]: unknown;
}

interface HeaderProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  onDrawerToggle: (event: unknown) => void;
  hideMenuButton?: boolean;
  backButton?: string;
  userUnits?: unknown;
  userInfo?: unknown;
}

const Header = ({
  t,
  classes,
  onDrawerToggle,
  hideMenuButton,
  backButton,
  userUnits,
  userInfo,
}: HeaderProps) => {
  const widgets: Widget[] = ([] as Widget[]).concat(...(getModules() as { appbar?: Widget[] }[]).map((module) => module.appbar || []));
  const checkAccessAction = ({ access }: { access?: unknown }) =>
    !access || checkAccess(access as Record<string, unknown>, userInfo as never, userUnits as never);

  const [isPopoverOpen, setPopoverOpen] = React.useState(false);
  const menuButton = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const handleTabPress = (event: KeyboardEvent) => {
      if (event.target === menuButton.current) {
        setPopoverOpen(true);
      } else {
        setPopoverOpen(false);
      }
    };

    document.removeEventListener('keydown', handleTabPress);
    document.addEventListener('keydown', handleTabPress);
    return () => {
      document.removeEventListener('keydown', handleTabPress);
    };
  }, []);

  const redirectToMainContent = React.useCallback(() => {
    const contentContainer =
      (document.getElementById('main-container') as Element).children[1];

    const firstElementWithTabIndex = contentContainer.querySelector(
      '[tabIndex]:not([tabIndex="-1"])',
    ) as HTMLElement | null;

    if (firstElementWithTabIndex) {
      firstElementWithTabIndex.focus();
    }

    setPopoverOpen(false);
  }, []);

  const handlePopoverClose = React.useCallback(() => {
    setPopoverOpen(false);
  }, []);

  return (
    <AppBar className={classes.header} position="relative" elevation={0}>
      <Toolbar
        className={classNames({
          [classes.toolbar]: true,
          [classes.flexDisplay]: true,
        })}
      >
        <div className={classes.flexDisplay}>
          {backButton ? (
            <IconButton
              classes={{
                root: classes.iconButtonRoot,
              }}
              size="large"
            >
              <Link to={backButton} className={classes.backLink}>
                <ArrowBackIcon />
              </Link>
            </IconButton>
          ) : null}

          {!backButton && !hideMenuButton ? (
            <IconButton
              aria-label={t('OpenMenuButton')}
              onClick={onDrawerToggle}
              className={classes.menuButton}
              ref={menuButton}
            >
              {
                rawTheme?.headerMenuIconButtonColor?.color ? (
                  <MenuIcon
                    htmlColor={rawTheme.headerMenuIconButtonColor.color}
                  />
                ) : <MenuIcon />
              }
            </IconButton>
          ) : null}

          <div
            className={classNames({
              [classes.popoverContent]: true,
              [classes.hidden]: !isPopoverOpen,
            })}
          >
            <ClickAwayListener onClickAway={handlePopoverClose}>
              <Button
                onClick={redirectToMainContent}
                aria-label={t('SkipToMainContent')}
              >
                {t('SkipToMainContent')}
              </Button>
            </ClickAwayListener>
          </div>

          <Link to="/" aria-label={t('HomeLink')} className={classes.logoLink}>
            <div
              className={classes.logo}
              style={{ ...(rawTheme.logo as React.CSSProperties), backgroundImage: `url(${getLogoSrc()})` }}
            />
          </Link>
        </div>

        {widgets.filter(checkAccessAction).map((widget, key) => (
          <widget.component key={key} />
        ))}
      </Toolbar>
    </AppBar>
  );
};

Header.defaultProps = {
  hideMenuButton: false,
};

const mapStateToProps = ({
  app: { openSidebar },
  auth: { userUnits, info },
}: {
  app: { openSidebar: unknown };
  auth: { userUnits: unknown; info: unknown };
}) => ({
  openSidebar,
  userUnits,
  userInfo: info,
});

const translated = translate('Navigator')(Header as never);
const connected = connect(mapStateToProps)(translated as never);
export default withStyles(styles)(connected as never) as unknown as React.ComponentType<Record<string, unknown>>;

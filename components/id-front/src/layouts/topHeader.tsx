import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import setComponentsId from 'helpers/setComponentsId';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { Card, CardContent, Button, Dialog, DialogTitle, DialogContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { Styles } from '@mui/styles/withStyles';
import type { Theme } from '@mui/material/styles';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import Logo from 'components/Logo';
import styles from 'assets/jss';
import theme from 'themes';

interface TopHeaderLayoutProps {
  setId: (elementName: string) => string;
  t: Translate;
  // The keys come from `assets/jss` and the theme's `overrides`. Typed `string` so they can be computed keys
  // for classNames, although `topHeaderLayoutWithFooter` is not defined anywhere: it is `undefined` at runtime
  // and the class `"undefined"` ends up on the cards (kept, see layouts/topHeader.vitest.tsx).
  classes: Record<string, string>;
  children?: ReactNode;
  // Declared (never read) by the original `propTypes`; the pages do not pass it either.
  footer?: ReactNode;
  isRegister?: boolean;
  isGreeting?: boolean;
}

interface TopHeaderLayoutState {
  openVideo: boolean;
}

// The theme (bpmn) does not define these optional flags, but a theme may; widened by assignment.
const optionalTheme: typeof theme & { hideHeaderBorder?: boolean; useVideoHelp?: boolean } = theme;

class TopHeaderLayout extends Component<TopHeaderLayoutProps, TopHeaderLayoutState> {
  static defaultProps = {
    setId: setComponentsId('top-header'),
    children: '',
    footer: '',
  };

  state = { openVideo: false };

  toggleVideoDialog = () => this.setState({ openVideo: !this.state.openVideo });

  render() {
    const { classes, t, children, setId, isRegister, isGreeting } = this.props;
    const { openVideo } = this.state;

    const Header = () => (
      <Card
        className={classNames({
          [classes.topHeaderLayoutContent]: true,
          [classes.topHeaderLayout]: true,
          [classes.topHeaderLayoutWithFooter]: !isRegister && !isGreeting,
          [classes.topHeaderLayoutRegister]: isRegister,
          [classes.topHeaderLayoutContentRegister]: isRegister,
          [classes.topHeaderLayoutHeaderGreeting]: isGreeting,
          [classes.hideHeaderBorder]: optionalTheme.hideHeaderBorder,
        })}
        id={setId('logo')}
      >
        <Link
          to="/"
          id={setId('link-logo')}
          className={classNames({
            [classes.logoLink]: true,
            [classes.logoLinkRegister]: isRegister,
          })}
          aria-label={t('LOGO')}
        >
          <Logo />
        </Link>
      </Card>
    );

    return (
      <>
        <Card
          className={classNames({
            [classes.topHeaderLayoutContent]: true,
            [classes.topHeaderLayoutWithFooter]: !isRegister && !isGreeting,
            [classes.topHeaderLayoutContentRegister]: isRegister,
            [classes.topHeaderLayoutContentGreeting]: isGreeting,
          })}
          id={setId('main-content-wrapper')}
        >
          {isGreeting ? <Header /> : null}

          <CardContent
            className={classNames({
              [classes.body]: true,
              [classes.bodyRegister]: isRegister,
              [classes.bodyGreetings]: isGreeting,
            })}
            id={setId('content')}
          >
            {optionalTheme.useVideoHelp ? (
              <Button onClick={this.toggleVideoDialog} id={setId('open-video-button')}>
                <PlayCircleOutlineIcon />
                <span className={classes.videoLinkText}>&nbsp; {t('VIDEO_HELP')}</span>
              </Button>
            ) : null}

            <div>{children}</div>

            <Dialog
              open={openVideo}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
              onClose={this.toggleVideoDialog}
              id={setId('video-dialog')}
              className={classes.dialog}
              fullWidth={true}
            >
              <DialogTitle id={setId('video-dialog-title')} className={classes.dialogContentWrappers}>
                {t('VIDEO_HELP')}
              </DialogTitle>
              <DialogContent id={setId('video-dialog-content')} className={classes.dialogContentWrappers}>
                <iframe
                  id={setId('video-dialog-iframe')}
                  className={classes.videoFrame}
                  title="video"
                  src="https://www.youtube.com/embed/bD83fM28x3I"
                  allowFullScreen={true}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </>
    );
  }
}

const styled = withStyles({
  ...styles,
  ...theme.overrides,
} as Styles<Theme, {}, string>)(TopHeaderLayout);
export default translate('Layout')(styled);

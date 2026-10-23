import React from 'react';
import type { ReactNode } from 'react';
import classNames from 'classnames';
import setComponentsId from 'helpers/setComponentsId';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { Styles } from '@mui/styles/withStyles';
import type { Theme } from '@mui/material/styles';

import styles from 'assets/jss';
import Logo from 'components/Logo';

interface FullPageLayoutProps {
  setId?: (elementName: string) => string;
  // The keys come from `assets/jss`; `t` is required by `translate()` but never read here.
  classes: Record<string, string>;
  children?: ReactNode;
  footer?: ReactNode;
  t: Translate;
}

const FullPageLayout = ({
  classes,
  children = '',
  footer = '',
  setId = setComponentsId('full-page'),
}: FullPageLayoutProps) => (
  <>
    <CardContent
      className={classNames({
        [classes.topHeaderLayoutContent]: true,
        [classes.topHeaderLayout]: true,
      })}
      id={setId('content')}
    >
      <Link to="/" id={setId('link-logo')} className={classes.logoLink}>
        <Logo />
      </Link>
    </CardContent>
    <Card className={classes.fullPageLayout} id={setId('')}>
      <CardContent className={classes.body} id={setId('content2')}>
        {children}
      </CardContent>
      {footer ? (
        <CardContent className={classes.footer} id={setId('footer')}>
          {footer}
        </CardContent>
      ) : null}
    </Card>
  </>
);

const styled = withStyles(styles as Styles<Theme, {}, string>)(FullPageLayout);
export default translate('Layout')(styled);

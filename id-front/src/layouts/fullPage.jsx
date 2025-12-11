import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import setComponentsId from 'helpers/setComponentsId';
import { translate } from 'react-translate';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import styles from 'assets/jss';
import Logo from 'components/Logo';

const FullPageLayout = ({ classes, children, footer, setId }) => (
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

FullPageLayout.propTypes = {
  setId: PropTypes.func,
  classes: PropTypes.object.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
  t: PropTypes.func.isRequired,
};

FullPageLayout.defaultProps = {
  setId: setComponentsId('full-page'),
  children: '',
  footer: '',
};

const styled = withStyles(styles)(FullPageLayout);
export default translate('Layout')(styled);

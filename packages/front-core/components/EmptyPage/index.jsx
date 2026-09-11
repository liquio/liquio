import React from 'react';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';

const styles = (theme) => ({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
    [theme.breakpoints.down('lg')]: {
      marginTop: 50,
      paddingLeft: 0
    }
  },
  title: {
    marginTop: 15,
    marginBottom: 16,
    maxWidth: 600,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: '28px',
    fontWeight: 400
  },
  subtitle: {
    marginBottom: 50,
    maxWidth: 600,
    textAlign: 'center'
  }
});

const EmptyPage = ({ title, description, classes, Icon, children }) => (
  <div className={classes.wrap}>
    {Icon ? <Icon /> : null}
    <Typography className={classes.title} variant="h1">
      {title}
    </Typography>
    <Typography className={classes.subtitle} variant="body1">
      {description}
    </Typography>
    {children}
  </div>
);

EmptyPage.propTypes = {
  classes: PropTypes.object.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node,
  Logo: PropTypes.node
};

EmptyPage.defaultProps = {
  title: '',
  description: '',
  children: <div />,
  Logo: null
};

export default withStyles(styles)(EmptyPage);

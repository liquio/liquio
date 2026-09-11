import React from 'react';
import { NavLink } from 'react-router-dom';
import withStyles from '@mui/styles/withStyles';
/**/
import NavItemContent from 'layouts/components/Navigator/NavItemContent';
/**/
const styles = (theme) => ({
  navLink: {
    display: 'block',
    textDecoration: 'none',
    margin: '0',
    '& span': {
      color: theme.navigator.navSubItem.color,
      fontWeight: 500,
      fontSize: '14px',
      lineHeight: '24px',
      letterSpacing: '0.1px',
    },
    '&.active span': {
      color: theme.navigator.navSubItem.linkActiveColor,
    },
    '&.active > div': {
      background: theme.navigator.navSubItem.linkActiveBg,
    },
  },
});

const NavSubItem = ({ t, classes, menuItem }) => {
  const { title, id: childId, path, icon, handleDrawerToggle } = menuItem || {};

  return (
    <NavLink
      exact={true}
      to={path || ''}
      key={childId}
      className={classes.navLink}
      onClick={handleDrawerToggle}
      activeClassName="active"
      id={childId}
    >
      <NavItemContent
        t={t}
        title={title}
        icon={icon}
        path={path}
        id={childId}
        childItem={true}
      />
    </NavLink>
  );
};

export default withStyles(styles)(NavSubItem);

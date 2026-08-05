import { Grid } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React from 'react';
import classNames from 'classnames';

const useStyles = makeStyles(() => ({
  tabsContainer: {
    marginTop: 16,
    flexWrap: 'nowrap',
  },
  tabColLeft: {
    flex: 1,
  },
  mobileContainer: {
    flexWrap: 'unset',
    flexDirection: 'column-reverse',
  },
  mobileGrid: {
    paddingTop: '0!important',
  },
}));

const TabsContainer = ({
  children,
  position,
  orientation,
  columnProperties = [],
  isMobile,
}) => {
  const classes = useStyles();

  if (!orientation && !position) {
    return children;
  }

  return (
    <Grid
      className={classNames({
        [classes.tabsContainer]: true,
        [classes.mobileContainer]: isMobile,
      })}
      container={true}
      spacing={4}
    >
      {React.Children.map(children, (child, index) => (
        <Grid
          item={true}
          xs={12}
          style={{
            order: position === 'left' ? index + 1 : children.length - index,
          }}
          className={classNames({
            [classes[`tabCol${index === 0 ? 'Left' : 'Right'}`]]: true,
            [classes.mobileGrid]: isMobile,
          })}
          {...(columnProperties[index] || {})}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
};

export default TabsContainer;

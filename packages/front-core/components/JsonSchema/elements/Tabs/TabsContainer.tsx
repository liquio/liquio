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

interface TabsContainerProps {
  children: React.ReactNode;
  position?: string;
  orientation?: string;
  columnProperties?: Array<Record<string, unknown> | undefined>;
  isMobile?: boolean;
}

const TabsContainer = ({
  children,
  position,
  orientation,
  columnProperties = [],
  isMobile,
}: TabsContainerProps) => {
  const classes = useStyles();

  if (!orientation && !position) {
    return children;
  }

  const childrenArray = children as React.ReactNode[];

  return (
    <Grid
      className={classNames({
        [classes.tabsContainer]: true,
        [classes.mobileContainer]: !!isMobile,
      })}
      container={true}
      spacing={4}
    >
      {React.Children.map(children, (child, index) => (
        <Grid
          item={true}
          xs={12}
          style={{
            order: position === 'left' ? index + 1 : childrenArray.length - index,
          }}
          className={classNames({
            // Only `tabColLeft` is defined in `styles` above — for index > 0 this
            // computed key resolves to `classes.tabColRight`, i.e. `undefined`,
            // which classNames stringifies to the class name "undefined".
            // Pre-existing behavior, preserved as-is.
            [classes[`tabCol${index === 0 ? 'Left' : 'Right'}` as 'tabColLeft']]: true,
            [classes.mobileGrid]: !!isMobile,
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

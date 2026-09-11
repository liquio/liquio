import React from 'react';
import classNames from 'classnames';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import withStyles from '@mui/styles/withStyles';
import Skeleton from '@mui/material/Skeleton';

const styles = {
  boxWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    borderBottom: '1px solid #E2E8F0'
  },
  nonPadding: {
    padding: 0
  },
  boxItem: {
    flex: 1
  },
  boxItemFlex: {
    display: 'flex',
    width: '100%'
  },
  mainHeadline: {
    marginTop: 32,
    marginBottom: 28
  },
  filters: {
    height: 38,
    marginBottom: 14
  },
  content: {
    paddingLeft: 40,
    paddingRight: 40,
    width: '100%'
  },
  row: {
    marginBottom: 9,
    marginTop: 28,
    fontSize: '1rem'
  },
  table: {
    width: '100%'
  },
  customInterfaceFilter: {
    height: 38,
    marginBottom: 40
  }
};

const AccordionComponent = withStyles(styles)(({ classes }: { classes: Record<string, string> }) => (
  <div className={classes.table} data-testid="accordion-component">
    <Skeleton variant="rectangular" width={410} height={40} className={classes.filters} />

    {Array.from({ length: 11 }, (_, index) => index + 1).map((item) => {
      return <Skeleton key={item} variant="rectangular" height={160} className={classes.row} />;
    })}
  </div>
)) as unknown as React.ComponentType<Record<string, unknown>>;

const DataGridComponent = withStyles(styles)(({ classes }: { classes: Record<string, string> }) => (
  <div className={classes.table} data-testid="data-grid-component">
    <Skeleton variant="rectangular" width={410} height={40} className={classes.filters} />

    <Skeleton variant="rectangular" height={58} />

    {Array.from({ length: 11 }, (_, index) => index + 1).map((item) => {
      return <Skeleton key={item} variant="text" className={classes.row} />;
    })}

    <Skeleton variant="rectangular" width={'100%'} height={40} className={classes.filters} />
  </div>
)) as unknown as React.ComponentType<Record<string, unknown>>;

const CustomInterface = withStyles(styles)(({ classes }: { classes: Record<string, string> }) => (
  <>
    <Typography component="div" variant="h1" className={classes.mainHeadline}>
      <Skeleton width={400} />
    </Typography>

    <div className={classes.table}>
      <Skeleton
        variant="rectangular"
        width={410}
        height={40}
        className={classes.customInterfaceFilter}
      />

      {Array.from({ length: 11 }, (_, index) => index + 1).map((item) => {
        return <Skeleton key={item} variant="rectangular" height={160} className={classes.row} />;
      })}
    </div>
  </>
)) as unknown as React.ComponentType<Record<string, unknown>>;

const LeftSidebar = withStyles(styles)(({ classes, children }: { classes: Record<string, string>; children?: React.ReactNode }) => (
  <Box
    className={classNames({
      [classes.boxWrapper]: true,
      [classes.nonPadding]: true
    })}
    data-testid="left-sidebar-component"
  >
    <Box
      className={classNames({
        [classes.boxItemFlex]: true
      })}
    >
      <Skeleton variant="rectangular" width={400} height={'100vh'} />
      <div className={classes.content}>
        <Typography component="div" variant="h1" className={classes.mainHeadline}>
          <Skeleton width={400} />
        </Typography>

        {children}
      </div>
    </Box>
  </Box>
)) as unknown as React.ComponentType<Record<string, unknown>>;

const Header = withStyles(styles)(({ classes }: { classes: Record<string, string> }) => (
  <Box className={classes.boxWrapper} data-testid="header-component">
    <Box className={classes.boxItem}>
      <Skeleton width={372} height={48}>
        <Typography>.</Typography>
      </Skeleton>
    </Box>

    <Box sx={{ margin: 1 }}>
      <Skeleton variant="rectangular" width={158} height={40} sx={{ borderRadius: 1 }} />
    </Box>
  </Box>
)) as unknown as React.ComponentType<Record<string, unknown>>;

interface BlockScreenProps {
  classes: Record<string, string>;
  dataGrid?: boolean;
  customInterface?: boolean;
  accordion?: boolean;
}

const BlockScreen = ({ dataGrid, customInterface, accordion }: BlockScreenProps) => {
  if (accordion) {
    return <AccordionComponent />;
  }

  if (dataGrid) {
    return <DataGridComponent />;
  }

  if (customInterface) {
    return <CustomInterface />;
  }

  return (
    <>
      <Header />
      <LeftSidebar>
        <DataGridComponent />
      </LeftSidebar>
    </>
  );
};

BlockScreen.defaultProps = {
  dataGrid: false,
  customInterface: false
};

export default withStyles(styles)(BlockScreen as never) as unknown as React.ComponentType<Record<string, unknown>>;

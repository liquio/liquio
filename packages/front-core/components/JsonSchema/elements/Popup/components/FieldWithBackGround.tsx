import type { ReactNode } from 'react';
import type { Theme } from '@mui/material/styles';
import withStyles, { type WithStyles } from '@mui/styles/withStyles';

import RenderOneLine from 'helpers/renderOneLine';

const styles = (theme: Theme) => ({
  wrapper: {
    display: 'inline-block',
    padding: '10px 17px',
    borderRadius: 50,
    backgroundColor: '#F1F1F1',
    marginBottom: 15,
    marginRight: 5,
    color: '#000',
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
      lineHeight: '18px',
      padding: '6px 20px',
    },
  },
});

interface FieldWithBackGroundProps extends WithStyles<typeof styles> {
  children: ReactNode;
}

const FieldWithBackGround = ({ children, classes }: FieldWithBackGroundProps) => (
  <div className={classes.wrapper}>
    <RenderOneLine title={children} />
  </div>
);

export default withStyles(styles)(FieldWithBackGround);

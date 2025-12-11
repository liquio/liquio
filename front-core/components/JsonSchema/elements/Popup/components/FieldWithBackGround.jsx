import React from 'react';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';
import RenderOneLine from 'helpers/renderOneLine';

const styles = (theme) => ({
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

const FieldWithBackGround = ({ children, classes }) => (
  <div className={classes.wrapper}>
    <RenderOneLine title={children} />
  </div>
);

FieldWithBackGround.propTypes = {
  classes: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
};

const styled = withStyles(styles)(FieldWithBackGround);
export default styled;

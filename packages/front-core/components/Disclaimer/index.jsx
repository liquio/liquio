import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import renderHTML from 'helpers/renderHTML';
import theme from 'theme';

const { material } = theme;

const styles = (theme) => ({
  root: {
    backgroundColor: '#fff7e3',
    padding: '25px 18px',
    marginTop: 50,
    marginBottom: 70,
    display: 'flex',
    maxWidth: 1120,
    [theme.breakpoints.down('sm')]: {
      marginBottom: 50
    }
  },
  icon: {
    fontSize: 38,
    marginRight: 10
  },
  text: {
    fontWeight: 300,
    fontSize: 16,
    lineHeight: '24px'
  },
  link: {
    color: '#000'
  },
  noMargin: {
    marginTop: 0,
    marginBottom: 0
  },
  iconMaterial: {
    color: '#0362B9',
    marginRight: 12
  },
  rootMaterial: {
    backgroundColor: '#F8F8F8'
  },
  linkMaterial: {
    color: '#0068FF'
  }
});

const Disclaimer = ({ emoji, classes, text, link, linkText, className, noMargin }) => (
  <div
    className={classNames({
      [classes.root]: true,
      [classes.noMargin]: noMargin,
      className,
      [classes.rootMaterial]: material
    })}
  >
    {material ? (
      <InfoOutlinedIcon className={classes.iconMaterial} />
    ) : (
      <span role="img" aria-label="emoji" className={classes.icon}>
        {emoji || '☝️'}
      </span>
    )}

    <Typography tabIndex={0} className={classes.text}>
      {renderHTML(text)}{' '}
      {link ? (
        <a
          href={link}
          className={classNames({
            [classes.linkMaterial]: material,
            [classes.link]: !material
          })}
        >
          {linkText || link}
        </a>
      ) : null}
    </Typography>
  </div>
);

Disclaimer.propTypes = {
  text: PropTypes.string,
  classes: PropTypes.object.isRequired,
  link: PropTypes.string,
  linkText: PropTypes.string,
  emoji: PropTypes.string
};

Disclaimer.defaultProps = {
  text: null,
  link: null,
  linkText: null,
  emoji: null
};

const styled = withStyles(styles)(Disclaimer);
export default styled;

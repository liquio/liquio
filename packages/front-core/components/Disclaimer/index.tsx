import React from 'react';
import classNames from 'classnames';
import { Typography } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import renderHTML from 'helpers/renderHTML';
import theme from 'theme';

const { material } = theme as unknown as { material?: boolean };

const styles = (theme: Theme) => ({
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

interface DisclaimerProps {
  emoji?: string | null;
  classes: Record<string, string>;
  text?: string | null;
  link?: string | null;
  linkText?: string | null;
  className?: string;
  noMargin?: boolean;
}

const Disclaimer = ({ emoji, classes, text, link, linkText, className, noMargin }: DisclaimerProps) => (
  <div
    className={classNames({
      [classes.root]: true,
      [classes.noMargin]: !!noMargin,
      className,
      [classes.rootMaterial]: !!material
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
      {renderHTML(text as string)}{' '}
      {link ? (
        <a
          href={link}
          className={classNames({
            [classes.linkMaterial]: !!material,
            [classes.link]: !material
          })}
        >
          {linkText || link}
        </a>
      ) : null}
    </Typography>
  </div>
);

Disclaimer.defaultProps = {
  text: null,
  link: null,
  linkText: null,
  emoji: null
};

const styled = withStyles(styles)(Disclaimer as never);
export default styled as unknown as React.ComponentType<Record<string, unknown>>;

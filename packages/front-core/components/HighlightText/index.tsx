import React from 'react';
import withStyles from '@mui/styles/withStyles';

const styles = {
  highlight: {
    background: 'yellow'
  }
};

interface HighlightTextProps {
  classes: Record<string, string>;
  text?: string;
  highlight?: string;
}

const HighlightText = ({ classes, text, highlight }: HighlightTextProps) => {
  if (!text || !highlight || typeof text !== 'string') {
    return text;
  }

  const phrases = highlight
    .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '')
    .split(' ')
    .filter(Boolean)
    .map((phrase) => phrase.toLowerCase());

  const parts = text.split(new RegExp(`(${phrases.join('|')})`, 'gi'));
  return parts.map((part, index) =>
    phrases.includes(part.toLowerCase()) ? <b key={index} className={classes.highlight}>{part}</b> : <span key={index}>{part}</span>
  );
};

HighlightText.defaultProps = {
  text: '',
  highlight: ''
};

export default withStyles(styles)(HighlightText as never) as unknown as React.ComponentType<Record<string, unknown>>;

import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@mui/material';
import evaluate from 'helpers/evaluate';

const headerStyles = {
  h3: {
    fontWeight: 400,
    fontSize: 24,
    lineHeight: '26px',
    color: '#000000',
    marginBottom: '40px',
    maxWidth: 640,
  },
  h4: {
    fontWeight: 400,
    fontSize: 20,
    lineHeight: '26px',
    color: '#000000',
    marginBottom: '40px',
    maxWidth: 640,
  },
  h5: {
    fontWeight: 400,
    fontSize: 14,
    lineHeight: '18px',
    color: '#000000',
    marginBottom: '40px',
    maxWidth: 640,
  },
  h6: {
    fontWeight: 400,
    fontSize: 14,
    lineHeight: '18px',
    color: '#000000',
    marginBottom: '40px',
    maxWidth: 640,
  },
  noMargin: {
    margin: 0,
  },
};

const Header = ({ value, stepName, rootDocument, parentValue, description, level, hidden, noMargin }) => {

  const evaluatedDescription = React.useMemo(() => {
    const document = rootDocument?.data || rootDocument;
    const result = evaluate(description, value, document?.[stepName], document, parentValue);
    if (result instanceof Error) {
      return description;
    }
    return result;
  }, [description, value, stepName, rootDocument, parentValue]);

  const safeLevel = Math.max(3, Math.min(6, level));
  const safeVariant = `h${safeLevel}`;

  if (hidden) {
    return null;
  }

  const styles = noMargin
    ? { ...headerStyles[safeVariant], ...headerStyles.noMargin }
    : headerStyles[safeVariant];

  return (
    <Typography variant={safeVariant} sx={styles} tabIndex={0}>
      {evaluatedDescription}
    </Typography>
  );
};

Header.propTypes = {
  level: PropTypes.number,
  description: PropTypes.string
};

Header.defaultProps = {
  level: 3,
  description: '',
};

export default Header;

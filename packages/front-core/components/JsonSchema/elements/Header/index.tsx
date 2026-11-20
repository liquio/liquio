import React from 'react';
import { Typography } from '@mui/material';
import evaluate from 'helpers/evaluate';

const headerStyles: Record<string, React.CSSProperties> = {
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

interface HeaderProps {
  value?: unknown;
  stepName?: string;
  rootDocument?: { data?: Record<string, unknown> } | Record<string, unknown>;
  parentValue?: unknown;
  description?: string;
  level?: number;
  hidden?: boolean;
  noMargin?: boolean;
}

const Header = ({ value, stepName, rootDocument, parentValue, description = '', level = 3, hidden, noMargin }: HeaderProps) => {

  const evaluatedDescription = React.useMemo(() => {
    const document = (rootDocument as { data?: Record<string, unknown> })?.data || rootDocument;
    const result = evaluate(description, value, (document as Record<string, unknown>)?.[stepName as string], document, parentValue);
    if (result instanceof Error) {
      return description;
    }
    return result as React.ReactNode;
  }, [description, value, stepName, rootDocument, parentValue]);

  const safeLevel = Math.max(3, Math.min(6, level));
  const safeVariant = `h${safeLevel}` as 'h3' | 'h4' | 'h5' | 'h6';

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

export default Header;

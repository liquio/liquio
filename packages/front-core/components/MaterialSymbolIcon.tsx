import React from 'react';
import 'material-symbols/outlined.css';

interface MaterialSymbolIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  sx?: React.CSSProperties;
}

const MaterialSymbolIcon = ({
  name,
  sx,
  className,
  style,
  ...props
}: MaterialSymbolIconProps) => {
  if (!name) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className={['material-symbols-outlined', 'material-symbol-icon', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        color: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 24,
        lineHeight: 1,
        width: '1em',
        height: '1em',
        overflow: 'hidden',
        ...(sx || {}),
        ...(style || {}),
      }}
      {...props}
    >
      {name}
    </span>
  );
};

export default MaterialSymbolIcon;

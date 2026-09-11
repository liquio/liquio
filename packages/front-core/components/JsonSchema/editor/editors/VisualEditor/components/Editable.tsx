import React, { useState } from 'react';

interface EditableProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  component?: React.ElementType;
}

export const Editable = ({ value = '', onChange = () => {}, component: Component = 'h1', ...props }: EditableProps) => {
  const [editing, setEditing] = useState(false);
  const handleSetNewValue = (newValue: string) => {
    if (newValue !== value && newValue.trim() !== '') {
      setEditing(false);
      onChange(newValue);
    }
  };
  const commitText = (event: React.SyntheticEvent<HTMLElement>) =>
    handleSetNewValue(event.currentTarget.textContent?.trim() || '');

  return (
    <Component
      {...props}
      style={{ cursor: 'pointer', marginTop: 7, ...props.style }}
      contentEditable={editing}
      suppressContentEditableWarning={true}
      onBlur={commitText}
      onClick={() => setEditing(true)}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitText(event);
        }
      }}
    >
      {value || 'Untitled Page'}
    </Component>
  );
};

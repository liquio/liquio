import { useState } from 'react';

export const Editable = ({
  value = '',
  onChange = () => { },
  component: Component = h1,
  ...props
}) => {
  const [editing, setEditing] = useState(false);

  const handleSetNewValue = (newValue) => {
    if (newValue !== value && newValue.trim() !== '') {
      setEditing(false);
      onChange(newValue);
    }
  };

  return (
    <Component
      {...props}
      style={{ cursor: 'pointer', marginTop: 7, ...props.style }}
      contentEditable={editing}
      suppressContentEditableWarning={true}
      onBlur={(e) => {
        handleSetNewValue(e.target.textContent.trim());
      }}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSetNewValue(e.target.textContent.trim());
        }
      }}
    >
      {value || 'Untitled Page'}
    </Component>
  );
}
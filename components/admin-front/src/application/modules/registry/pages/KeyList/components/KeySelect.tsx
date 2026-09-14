import React from 'react';

import SelectRaw from 'components/Select';
import ElementContainerRaw from 'components/JsonSchema/components/ElementContainer';

const Select = SelectRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ElementContainer = ElementContainerRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface KeyOption {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface OptionMenu {
  id: string;
  name?: string;
  value: string;
  label?: string;
  [key: string]: unknown;
}

const optionsToMenu = (option: KeyOption | null | undefined): OptionMenu | null =>
  option ? { ...option, value: option.id, label: option.name } : null;

interface KeySelectProps {
  description?: string;
  sample?: string;
  required?: boolean;
  error?: unknown;
  // Always injected by SchemaForm at runtime, but the customControls wiring
  // that renders this component types its own props loosely, so this can't
  // be proven required at compile time.
  path?: string[];
  width?: number | string;
  value?: string;
  excludeKey?: string;
  noMargin?: boolean;
  darkTheme?: boolean;
  variant?: string;
  options?: KeyOption[];
  onChange?: (value: string | null | undefined) => void;
  // Passed by KeyFormModal's customControls wiring alongside every other
  // SchemaForm-injected prop, but unused here — matches the original
  // untyped component, which never destructured it either.
  registerId?: string;
}

const KeySelect = ({
  description = '',
  sample = '',
  required = false,
  error = null,
  path = [],
  width,
  value,
  excludeKey,
  noMargin,
  darkTheme,
  variant,
  options,
  onChange = () => null,
}: KeySelectProps) => {
  const handleChange = (value: OptionMenu | null) => {
    onChange(value && value.id);
  };

  const keys = options || [];
  const keyValue = optionsToMenu(keys.find(({ id }) => value === id));

  return (
    <ElementContainer
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
      width={width}
      noMargin={noMargin}
    >
      <Select
        description={description}
        value={keyValue}
        error={error}
        darkTheme={darkTheme}
        variant={variant}
        id={path.join('-')}
        multiple={false}
        onChange={handleChange}
        options={keys.filter(({ id }) => id !== excludeKey).map(optionsToMenu)}
      />
    </ElementContainer>
  );
};

export default KeySelect;

declare module '@lifayt/material-ui-chip-input' {
  import { ComponentType, ReactNode } from 'react';

  interface ChipInputProps {
    defaultValue?: unknown[];
    error?: boolean;
    onChange?: (chips: unknown[]) => unknown;
    variant?: 'standard' | 'outlined' | 'filled';
    InputProps?: Record<string, unknown>;
    label?: ReactNode;
    [key: string]: unknown;
  }

  const ChipInput: ComponentType<ChipInputProps>;
  export default ChipInput;
}

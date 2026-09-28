declare module '@lupus-ai/mui-currency-textfield' {
  import { ComponentType } from 'react';

  interface CurrencyTextFieldProps {
    className?: string;
    value?: number | string;
    variant?: string;
    disabled?: boolean;
    inputProps?: Record<string, unknown>;
    outputFormat?: string;
    onKeyDown?: (event: React.KeyboardEvent) => void;
    autoFocus?: boolean;
    decimalPlaces?: number;
    currencySymbol?: string;
    decimalCharacter?: string;
    digitGroupSeparator?: string;
    modifyValueOnWheel?: boolean;
    onChange?: (event: { target: { value: unknown } }, value: unknown) => void;
    [key: string]: unknown;
  }

  const CurrencyTextField: ComponentType<CurrencyTextFieldProps>;
  export default CurrencyTextField;
}

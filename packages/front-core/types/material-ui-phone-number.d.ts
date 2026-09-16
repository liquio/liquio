declare module 'material-ui-phone-number' {
  import { ComponentType } from 'react';

  interface MuiPhoneNumberProps {
    onlyCountries?: string[];
    inputClass?: string;
    onChange?: (value: string, country: { countryCode?: string; dialCode?: string; [key: string]: unknown }) => void;
    defaultCountry?: string;
    countryCodeEditable?: boolean;
    disableAreaCodes?: boolean;
    inputProps?: Record<string, unknown>;
    dropdownClass?: string;
    onBlur?: () => void;
    disabled?: boolean;
    error?: unknown;
    [key: string]: unknown;
  }

  const MuiPhoneNumber: ComponentType<MuiPhoneNumberProps>;
  export default MuiPhoneNumber;
}

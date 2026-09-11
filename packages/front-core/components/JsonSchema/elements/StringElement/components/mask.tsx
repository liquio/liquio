import React from 'react';
import InputMask from 'react-input-mask';

interface MaskedProps {
  ref?: React.Ref<HTMLInputElement>;
  [key: string]: unknown;
}

const Masked = ({ ref, ...props }: MaskedProps) => (
  <InputMask {...props} maskChar={null} inputRef={ref} />
);

export default Masked;

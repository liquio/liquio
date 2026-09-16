import React from 'react';
import InputMask from '@kerim-keskin/react-input-mask';

interface MaskedProps {
  [key: string]: unknown;
}

const Masked = React.forwardRef<HTMLInputElement, MaskedProps>((props, ref) => (
  <InputMask {...props} maskPlaceholder={null} ref={ref} />
));

Masked.displayName = 'Masked';

export default Masked;

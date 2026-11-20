import React from 'react';

import emptyValues from './emptyValues';

interface FormElementProps {
  value?: unknown;
  onChange?: (value: unknown) => void;
  schema: { defaultValue?: unknown; type?: string };
}

// Never extended or imported anywhere in this codebase (confirmed via a
// repo-wide search) — dead code, not exported from this directory's
// `index.jsx` barrel either. Converted as-is rather than removed, since
// deletion wasn't requested for this file specifically. `this.isRequired()`
// below is not defined anywhere on this class — it was presumably meant to
// be supplied by a subclass that was never written; preserved via a cast
// rather than "fixing" the missing method.
class FormElement extends React.Component<FormElementProps> {
  componentDidMount() {
    const { value, onChange } = this.props;
    if (value === null && (this as unknown as { isRequired: () => boolean }).isRequired() && onChange) {
      onChange(this.getDefaultValue());
    }
  }

  getDefaultValue = () => {
    const { schema } = this.props;

    return schema.defaultValue || emptyValues[schema.type || 'object'];
  };
}

export default FormElement;

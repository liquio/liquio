import React from 'react';

import emptyValues from './emptyValues';

class FormElement extends React.Component {
  componentDidMount() {
    const { value, onChange } = this.props;
    if (value === null && this.isRequired() && onChange) {
      onChange(this.getDefaultValue());
    }
  }

  getDefaultValue = () => {
    const { schema } = this.props;

    return schema.defaultValue || emptyValues[schema.type || 'object'];
  };
}

export default FormElement;

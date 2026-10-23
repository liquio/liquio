import React from 'react';
import StringElement from './StringElement';

interface IntegerElementProps {
  value?: number | null;
  onChange?: ((value: number) => void) | null;
  required?: boolean;
  hidden?: boolean;
  [key: string]: unknown;
}

class IntegerElement extends React.Component<IntegerElementProps> {
  static defaultProps = {
    value: null,
    onChange: () => null,
    required: false,
  };

  componentDidMount() {
    const { value, onChange, required } = this.props;
    if (required && value === null && onChange) {
      onChange(0);
    }
  }

  render() {
    const { onChange, value, hidden } = this.props;

    if (hidden) return null;

    return (
      <StringElement
        {...(this.props as unknown as Record<string, unknown>)}
        type="number"
        value={String(value)}
        onChange={(val: unknown) => onChange && onChange(parseInt(val as string, 10))}
      />
    );
  }
}

export default IntegerElement;

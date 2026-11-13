import React from 'react';
import { useTranslate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';

interface RenderTextFieldProps {
  name: string;
  noMargin?: boolean;
  fields?: string[];
  errors?: unknown[];
  value?: Record<string, { value?: unknown }>;
  handleUpdateField: (name: string | string[], value: unknown) => void;
  maxLength?: number;
  sample?: string;
  mask?: string;
  pattern?: string;
  callBack?: (value: unknown) => void;
  readOnly?: boolean;
}

const RenderTextField = ({
  name,
  noMargin = false,
  fields,
  errors,
  value,
  handleUpdateField,
  maxLength,
  sample,
  mask,
  pattern,
  callBack,
  readOnly,
}: RenderTextFieldProps) => {
  const t = useTranslate('VerifiedUserInfo');

  return fields?.includes(name) ? (
    <SchemaForm
      schema={{
        type: 'object',
        properties: {
          [name]: {
            type: 'string',
            description: t(name),
            maxLength: maxLength || 255,
            notRequiredLabel: '',
            sample: sample || undefined,
            mask: mask || undefined,
            pattern: pattern || undefined,
          },
        },
      }}
      noMargin={noMargin}
      errors={errors}
      value={{
        [name]: value?.[name]?.value || '',
      }}
      onChange={(_: unknown, nextValue: unknown) => {
        handleUpdateField(name, { value: nextValue });
        callBack?.(nextValue);
      }}
      readOnly={readOnly}
    />
  ) : null;
};

export default RenderTextField;

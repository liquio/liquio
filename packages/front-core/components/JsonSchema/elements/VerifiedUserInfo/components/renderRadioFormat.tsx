import React from 'react';
import { useTranslate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';

interface RenderRadioFormatProps {
  name: string;
  fields?: string[];
  errors?: unknown[];
  value?: Record<string, { value?: unknown }>;
  handleUpdateField: (name: string | string[], value: unknown) => void;
  readOnly?: boolean;
}

const RenderRadioFormat = ({
  name,
  fields,
  errors,
  value,
  handleUpdateField,
  readOnly,
}: RenderRadioFormatProps) => {
  const t = useTranslate('VerifiedUserInfo');

  return fields?.includes(name) ? (
    <SchemaForm
      schema={{
        type: 'object',
        properties: {
          [name]: {
            type: 'string',
            maxLength: 255,
            notRequiredLabel: '',
            control: 'radio.group',
            sample: `<span style="opacity: 0.5;">${t(name)}</span>`,
            items: [
              { id: 'male', title: t('male') },
              { id: 'female', title: t('female') },
            ],
          },
        },
      }}
      errors={errors}
      value={{
        [name]: value?.[name]?.value || '',
      }}
      onChange={(_: unknown, nextValue: { data: unknown }) =>
        handleUpdateField(name, { value: nextValue.data })
      }
      readOnly={readOnly}
    />
  ) : null;
};

export default RenderRadioFormat;

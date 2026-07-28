import React from 'react';
import { useTranslate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';

const RenderRadioFormat = ({
  name,
  fields,
  errors,
  value,
  handleUpdateField,
  readOnly,
}) => {
  const t = useTranslate('VerifiedUserInfo');

  return (
    <>
      {fields?.includes(name) ? (
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
                  {
                    id: 'male',
                    title: t('male'),
                  },
                  {
                    id: 'female',
                    title: t('female'),
                  },
                ],
              },
            },
          }}
          errors={errors}
          value={{
            [name]: value?.[name]?.value || '',
          }}
          onChange={(_, { data: value }) => handleUpdateField(name, { value })}
          readOnly={readOnly}
        />
      ) : null}
    </>
  );
};

export default RenderRadioFormat;

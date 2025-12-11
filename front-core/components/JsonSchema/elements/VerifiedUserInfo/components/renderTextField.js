import React from 'react';
import { useTranslate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';

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
          onChange={(_, value) => {
            handleUpdateField(name, { value });
            callBack && callBack(value);
          }}
          readOnly={readOnly}
        />
      ) : null}
    </>
  );
};

export default RenderTextField;

import React from 'react';
import { useTranslate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';

interface DateOption {
  id: string;
  name: string;
}

interface RenderDateFormatProps {
  name: string;
  fields?: string[];
  errors?: unknown[];
  value?: Record<string, { date?: string }>;
  handleUpdateField: (name: string | string[], value: unknown) => void;
  months: DateOption[];
  readOnly?: boolean;
}

const RenderDateFormat = ({
  name,
  fields,
  errors,
  value,
  handleUpdateField,
  months: options,
  readOnly,
}: RenderDateFormatProps) => {
  const t = useTranslate('VerifiedUserInfo');

  const dateObject = React.useMemo(() => {
    const dateString = value?.[name]?.date || '';

    return {
      day: dateString.split('.')[0] || '',
      month: dateString.split('.')[1] || '',
      year: dateString.split('.')[2] || '',
    } as Record<'day' | 'month' | 'year', string>;
  }, [value, name]);

  const handleChangeDate = React.useCallback(
    (_event: unknown, changing: 'day' | 'month' | 'year', value: string) => {
      dateObject[changing] = value;

      const dateArray = [dateObject?.day, dateObject?.month, dateObject?.year];

      const updatedDate = dateArray.join('.');

      handleUpdateField(
        `${name}.date`,
        updatedDate === '..' ? '' : updatedDate,
      );
    },
    [dateObject, handleUpdateField, name],
  );

  return (
    <>
      {fields?.includes(name) ? (
        <SchemaForm
          schema={{
            type: 'object',
            properties: {
              birthday: {
                control: 'form.group',
                blockDisplay: false,
                outlined: false,
                sample: `<div style="margin-top: 15px;"><span style="opacity: 0.5;">${t(
                  name,
                )}</span></div>`,
                notRequiredLabel: '',
                properties: {
                  day: {
                    type: 'string',
                    pattern: '^0*([1-9]|[12][0-9]|3[01])$',
                    width: 65,
                    description: t('day'),
                    mask: '99',
                    notRequiredLabel: '',
                  },
                  month: {
                    type: 'string',
                    width: 200,
                    description: t('month'),
                    notRequiredLabel: '',
                    options,
                  },
                  year: {
                    type: 'string',
                    width: 65,
                    description: t('year'),
                    pattern: '([1-2]\\d{3})',
                    mask: '9999',
                    notRequiredLabel: '',
                  },
                },
              },
            },
          }}
          errors={errors}
          value={{
            [name]: dateObject,
          }}
          onChange={handleChangeDate as never}
          readOnly={readOnly}
        />
      ) : null}
    </>
  );
};

export default RenderDateFormat;

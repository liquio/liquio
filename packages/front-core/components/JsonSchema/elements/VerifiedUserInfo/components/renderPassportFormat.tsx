import React from 'react';
import { useTranslate } from 'react-translate';
import classNames from 'classnames';
import { SchemaForm } from 'components/JsonSchema';

interface DateOption {
  id: string;
  name: string;
}

interface PassportValue {
  issuedAt?: string;
  expireDate?: string;
  documentType?: unknown;
  type?: string;
  series?: string;
  number?: string;
  issuedBy?: string;
  [key: string]: unknown;
}

interface RenderPassportFormatProps {
  name: string;
  fields?: string[];
  errors?: unknown[];
  value: Record<string, PassportValue | undefined> & { passport?: PassportValue };
  handleUpdateField: (name: string | string[], value: unknown) => void;
  months: DateOption[];
  classes: Record<string, string>;
  readOnly?: boolean;
  hiddenFields: string[];
}

const RenderPassportFormat = ({
  name,
  fields,
  errors,
  value,
  handleUpdateField,
  months: options,
  classes,
  readOnly,
  hiddenFields,
}: RenderPassportFormatProps) => {
  const t = useTranslate('VerifiedUserInfo');
  const issuedAt = React.useMemo(() => {
    const issuedAtString = value?.[name]?.issuedAt || '';

    return {
      day: issuedAtString.split('.')[0] || '',
      month: issuedAtString.split('.')[1] || '',
      year: issuedAtString.split('.')[2] || '',
    };
  }, [value, name]);

  const expireDate = React.useMemo(() => {
    const expireDateString = value?.[name]?.expireDate || '';

    return {
      day: expireDateString.split('.')[0] || '',
      month: expireDateString.split('.')[1] || '',
      year: expireDateString.split('.')[2] || '',
    };
  }, [value, name]);

  const dates = React.useMemo(() => {
    return {
      issuedAt,
      expireDate,
    } as Record<string, Record<string, string>>;
  }, [issuedAt, expireDate]);

  const handleChangePassport = React.useCallback(
    (...args: unknown[]) => {
      const changedValue = args.pop();
      const fieldName = args.pop() as string;

      if (typeof (changedValue as { data?: unknown })?.data === 'object') {
        handleUpdateField(name, {
          ...value[name],
          documentType: (changedValue as { data?: unknown })?.data,
        });
      } else if (changedValue !== null && typeof changedValue === 'object') {
        const type =
          typeof (changedValue as { active?: unknown })?.active === 'string'
            ? (changedValue as { active?: string })?.active
            : value[name]?.type;
        const hasUnzr = fields?.includes('unzr');
        handleUpdateField(name, {
          type,
        });
        if (hasUnzr) {
          handleUpdateField('unzr', { value: null });
        }
      } else if (typeof changedValue === 'string') {
        const isDate = args.find((el) =>
          ['issuedAt', 'expireDate'].includes(el as string),
        );

        if (isDate) {
          const dateName = args.pop() as string;

          dates[dateName][fieldName] = changedValue;

          const dateArray = [
            dates[dateName]?.day,
            dates[dateName]?.month,
            dates[dateName]?.year,
          ];

          const updatedDate = dateArray.join('.');

          handleUpdateField([name, dateName], updatedDate);
        } else {
          handleUpdateField([name, fieldName], changedValue);
        }
      }
    },
    [handleUpdateField, name, value, dates, fields],
  );

  React.useEffect(() => {
    if (!value?.passport?.type) {
      handleUpdateField(name, {
        type: 'passport',
      });
    }
  }, [value, name, handleUpdateField]);

  const properties: Record<string, unknown> = {
    passport: {
      type: 'object',
      description: t('PassportCard'),
      properties: {
        pasNumber: {
          control: 'form.group',
          blockDisplay: false,
          outlined: false,
          properties: {
            series: {
              type: 'string',
              description: t('Serie'),
              notRequiredLabel: '',
              width: 65,
              mask: '**',
              formatChars: {
                '*': '[АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя]',
              },
              changeCase: 'toUpperCase',
            },
            number: {
              type: 'string',
              description: t('Number'),
              notRequiredLabel: '',
              width: 144,
              mask: '999999',
            },
          },
        },
        dateHeader: {
          control: 'text.block',
          noMargin: true,
          htmlBlock: `<p class=${
            classes.labelText
          } style='font-size: 12px; line-height: 16px; color: #000; opacity: 0.5; margin-top: 0; margin-bottom: 0;'>${t(
            'IssuedDate',
          )}</p>`,
        },
        issuedAt: {
          control: 'form.group',
          blockDisplay: false,
          outlined: false,
          properties: {
            day: {
              type: 'string',
              description: t('day'),
              notRequiredLabel: '',
              pattern: '^0*([1-9]|[12][0-9]|3[01])$',
              mask: '99',
              width: 65,
              disableOnblur: true,
            },
            month: {
              type: 'string',
              description: t('month'),
              notRequiredLabel: '',
              width: 200,
              options,
              disableOnblur: true,
            },
            year: {
              type: 'string',
              description: t('year'),
              notRequiredLabel: '',
              width: 65,
              pattern: '[0-9]{4}',
              mask: '9999',
              disableOnblur: true,
            },
          },
        },
        issuedBy: {
          type: 'string',
          description: t('IssuedBy'),
          notRequiredLabel: '',
        },
      },
    },
    idCard: {
      type: 'object',
      description: t('IdCard'),
      properties: {
        number: {
          type: 'string',
          description: t('Number'),
          notRequiredLabel: '',
          width: 144,
          mask: '999999999',
        },
        dateHeader: {
          control: 'text.block',
          noMargin: true,
          htmlBlock: `<p class=${
            classes.labelText
          } style='font-size: 12px; line-height: 16px; color: #000; opacity: 0.5; margin-top: 0; margin-bottom: 0;'>${t(
            'IssuedDate',
          )}</p>`,
        },
        issuedAt: {
          control: 'form.group',
          blockDisplay: false,
          outlined: false,
          properties: {
            day: {
              type: 'string',
              description: t('day'),
              notRequiredLabel: '',
              pattern: '^0*([1-9]|[12][0-9]|3[01])$',
              width: 65,
              mask: '99',
            },
            month: {
              type: 'string',
              description: t('month'),
              notRequiredLabel: '',
              width: 200,
              options,
            },
            year: {
              type: 'string',
              description: t('year'),
              notRequiredLabel: '',
              width: 65,
              pattern: '[0-9]{4}',
              mask: '9999',
            },
          },
        },
        expireDateHeader: {
          control: 'text.block',
          noMargin: true,
          htmlBlock: `<p class=${
            classes.labelText
          } style='font-size: 12px; line-height: 16px; color: #000; opacity: 0.5; margin-top: 0; margin-bottom: 0;'>${t(
            'PassportExpired',
          )}</p>`,
        },
        expireDate: {
          description: '',
          control: 'form.group',
          blockDisplay: false,
          outlined: false,
          properties: {
            day: {
              type: 'string',
              description: t('day'),
              notRequiredLabel: '',
              pattern: '^0*([1-9]|[12][0-9]|3[01])$',
              width: 65,
              maxLength: 2,
            },
            month: {
              type: 'string',
              description: t('month'),
              notRequiredLabel: '',
              width: 200,
              options,
            },
            year: {
              type: 'string',
              description: t('year'),
              notRequiredLabel: '',
              width: 65,
              pattern: '[0-9]{4}',
              mask: '9999',
            },
          },
        },
        issuedBy: {
          type: 'string',
          description: t('idCardIssuedBy'),
          notRequiredLabel: '',
          width: 144,
          mask: '9999',
        },
      },
    },
    foreignersDocument: {
      type: 'object',
      description: t('foreignersDocument'),
      notRequiredLabel: '',
      properties: {
        documentType: {
          type: 'object',
          control: 'register',
          multiple: false,
          keyId: 176,
          description: t('foreignersDocumentType'),
          notRequiredLabel: '',
          usedInTable: true,
        },
        series: {
          type: 'string',
          description: t('Serie'),
          notRequiredLabel: '',
          width: 65,
          checkHidden: `(value, step, data) => { if (!!(data?.${name}?.documentType?.code === '2' || data?.${name}?.documentType?.code  === '4') && data?.${name}?.type === 'foreignersDocument') return false; return true; }`,
          maxLength: 2,
          changeCase: 'toUpperCase',
          mask: '**',
          formatChars: {
            '*': '[а-яА-ЯЁёєЄіІїЇґҐa-zA-Z]',
          },
        },
        number: {
          type: 'string',
          description: t('Number'),
          notRequiredLabel: '',
          width: 200,
          mask: '999999999',
        },
        dateHeader: {
          control: 'text.block',
          noMargin: true,
          htmlBlock: `<p style='font-size: 12px; line-height: 16px; color: #000; opacity: 0.5; margin-top: 0; margin-bottom: 0;'>${t(
            'IssuedDate',
          )}</p>`,
        },
        issuedAt: {
          control: 'form.group',
          blockDisplay: false,
          outlined: false,
          properties: {
            day: {
              type: 'string',
              description: t('day'),
              notRequiredLabel: '',
              pattern: '^0*([1-9]|[12][0-9]|3[01])$',
              width: 70,
              mask: '99',
            },
            month: {
              type: 'string',
              description: t('month'),
              notRequiredLabel: '',
              width: 200,
              options,
            },
            year: {
              type: 'string',
              description: t('year'),
              notRequiredLabel: '',
              width: 70,
              pattern: '([1-2]\\d{3})',
              mask: '9999',
            },
          },
        },
        expireDateHeader: {
          control: 'text.block',
          noMargin: true,
          htmlBlock: `<p style='font-size: 12px; line-height: 16px; color: #000; opacity: 0.5; margin-top: 0; margin-bottom: 0;'>${t(
            'RCardExpired',
          )}</p>`,
          checkHidden: `(value, step, data) => {if (data?.${name}?.documentType?.code !== '4') return false; return true;}`,
        },
        expireDate: {
          control: 'form.group',
          blockDisplay: false,
          outlined: false,
          checkHidden: `(value, step, data) => { if (data?.${name}?.documentType?.code !== '4') return false; return true;}`,
          properties: {
            day: {
              type: 'string',
              description: t('day'),
              notRequiredLabel: '',
              pattern: '^0*([1-9]|[12][0-9]|3[01])$',
              width: 70,
              maxLength: 2,
            },
            month: {
              type: 'string',
              description: t('month'),
              notRequiredLabel: '',
              width: 200,
              options,
            },
            year: {
              type: 'string',
              description: t('year'),
              notRequiredLabel: '',
              width: 70,
              pattern: '([1-2]\\d{3})',
              mask: '9999',
            },
          },
        },
        issuedBy: {
          type: 'string',
          description: t('idCardIssuedBy'),
          notRequiredLabel: '',
          width: 200,
          mask: '9999',
        },
      },
    },
  };

  const isFieldHidden = (fieldName: string) => {
    return hiddenFields.includes(`passport.${fieldName}`);
  };
  Object.keys(properties).forEach((key) => {
    if (isFieldHidden(key)) {
      delete properties[key];
    }
  });

  return (
    <>
      {fields?.includes(name) ? (
        <>
          <div
            className={classNames({
              [classes.infoBlockHeadline]: true,
              [classes.infoBlockHeadlinePassport]: true,
            })}
          >
            {t('passportData')}
          </div>
          <SchemaForm
            rootDocument={{
              data: {
                [name]: value[name],
              },
            }}
            schema={{
              type: 'object',
              properties: {
                tabs: {
                  type: 'object',
                  control: 'tabs.old',
                  emptyHidden: true,
                  properties: properties,
                },
              },
            }}
            errors={errors}
            value={{
              tabs: {
                active: value[name]?.type,
                passport: {
                  pasNumber: {
                    series: value[name]?.series,
                    number: value[name]?.number,
                  },
                  issuedAt: dates?.issuedAt,
                  issuedBy: value[name]?.issuedBy,
                },
                idCard: {
                  number: value[name]?.number,
                  issuedAt: dates?.issuedAt,
                  expireDate: dates?.expireDate,
                  issuedBy: value[name]?.issuedBy,
                },
                foreignersDocument: {
                  expireDate: dates?.expireDate,
                  issuedAt: dates?.issuedAt,
                  issuedBy: value[name]?.issuedBy,
                  number: value[name]?.number,
                  series: value[name]?.series,
                  documentType: value[name]?.documentType,
                },
              },
            }}
            onChange={handleChangePassport}
            readOnly={readOnly}
          />
        </>
      ) : null}
    </>
  );
};

export default RenderPassportFormat;

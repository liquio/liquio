import React from 'react';
import { useTranslate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';
import processList from 'services/processList';
import Disclaimer from 'components/Disclaimer';
import classNames from 'classnames';

const RenderUnzrField = ({
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
  readOnly,
  actions,
  classes,
}) => {
  const t = useTranslate('VerifiedUserInfo');

  const handleChangeUnzr = React.useCallback(
    async (...args) => {
      const action = async () => {
        const changedValue = args.pop();
        const valueName = args.pop();
        switch (valueName) {
          case 'isNoUnzr':
            handleUpdateField(name, {
              value: null,
              [valueName]: !!changedValue?.data?.length,
            });
            break;
          case 'unzr':
            handleUpdateField(name, { value: changedValue });
            break;
          default:
            break;
        }
      };

      processList.hasOrSet('handleChangeUnzr_user_info_control', action);
    },
    [name, handleUpdateField],
  );

  const isNoUnzr = React.useMemo(() => {
    return value?.[name]?.isNoUnzr;
  }, [value, name]);

  const hiddenInNoUnzr = React.useMemo(() => {
    return value?.passport && value?.passport?.type === 'idCard';
  }, [value]);

  const unzrText = 'немає унзр';

  return (
    <>
      {fields?.includes(name) ? (
        <>
          <SchemaForm
            schema={{
              type: 'object',
              properties: {
                unzr: {
                  control: 'form.group',
                  blockDisplay: false,
                  outlined: false,
                  properties: {
                    unzr: {
                      type: 'string',
                      description: t(name),
                      maxLength: maxLength || 255,
                      notRequiredLabel: '',
                      sample: sample || undefined,
                      mask: mask || undefined,
                      pattern: pattern || undefined,
                      checkHidden: isNoUnzr,
                    },
                  },
                },
                isNoUnzr: {
                  type: 'array',
                  control: 'checkbox.group',
                  secondary: true,
                  withIndex: false,
                  hiddenParent: true,
                  hiddenKorpus: true,
                  items: [
                    {
                      id: unzrText,
                      title: t('noUnzr'),
                    },
                  ],
                  rowDirection: true,
                  checkHidden: hiddenInNoUnzr,
                },
              },
            }}
            noMargin={noMargin}
            errors={errors}
            value={{
              unzr: {
                unzr: value?.[name]?.value || '',
              },
              isNoUnzr: value?.[name]?.isNoUnzr ? [unzrText] : [],
            }}
            onChange={handleChangeUnzr}
            readOnly={readOnly}
            actions={actions}
          />
          <div className={classNames(classes.centerMarginBottom)}>
            <Disclaimer noMargin={true} text={t('unzrText')} />
          </div>
        </>
      ) : null}
    </>
  );
};

export default RenderUnzrField;

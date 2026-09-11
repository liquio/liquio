import React from 'react';
import { useTranslate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';
import Disclaimer from 'components/Disclaimer';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';

const styles = {
  infoMessage: {
    marginTop: 0,
    marginBottom: 40,
    display: 'flex',
    padding: '26px 24px',
    maxWidth: '640px',
  },
  root: {
    marginBottom: 30,
  },
};

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
  classes,
  readOnly,
}) => {
  const t = useTranslate('VerifiedUserInfo');

  return (
    <>
      {fields?.includes(name) ? (
        <>
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
              [name]: value?.birthday?.place || '',
            }}
            onChange={(_, value) =>
              handleUpdateField(['birthday', 'place'], value)
            }
            className={classNames(classes.root)}
            readOnly={readOnly}
          />
          <Disclaimer
            text={t('birthdayMessage')}
            className={classNames(classes.infoMessage)}
          />
        </>
      ) : null}
    </>
  );
};
const styled = withStyles(styles)(RenderTextField);
export default styled;

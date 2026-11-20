import React from 'react';
import { useTranslate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';
import Disclaimer from 'components/Disclaimer';
import classNames from 'classnames';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

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

interface RenderPlaceFieldOwnProps {
  name: string;
  noMargin?: boolean;
  fields?: string[];
  errors?: unknown[];
  value?: { birthday?: { place?: unknown } };
  handleUpdateField: (name: string | string[], value: unknown) => void;
  maxLength?: number;
  sample?: string;
  mask?: string;
  pattern?: string;
  readOnly?: boolean;
  t?: unknown;
}

type RenderPlaceFieldProps = RenderPlaceFieldOwnProps & WithStyles<typeof styles>;

const RenderPlaceField = ({
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
}: RenderPlaceFieldProps) => {
  const t = useTranslate('VerifiedUserInfo');

  return fields?.includes(name) ? (
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
        onChange={(_: unknown, nextValue: unknown) =>
          handleUpdateField(['birthday', 'place'], nextValue)
        }
        className={classNames(classes.root)}
        readOnly={readOnly}
      />
      <Disclaimer
        text={t('birthdayMessage')}
        className={classNames(classes.infoMessage)}
      />
    </>
  ) : null;
};

export default withStyles(styles)(RenderPlaceField);

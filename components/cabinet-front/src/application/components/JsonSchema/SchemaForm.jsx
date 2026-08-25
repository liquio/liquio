import React from 'react';
import { connect } from 'react-redux';

import CoreSchemaForm from 'core/components/JsonSchema/SchemaForm';
import { resolveLocalizationText } from 'helpers/localization';

const LOCALIZED_STRING_PROPS = [
  'description',
  'sample',
  'htmlBlock',
  'htmlBlockHelper',
  'notRequiredLabel',
  'placeholder',
  'customValueText',
  'title',
  'name',
  'stringified',
  'errorText',
  'value'
];

const LOCALIZATION_KEY_REGEX = /[A-Z0-9]+(?:_[A-Z0-9]+)+/;
const STRING_LITERAL_LOCALIZATION_KEY_REGEX =
  /(['"])([A-Z0-9]+(?:_[A-Z0-9]+)+)\1/g;
const LOCALIZATION_KEY_ALIASES = {
  LANG_TAX_IDENTIFICATION: 'LANG_TAX_IDENTIFICATION_NUMBER'
};

const withLocalizationAliases = (localizationTexts = []) => {
  if (!Array.isArray(localizationTexts)) return localizationTexts;

  const aliases = Object.entries(LOCALIZATION_KEY_ALIASES)
    .map(([aliasKey, sourceKey]) => {
      const sourceText = localizationTexts.find((item) => item?.key === sourceKey);

      return sourceText ? { ...sourceText, key: aliasKey } : null;
    })
    .filter(Boolean);

  return localizationTexts.concat(aliases);
};

const localize = (value, localizationTexts) =>
  resolveLocalizationText(value, {
    localizationTexts: withLocalizationAliases(localizationTexts)
  });

const localizeGetSample = (getSample, localizationTexts) => {
  if (typeof getSample !== 'string' || !LOCALIZATION_KEY_REGEX.test(getSample)) {
    return getSample;
  }

  return getSample.replace(
    STRING_LITERAL_LOCALIZATION_KEY_REGEX,
    (match, quote, key) => {
      const translated = localize(key, localizationTexts);

      if (translated === key) return match;

      return `${quote}${translated.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), `\\${quote}`)}${quote}`;
    }
  );
};

const localizeSchema = (schema, localizationTexts) => {
  if (Array.isArray(schema)) {
    return schema.map((item) => localizeSchema(item, localizationTexts));
  }

  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  return Object.entries(schema).reduce((acc, [key, value]) => {
    if (key === 'getSample') {
      acc[key] = localizeGetSample(value, localizationTexts);
      return acc;
    }

    if (typeof value === 'string' && LOCALIZED_STRING_PROPS.includes(key)) {
      acc[key] = localize(value, localizationTexts);
      return acc;
    }

    if (value && typeof value === 'object') {
      acc[key] = localizeSchema(value, localizationTexts);
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
};

const SchemaForm = ({ schema, localizationTexts, ...props }) => {
  const localizedSchema = React.useMemo(
    () => localizeSchema(schema, localizationTexts),
    [schema, localizationTexts]
  );

  return <CoreSchemaForm {...props} schema={localizedSchema} />;
};

const mapStateToProps = ({ app: { localizationTexts } = {} }) => ({
  localizationTexts
});

export default connect(mapStateToProps)(SchemaForm);

import React from 'react';
import { connect } from 'react-redux';

import CoreTextBlock from 'core/components/JsonSchema/elements/TextBlock';
import { resolveLocalizationText } from 'helpers/localization';

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

const TextBlock = ({
  htmlBlock,
  htmlBlockHelper,
  value,
  localizationTexts,
  ...props
}) => (
  <CoreTextBlock
    {...props}
    htmlBlock={localize(htmlBlock, localizationTexts)}
    htmlBlockHelper={localize(htmlBlockHelper, localizationTexts)}
    value={localize(value, localizationTexts)}
  />
);

const mapStateToProps = ({ app: { localizationTexts } = {} }) => ({
  localizationTexts
});

export default connect(mapStateToProps)(TextBlock);

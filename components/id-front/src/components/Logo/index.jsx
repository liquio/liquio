import React from 'react';
import { translate } from 'react-translate';
import theme from 'themes';

const Logo = ({ t }) => {
  if (!theme?.headerImage) {
    return null;
  }

  const isBase64 = typeof theme?.headerImage === 'string' && theme?.headerImage?.includes('data:image');

  if (isBase64) {
    return <img src={theme.headerImage} alt={t('logo')} style={{ height: '100%' }} />;
  }

  const isReactComponent = typeof theme?.headerImage === 'function';

  if (isReactComponent) {
    return <theme.headerImage />;
  }

  return null;
};

export default translate('Layout')(Logo);

import React from 'react';
import type { ComponentType } from 'react';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import theme from 'themes';

interface LogoProps {
  t: Translate;
}

// The bpmn theme has no `headerImage`, but a deployment theme may define one: a base64 data URI string or a
// React component. The theme object is inferred, so the optional field is read through this local widening.
type ThemeWithHeaderImage = { headerImage?: unknown };

const Logo = ({ t }: LogoProps) => {
  const headerImage = (theme as ThemeWithHeaderImage)?.headerImage;

  if (!headerImage) {
    return null;
  }

  const isBase64 = typeof headerImage === 'string' && headerImage.includes('data:image');

  if (isBase64) {
    return <img src={headerImage as string} alt={t('logo')} style={{ height: '100%' }} />;
  }

  const isReactComponent = typeof headerImage === 'function';

  if (isReactComponent) {
    const HeaderImage = headerImage as ComponentType;
    return <HeaderImage />;
  }

  return null;
};

export default translate('Layout')(Logo);

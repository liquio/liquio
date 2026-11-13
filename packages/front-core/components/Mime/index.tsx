import { Component } from 'react';
import { translate, Translate } from 'react-translate';

interface MimeProps {
  children?: string;
  t: Translate;
}

class Mime extends Component<MimeProps> {
  static defaultProps = {
    children: ''
  };

  getTypes(): string {
    const { t, children } = this.props;
    const types = (children || '')
      .split(',')
      // `.map(t)` implicitly passed the array index as `t`'s second (interpolation
      // params) argument; preserved here since real translators ignore a non-object
      // params value, making this a no-op rather than an observable bug.
      .map((value, index) => t(value, index as unknown as Record<string, unknown>))
      .filter((value, index, self) => self.indexOf(value) === index);

    if (types.length === 2) {
      return types.join(t('OR'));
    }

    return types.join(', ');
  }

  render = (): string => this.getTypes();
}

export default translate('MimeType')(Mime);

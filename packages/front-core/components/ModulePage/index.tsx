import { Component } from 'react';

import { getConfig } from 'core/helpers/configLoader';

export interface ModulePageProps {
  t?: (key: string) => string;
  title?: string;
}

export default class ModulePage<P extends ModulePageProps = ModulePageProps> extends Component<P> {
  // Subclasses may define this method to compute a dynamic page title.
  protected componentGetTitle?: (params: { returnTitle: boolean }) => string;

  componentDidMount(): void {
    this.updatePageTitle();
  }

  componentDidUpdate(): void {
    this.updatePageTitle();
  }

  updatePageTitle(): void {
    const { t, title } = this.props;
    let documentTitle;

    if (t && title) {
      documentTitle = t(title);
    }

    if (this.componentGetTitle) {
      documentTitle = this.componentGetTitle({
        returnTitle: true
      });
    }

    if (!documentTitle) {
      return;
    }

    if (typeof documentTitle !== 'string') return;

    const config = getConfig();
    document.title = [documentTitle, config.application.name].filter(Boolean).join(' - ');
  }
}

import React from 'react';
import { getConfig } from 'core/helpers/configLoader';

interface WebChatConfig {
  dataUrl: string;
  channelId: string;
  id: string;
}

export default class WebChat extends React.Component {
  componentDidMount(): void {
    const config = getConfig() as { webChat?: WebChatConfig };
    if (!config.webChat) {
      return;
    }
    const script = document.createElement('script');
    script.setAttribute('src', config.webChat.dataUrl);
    script.setAttribute('channelId', config.webChat.channelId);
    script.setAttribute('id', config.webChat.id);

    document.body.appendChild(script);
  }

  render(): null {
    return null;
  }
}

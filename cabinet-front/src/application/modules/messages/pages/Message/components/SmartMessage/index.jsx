import React from 'react';
import Mustache from 'mustache';

import EncryptedMessage from 'modules/messages/components/EncryptedMessage';

import tokens from './tokens';

const TAGS = ['{{', '}}'];

const renderToken = ([tokenName, tokenBody], index) => {
  const TokenComponent = tokens[tokenName];

  if (!TokenComponent) {
    return <div>{`${tokenName} token not defined`}</div>;
  }

  return <TokenComponent key={index} body={tokenBody} params={{ disableTabIndex: true }} />;
};

export default ({ template, message, ...rest }) => {
  if (message && message.messageCryptTypeId) {
    return <EncryptedMessage {...rest} message={message} />;
  }

  try {
    return Mustache.parse(template, TAGS).map(renderToken);
  } catch (e) {
    return `Template error => ${e.message}`;
  }
};

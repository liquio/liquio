import React from 'react';
import Mustache from 'mustache';

import EncryptedMessageRaw from 'modules/messages/components/EncryptedMessage';

import tokens from './tokens';

const TAGS: [string, string] = ['{{', '}}'];

interface MessageLike {
  messageCryptTypeId?: unknown;
  [key: string]: unknown;
}

interface SmartMessageProps {
  template: string;
  message?: MessageLike;
  [key: string]: unknown;
}

const renderToken = ([tokenName, tokenBody]: [string, string], index: number) => {
  const TokenComponent = tokens[tokenName];

  if (!TokenComponent) {
    return <div key={index}>{`${tokenName} token not defined`}</div>;
  }

  return <TokenComponent key={index} body={tokenBody} params={{ disableTabIndex: true }} />;
};

export default ({ template, message, ...rest }: SmartMessageProps) => {
  if (message && message.messageCryptTypeId) {
    return <EncryptedMessageRaw {...(rest as Record<string, unknown>)} message={message} />;
  }

  try {
    return Mustache.parse(template, TAGS).map((token, index) =>
      renderToken(token as unknown as [string, string], index)
    );
  } catch (e) {
    return `Template error => ${(e as Error).message}`;
  }
};

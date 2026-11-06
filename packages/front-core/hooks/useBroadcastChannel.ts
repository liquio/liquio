import { useEffect } from 'react';

const useBroadcastChannel = (
  channelNameRaw: string | string[] = [],
  onMessage: (data: unknown) => void,
) => {
  const channelName = ([] as string[]).concat(channelNameRaw).join();
  const channel = new BroadcastChannel(channelName);

  useEffect(() => {
    channel.onmessage = (event) => {
      onMessage(JSON.parse(event.data));
    };

    return () => {
      channel.close();
    };
  }, [channel, onMessage]);

  return (message: unknown) => {
    channel.postMessage(JSON.stringify(message));
  };
};

export default useBroadcastChannel;

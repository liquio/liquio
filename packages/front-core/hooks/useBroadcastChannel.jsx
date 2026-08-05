import { useEffect } from 'react';

const useBroadcastChannel = (channelNameRaw = [], onMessage) => {
  const channelName = [].concat(channelNameRaw).join();
  const channel = new BroadcastChannel(channelName);

  useEffect(() => {
    channel.onmessage = (event) => {
      onMessage(JSON.parse(event.data));
    };

    return () => {
      channel.close();
    };
  }, [channel, onMessage]);

  return (message) => {
    channel.postMessage(JSON.stringify(message));
  };
};

export default useBroadcastChannel;

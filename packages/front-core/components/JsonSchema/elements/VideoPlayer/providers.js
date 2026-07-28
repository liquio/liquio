import React from 'react';
import YouTube from 'react-youtube';

export const extractYoutubeId = (source) => {
  if (!source) {
    return '';
  }

  const rawSource = String(source).trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(rawSource)) {
    return rawSource;
  }

  try {
    const url = new URL(rawSource);

    if (url.hostname.includes('youtu.be')) {
      return url.pathname.split('/').filter(Boolean)[0] || '';
    }

    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/').filter(Boolean)[1] || '';
      }

      return url.searchParams.get('v') || '';
    }
  } catch (error) {
    return '';
  }

  return '';
};

const VIDEO_PROVIDERS = {
  youtube: {
    extractVideoId: extractYoutubeId,
    states: {
      '-1': 'unstarted',
      0: 'completed',
      1: 'play',
      2: 'pause',
      3: 'buffering',
      5: 'cued',
    },
    render: ({ player, captions, classes }) => (
      <YouTube
        videoId={player.resolvedVideoId}
        className={classes.root}
        iframeClassName={classes.iframe}
        title={player.labels.title}
        onReady={player.handleReady}
        onStateChange={player.handleStateChange}
        onError={player.handleError}
        opts={{
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            fs: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            cc_load_policy: captions ? 1 : 0,
          },
        }}
      />
    ),
  },
};

export default VIDEO_PROVIDERS;

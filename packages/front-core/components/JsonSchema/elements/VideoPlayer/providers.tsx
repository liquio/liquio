import React from 'react';
import YouTube from 'react-youtube';
import { UseVideoPlayerResult } from './useVideoPlayer';

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

const asValidId = (id?: string | null) => (YOUTUBE_ID_PATTERN.test(id || '') ? (id as string) : '');

export const extractYoutubeId = (source?: string): string => {
  if (!source) {
    return '';
  }

  const rawSource = String(source).trim();

  if (YOUTUBE_ID_PATTERN.test(rawSource)) {
    return rawSource;
  }

  try {
    const url = new URL(rawSource);

    if (url.hostname.includes('youtu.be')) {
      return asValidId(url.pathname.split('/').filter(Boolean)[0]);
    }

    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')) {
        return asValidId(url.pathname.split('/').filter(Boolean)[1]);
      }

      return asValidId(url.searchParams.get('v'));
    }
  } catch {
    return '';
  }

  return '';
};

interface VideoProvider {
  extractVideoId: (source?: string) => string;
  states: Record<string, string>;
  render: (props: { player: UseVideoPlayerResult; captions?: boolean; classes: Record<string, string> }) => React.ReactNode;
}

const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
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

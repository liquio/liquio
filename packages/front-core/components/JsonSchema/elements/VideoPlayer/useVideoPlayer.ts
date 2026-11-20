import React from 'react';

import evaluate from 'helpers/evaluate';
import { ChangeEvent } from 'components/JsonSchema';

interface WatchedRange {
  start: number;
  end: number;
}

interface VideoPlaybackValue {
  source?: string;
  videoId?: string;
  playback?: {
    watchedRanges?: WatchedRange[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface VideoProgress {
  currentTime: number;
  duration: number;
  percentWatched: number;
  completed: boolean;
  thresholdReached: boolean;
}

interface VideoPlayerLabels {
  region: string;
  title: string;
  invalid: string;
  loadError: string;
  started: string;
  paused: string;
  completed: string;
  error: string;
}

interface YoutubePlayerLike {
  getCurrentTime?: () => Promise<number> | number;
  getDuration?: () => Promise<number> | number;
  getPlaybackRate?: () => Promise<number> | number;
  getIframe?: () => Promise<HTMLIFrameElement> | HTMLIFrameElement | null;
  loadModule?: (name: string) => void;
}

interface ProviderConfig {
  extractVideoId?: (source: string) => string;
  states?: Record<string, string>;
  render: (props: { player: UseVideoPlayerResult; captions?: boolean; classes: Record<string, string> }) => React.ReactNode;
}

interface UseVideoPlayerArgs {
  ariaLabel?: string;
  captions?: boolean;
  completePercent?: number;
  onChange?: ((event: unknown) => void) | null;
  provider?: string;
  providerConfig?: ProviderConfig;
  rootDocument?: { data: Record<string, unknown> };
  stepName?: string;
  t: (key: string) => string;
  title?: string;
  trackProgress?: boolean;
  url?: string;
  value?: unknown;
  videoId?: string;
}

export interface UseVideoPlayerResult {
  announcement: string;
  handleError: () => void;
  handleReady: (event: { target: YoutubePlayerLike }) => Promise<void>;
  handleStateChange: (event: { data: string | number }) => Promise<void>;
  hasError: boolean;
  labels: VideoPlayerLabels;
  playerError: string;
  progress: VideoProgress;
  resolvedVideoId: string;
  status: string;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

const getText = (t: ((key: string) => string) | undefined, key: string, fallback: string) => {
  const translated = typeof t === 'function' ? t(key) : key;
  return translated && translated !== key ? translated : fallback;
};

const isEvaluateError = (value: unknown) =>
  value instanceof Error || (value as { name?: string })?.name === 'EvaluateError';

const WATCH_INTERVAL_TOLERANCE_SECONDS = 1.5;

const normalizeWatchedRanges = (ranges: unknown, duration = 0): WatchedRange[] => {
  if (!Array.isArray(ranges)) {
    return [];
  }

  return ranges
    .map((range) => {
      const start = Number((range as Partial<WatchedRange>)?.start);
      const end = Number((range as Partial<WatchedRange>)?.end);

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return null;
      }

      return {
        start: Math.max(0, Math.min(start, duration || start)),
        end: Math.max(0, Math.min(end, duration || end)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a as WatchedRange).start - (b as WatchedRange).start)
    .reduce((merged: WatchedRange[], range) => {
      const previous = merged[merged.length - 1];

      if (!previous || (range as WatchedRange).start > previous.end) {
        return merged.concat(range as WatchedRange);
      }

      return merged
        .slice(0, -1)
        .concat({ ...previous, end: Math.max(previous.end, (range as WatchedRange).end) });
    }, []);
};

const getWatchedDuration = (ranges: WatchedRange[]) =>
  ranges.reduce((total, range) => total + range.end - range.start, 0);

const evaluateSource = ({ source, rootDocument, stepName, value }: { source: unknown; rootDocument?: { data: Record<string, unknown> }; stepName?: string; value: unknown }): string => {
  if (typeof source !== 'string') {
    return source as string;
  }

  const evaluated = evaluate(
    source,
    rootDocument?.data?.[stepName as string],
    rootDocument?.data,
    value,
  );

  return isEvaluateError(evaluated) ? source : (evaluated as string);
};

const buildPlaybackValue = ({
  currentValue,
  provider,
  source,
  videoId,
  status,
  duration,
  currentTime,
  percentWatched,
  watchedRanges,
  completed,
  thresholdReached,
  eventLog,
}: {
  currentValue: unknown;
  provider?: string;
  source: string;
  videoId: string;
  status: string;
  duration: number;
  currentTime: number;
  percentWatched: number;
  watchedRanges: WatchedRange[];
  completed: boolean;
  thresholdReached: boolean;
  eventLog: unknown[];
}): VideoPlaybackValue => {
  const base: VideoPlaybackValue =
    currentValue &&
    typeof currentValue === 'object' &&
    !Array.isArray(currentValue)
      ? (currentValue as VideoPlaybackValue)
      : { source };

  return {
    ...base,
    provider,
    source: base.source || source,
    videoId,
    playback: {
      ...(base.playback || {}),
      status,
      duration,
      currentTime,
      percentWatched,
      watchedRanges,
      completed,
      thresholdReached,
      events: eventLog,
      updatedAt: new Date().toISOString(),
    },
  };
};

const useVideoPlayer = ({
  ariaLabel,
  captions,
  completePercent = 90,
  onChange,
  provider,
  providerConfig,
  rootDocument,
  stepName,
  t,
  title,
  trackProgress,
  url,
  value,
  videoId,
}: UseVideoPlayerArgs): UseVideoPlayerResult => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<YoutubePlayerLike | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const progressTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const eventLogRef = React.useRef<unknown[]>([]);
  const watchedRangesRef = React.useRef<WatchedRange[]>([]);
  const lastPlaybackSampleRef = React.useRef<{ currentTime: number; checkedAt: number } | null>(null);
  const initializedVideoIdRef = React.useRef('');
  const [status, setStatus] = React.useState('unstarted');
  const [playerError, setPlayerError] = React.useState('');
  const [announcement, setAnnouncement] = React.useState('');
  const [progress, setProgress] = React.useState<VideoProgress>({
    currentTime: 0,
    duration: 0,
    percentWatched: 0,
    completed: false,
    thresholdReached: false,
  });

  const source = React.useMemo(() => {
    const rawValue =
      value && typeof value === 'object'
        ? (value as VideoPlaybackValue).source || (value as VideoPlaybackValue).videoId
        : value;

    return evaluateSource({
      source: videoId || url || rawValue,
      rootDocument,
      stepName,
      value,
    });
  }, [rootDocument, stepName, url, value, videoId]);

  const resolvedVideoId = React.useMemo(
    () => providerConfig?.extractVideoId?.(source) || '',
    [providerConfig, source],
  );

  React.useEffect(() => {
    if (initializedVideoIdRef.current === resolvedVideoId) {
      return;
    }

    initializedVideoIdRef.current = resolvedVideoId;
    watchedRangesRef.current = normalizeWatchedRanges(
      (value as VideoPlaybackValue)?.playback?.watchedRanges,
    );
    lastPlaybackSampleRef.current = null;
  }, [resolvedVideoId, value]);

  const labels: VideoPlayerLabels = React.useMemo(
    () => ({
      region: ariaLabel || getText(t, 'VideoPlayerRegion', 'Video player'),
      title: title || getText(t, 'VideoPlayerTitle', 'Embedded video'),
      invalid: providerConfig
        ? getText(t, 'InvalidVideoPlayer', 'Video URL or ID is invalid.')
        : getText(
            t,
            'UnsupportedVideoProvider',
            'Video provider is not supported.',
          ),
      loadError: getText(
        t,
        'VideoPlayerLoadError',
        'The video could not be played.',
      ),
      started: getText(t, 'VideoStarted', 'Video playback started.'),
      paused: getText(t, 'VideoPaused', 'Video playback paused.'),
      completed: getText(t, 'VideoCompleted', 'Video playback completed.'),
      error: getText(t, 'VideoError', 'Video playback error.'),
    }),
    [ariaLabel, providerConfig, t, title],
  );

  const clearProgressTimer = React.useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const persistPlayback = React.useCallback(
    (nextStatus: string, nextProgress: VideoProgress = progress) => {
      if (!trackProgress || !resolvedVideoId) {
        return;
      }

      onChange?.(
        new ChangeEvent(
          buildPlaybackValue({
            currentValue: value,
            provider,
            source,
            videoId: resolvedVideoId,
            status: nextStatus,
            duration: nextProgress.duration,
            currentTime: nextProgress.currentTime,
            percentWatched: nextProgress.percentWatched,
            watchedRanges: watchedRangesRef.current,
            completed: nextProgress.completed,
            thresholdReached: nextProgress.thresholdReached,
            eventLog: eventLogRef.current,
          }),
          true,
        ) as unknown,
      );
    },
    [
      onChange,
      progress,
      provider,
      resolvedVideoId,
      source,
      trackProgress,
      value,
    ],
  );

  const logPlaybackEvent = React.useCallback(
    (type: string, nextProgress: VideoProgress = progress) => {
      const entry = {
        type,
        videoId: resolvedVideoId,
        currentTime: nextProgress.currentTime,
        duration: nextProgress.duration,
        percentWatched: nextProgress.percentWatched,
        createdAt: new Date().toISOString(),
      };

      eventLogRef.current = eventLogRef.current.concat(entry).slice(-50);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('jsonSchemaVideoPlayerEvent', { detail: entry }),
        );
      }
    },
    [progress, resolvedVideoId],
  );

  const readPlayerProgress = React.useCallback(
    async ({ trackCoverage = false }: { trackCoverage?: boolean } = {}): Promise<VideoProgress> => {
      const player = playerRef.current;

      if (!player?.getCurrentTime || !player?.getDuration) {
        return progress;
      }

      const currentTime = (await player.getCurrentTime()) || 0;
      const duration = (await player.getDuration()) || 0;
      const playbackRate = (await player.getPlaybackRate?.()) || 1;
      const now = Date.now();
      const previousSample = lastPlaybackSampleRef.current;

      if (trackCoverage && duration > 0) {
        if (previousSample && currentTime > previousSample.currentTime) {
          const elapsedSeconds = (now - previousSample.checkedAt) / 1000;
          const playbackDelta = currentTime - previousSample.currentTime;
          const isContinuousPlayback =
            playbackDelta <=
            elapsedSeconds * playbackRate + WATCH_INTERVAL_TOLERANCE_SECONDS;

          if (isContinuousPlayback) {
            watchedRangesRef.current = normalizeWatchedRanges(
              watchedRangesRef.current.concat({
                start: previousSample.currentTime,
                end: currentTime,
              }),
              duration,
            );
          }
        }

        lastPlaybackSampleRef.current = { currentTime, checkedAt: now };
      }

      const watchedDuration = getWatchedDuration(watchedRangesRef.current);
      const percentWatched = duration
        ? Math.min(100, (watchedDuration / duration) * 100)
        : 0;
      const completed = duration > 0 && currentTime >= duration - 1;
      const thresholdReached = percentWatched >= completePercent;
      const nextProgress = {
        currentTime,
        duration,
        percentWatched,
        completed,
        thresholdReached,
      };

      setProgress(nextProgress);
      return nextProgress;
    },
    [completePercent, progress],
  );

  const startProgressTimer = React.useCallback(
    (activeStatus: string) => {
      clearProgressTimer();
      progressTimerRef.current = setInterval(async () => {
        const nextProgress = await readPlayerProgress({ trackCoverage: true });
        persistPlayback(activeStatus, nextProgress);
      }, 5000);
    },
    [clearProgressTimer, persistPlayback, readPlayerProgress],
  );

  React.useEffect(() => () => clearProgressTimer(), [clearProgressTimer]);

  const handleReady = React.useCallback(
    async (event: { target: YoutubePlayerLike }) => {
      playerRef.current = event.target;
      iframeRef.current = (await event.target?.getIframe?.()) || null;

      if (iframeRef.current) {
        iframeRef.current.setAttribute('tabindex', '0');
      }

      if (captions) {
        event.target?.loadModule?.('captions');
      }
    },
    [captions],
  );

  const handleStateChange = React.useCallback(
    async (event: { data: string | number }) => {
      const nextStatus = providerConfig?.states?.[event.data] || 'unstarted';
      const nextProgress = await readPlayerProgress({
        trackCoverage: status === 'play' && nextStatus !== 'play',
      });

      setStatus(nextStatus);

      if (nextStatus === 'play') {
        const isFirstPlaySample = lastPlaybackSampleRef.current === null;

        lastPlaybackSampleRef.current = {
          currentTime: isFirstPlaySample ? 0 : nextProgress.currentTime,
          checkedAt: Date.now(),
        };
        logPlaybackEvent('play', nextProgress);
        persistPlayback(nextStatus, nextProgress);
        setAnnouncement(labels.started);
        startProgressTimer(nextStatus);
      } else if (nextStatus === 'pause') {
        clearProgressTimer();
        logPlaybackEvent('pause', nextProgress);
        persistPlayback(nextStatus, nextProgress);
        setAnnouncement(labels.paused);
      } else if (nextStatus === 'completed') {
        watchedRangesRef.current = normalizeWatchedRanges(
          watchedRangesRef.current.concat({
            start: nextProgress.currentTime,
            end: nextProgress.duration,
          }),
          nextProgress.duration,
        );

        const watchedDuration = getWatchedDuration(watchedRangesRef.current);
        const percentWatched = nextProgress.duration
          ? Math.min(100, (watchedDuration / nextProgress.duration) * 100)
          : nextProgress.percentWatched;

        const completedProgress = {
          ...nextProgress,
          percentWatched,
          completed: true,
          thresholdReached: percentWatched >= completePercent,
        };

        clearProgressTimer();
        setProgress(completedProgress);
        logPlaybackEvent('completed', completedProgress);
        persistPlayback(nextStatus, completedProgress);
        setAnnouncement(labels.completed);
      } else {
        persistPlayback(nextStatus, nextProgress);
      }
    },
    [
      clearProgressTimer,
      labels.completed,
      labels.paused,
      labels.started,
      completePercent,
      logPlaybackEvent,
      persistPlayback,
      providerConfig,
      readPlayerProgress,
      startProgressTimer,
      status,
    ],
  );

  const handleError = React.useCallback(() => {
    clearProgressTimer();
    setStatus('error');
    setPlayerError(labels.loadError);
    setAnnouncement(labels.error);
    logPlaybackEvent('error');
    persistPlayback('error');
  }, [
    clearProgressTimer,
    labels.error,
    labels.loadError,
    logPlaybackEvent,
    persistPlayback,
  ]);

  return {
    announcement,
    handleError,
    handleReady,
    handleStateChange,
    hasError: !providerConfig || !!playerError || !resolvedVideoId,
    labels,
    playerError,
    progress,
    resolvedVideoId,
    status,
    wrapperRef,
  };
};

export default useVideoPlayer;

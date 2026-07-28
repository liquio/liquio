import React from 'react';

import evaluate from 'helpers/evaluate';
import { ChangeEvent } from 'components/JsonSchema';

const getText = (t, key, fallback) => {
  const translated = typeof t === 'function' ? t(key) : key;
  return translated && translated !== key ? translated : fallback;
};

const isEvaluateError = (value) =>
  value instanceof Error || value?.name === 'EvaluateError';

const WATCH_INTERVAL_TOLERANCE_SECONDS = 1.5;

const normalizeWatchedRanges = (ranges, duration = 0) => {
  if (!Array.isArray(ranges)) {
    return [];
  }

  return ranges
    .map((range) => {
      const start = Number(range?.start);
      const end = Number(range?.end);

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return null;
      }

      return {
        start: Math.max(0, Math.min(start, duration || start)),
        end: Math.max(0, Math.min(end, duration || end)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start)
    .reduce((merged, range) => {
      const previous = merged[merged.length - 1];

      if (!previous || range.start > previous.end) {
        return merged.concat(range);
      }

      return merged
        .slice(0, -1)
        .concat({ ...previous, end: Math.max(previous.end, range.end) });
    }, []);
};

const getWatchedDuration = (ranges) =>
  ranges.reduce((total, range) => total + range.end - range.start, 0);

const evaluateSource = ({ source, rootDocument, stepName, value }) => {
  if (typeof source !== 'string') {
    return source;
  }

  const evaluated = evaluate(
    source,
    rootDocument?.data?.[stepName],
    rootDocument?.data,
    value,
  );

  return isEvaluateError(evaluated) ? source : evaluated;
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
}) => {
  const base =
    currentValue &&
    typeof currentValue === 'object' &&
    !Array.isArray(currentValue)
      ? currentValue
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
  completePercent,
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
}) => {
  const wrapperRef = React.useRef(null);
  const playerRef = React.useRef(null);
  const iframeRef = React.useRef(null);
  const progressTimerRef = React.useRef(null);
  const eventLogRef = React.useRef([]);
  const watchedRangesRef = React.useRef([]);
  const lastPlaybackSampleRef = React.useRef(null);
  const initializedVideoIdRef = React.useRef('');
  const [status, setStatus] = React.useState('unstarted');
  const [playerError, setPlayerError] = React.useState('');
  const [announcement, setAnnouncement] = React.useState('');
  const [progress, setProgress] = React.useState({
    currentTime: 0,
    duration: 0,
    percentWatched: 0,
    completed: false,
    thresholdReached: false,
  });

  const source = React.useMemo(() => {
    const rawValue =
      value && typeof value === 'object'
        ? value.source || value.videoId
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
      value?.playback?.watchedRanges,
    );
    lastPlaybackSampleRef.current = null;
  }, [resolvedVideoId, value]);

  const labels = React.useMemo(
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
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const persistPlayback = React.useCallback(
    (nextStatus, nextProgress = progress) => {
      if (!trackProgress || !resolvedVideoId) {
        return;
      }

      onChange(
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
        ),
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
    (type, nextProgress = progress) => {
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
    async ({ trackCoverage = false } = {}) => {
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
    (activeStatus) => {
      clearProgressTimer();
      progressTimerRef.current = window.setInterval(async () => {
        const nextProgress = await readPlayerProgress({ trackCoverage: true });
        persistPlayback(activeStatus, nextProgress);
      }, 5000);
    },
    [clearProgressTimer, persistPlayback, readPlayerProgress],
  );

  React.useEffect(() => () => clearProgressTimer(), [clearProgressTimer]);

  const handleReady = React.useCallback(
    async (event) => {
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
    async (event) => {
      const nextStatus = providerConfig?.states?.[event.data] || 'unstarted';
      const nextProgress = await readPlayerProgress({
        trackCoverage: status === 'play' && nextStatus !== 'play',
      });

      setStatus(nextStatus);

      if (nextStatus === 'play') {
        lastPlaybackSampleRef.current = {
          currentTime: nextProgress.currentTime,
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
        const completedProgress = {
          ...nextProgress,
          completed: true,
          thresholdReached: nextProgress.percentWatched >= completePercent,
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

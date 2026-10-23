import React from 'react';
import { useTranslate } from 'react-translate';
import { Alert, Box } from '@mui/material';

import { ElementGroupContainer } from 'components/JsonSchema';

import VIDEO_PROVIDERS from './providers';
import useStyles from './styles';
import useVideoPlayer from './useVideoPlayer';

const fitWithinContainer = (size?: string | number | null) => {
  if (size === undefined || size === null || size === ('' as unknown)) {
    return size;
  }

  if (typeof size === 'number') {
    return `min(${size}px, 100%)`;
  }

  if (typeof size === 'string') {
    return `min(${size}, 100%)`;
  }

  return size;
};

interface VideoPlayerProps {
  hidden?: boolean;
  description?: string | React.ReactNode | null;
  sample?: string | React.ReactNode | null;
  required?: boolean;
  error?: unknown;
  path?: Array<string | number>;
  jsonSchema?: { fullWidth?: boolean } | null;
  notRequiredLabel?: string;
  className?: string;
  rootDocument?: { data: Record<string, unknown> };
  stepName?: string;
  value?: unknown;
  onChange?: ((event: unknown) => void) | null;
  videoId?: string;
  url?: string;
  provider?: string;
  title?: string;
  ariaLabel?: string;
  width?: string | number;
  maxWidth?: string | number;
  height?: string | number;
  completePercent?: number;
  trackProgress?: boolean;
  captions?: boolean;
  noMargin?: boolean;
}

const VideoPlayer = ({
  hidden = false,
  description = null,
  sample = null,
  required = false,
  error = null,
  path = [],
  jsonSchema = null,
  notRequiredLabel = '',
  className = '',
  rootDocument = { data: {} },
  stepName = '',
  value = '',
  onChange = () => null,
  videoId = '',
  url = '',
  provider = 'youtube',
  title = '',
  ariaLabel = '',
  width,
  maxWidth,
  height,
  completePercent = 90,
  trackProgress = false,
  captions = false,
  noMargin = false,
}: VideoPlayerProps) => {
  const classes = useStyles();
  const t = useTranslate('JsonSchemaEditor');
  const normalizedProvider = String(provider || 'youtube').toLowerCase();
  const providerConfig = VIDEO_PROVIDERS[normalizedProvider];

  const player = useVideoPlayer({
    ariaLabel,
    captions,
    completePercent,
    onChange,
    provider: normalizedProvider,
    providerConfig,
    rootDocument,
    stepName,
    t,
    title,
    trackProgress,
    url,
    value,
    videoId,
  });

  if (hidden) {
    return null;
  }

  const playerFrameStyle = height
    ? { height, paddingTop: 0 }
    : undefined;
  const containerWidth = fitWithinContainer(width);
  const containerMaxWidth = fitWithinContainer(maxWidth);

  return (
    <ElementGroupContainer
      description={description as string}
      sample={sample as string}
      required={required}
      error={error}
      path={path}
      className={className}
      jsonSchema={jsonSchema as { fullWidth?: boolean }}
      notRequiredLabel={notRequiredLabel}
      fullWidth
      noMargin={noMargin}
      width={containerWidth as string | number | null}
      maxWidth={containerMaxWidth as number | null}
    >
      <Box
        ref={player.wrapperRef}
        className={classes.region}
        role="region"
        aria-label={player.labels.region}
      >
        <Box className={classes.liveRegion} aria-live="polite" aria-atomic="true">
          {player.announcement}
        </Box>
        {player.hasError ? (
          <Alert severity="error" role="alert" aria-live="assertive">
            {player.playerError || player.labels.invalid}
          </Alert>
        ) : (
          <Box className={classes.playerFrame} style={playerFrameStyle}>
            {providerConfig.render({ player, captions, classes })}
          </Box>
        )}
      </Box>
    </ElementGroupContainer>
  );
};

export default VideoPlayer;

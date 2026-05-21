import React from 'react';
import PropTypes from 'prop-types';
import { useTranslate } from 'react-translate';
import { Alert, Box } from '@mui/material';

import { ElementGroupContainer } from 'components/JsonSchema';

import VIDEO_PROVIDERS from './providers';
import useStyles from './styles';
import useVideoPlayer from './useVideoPlayer';

const VideoPlayer = ({
  hidden,
  description,
  sample,
  required,
  error,
  path,
  jsonSchema,
  notRequiredLabel,
  className,
  rootDocument,
  stepName,
  value,
  onChange,
  videoId,
  url,
  provider,
  title,
  ariaLabel,
  width,
  maxWidth,
  height,
  completePercent,
  trackProgress,
  captions,
  noMargin,
}) => {
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

  return (
    <ElementGroupContainer
      description={description}
      sample={sample}
      required={required}
      error={error}
      path={path}
      className={className}
      jsonSchema={jsonSchema}
      notRequiredLabel={notRequiredLabel}
      fullWidth
      noMargin={noMargin}
      width={width}
      maxWidth={maxWidth}
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

VideoPlayer.propTypes = {
  hidden: PropTypes.bool,
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  sample: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  required: PropTypes.bool,
  error: PropTypes.any,
  path: PropTypes.array,
  jsonSchema: PropTypes.object,
  notRequiredLabel: PropTypes.string,
  className: PropTypes.string,
  rootDocument: PropTypes.object,
  stepName: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func,
  videoId: PropTypes.string,
  url: PropTypes.string,
  provider: PropTypes.string,
  title: PropTypes.string,
  ariaLabel: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  completePercent: PropTypes.number,
  trackProgress: PropTypes.bool,
  captions: PropTypes.bool,
  noMargin: PropTypes.bool,
};

VideoPlayer.defaultProps = {
  hidden: false,
  description: null,
  sample: null,
  required: false,
  error: null,
  path: [],
  jsonSchema: null,
  notRequiredLabel: '',
  className: '',
  rootDocument: {},
  stepName: '',
  value: '',
  onChange: () => null,
  videoId: '',
  url: '',
  provider: 'youtube',
  title: '',
  ariaLabel: '',
  width: undefined,
  maxWidth: undefined,
  height: undefined,
  completePercent: 90,
  trackProgress: false,
  captions: false,
  noMargin: false,
};

export default VideoPlayer;

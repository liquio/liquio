import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { IconButton, Tooltip } from '@mui/material';
import { useCallback } from 'react';
import { useTranslate } from 'react-translate';

import { getConfig } from '../../../../helpers/configLoader';

export const RunProcessButton = ({ workflowTemplateId, taskTemplateId }) => {
  const config = getConfig();
  const t = useTranslate('JsonSchemaEditor');

  const handleClick = useCallback(() => {
    if (!workflowTemplateId || !taskTemplateId) {
      console.error('Workflow or Task Template ID is missing');
      return;
    }

    if (!config.cabinetUrl) {
      console.error('Cabinet URL is not configured');
      return;
    }

    const redirectUrl = new URL(
      `/tasks/create/${workflowTemplateId}/${taskTemplateId}`,
      config.cabinetUrl
    );
    window.open(redirectUrl.toString(), '_blank');
  }, [workflowTemplateId, taskTemplateId]);

  return (
    <Tooltip title={t('RunProcess')}>
      <IconButton size="large" onClick={handleClick}>
        <PlayArrowIcon />
      </IconButton>
    </Tooltip>
  );
};

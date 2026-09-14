import React from 'react';
import Tooltip, { tooltipClasses, TooltipProps } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

export default styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} tabIndex={0} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 640,
  },
});

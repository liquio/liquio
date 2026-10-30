import { useEffect, useState } from 'react';

interface TooltipStyle {
  top?: number;
  left?: number;
  position?: 'fixed';
}

const useTooltip = (className: string) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState<TooltipStyle>({});

  useEffect(() => {
    const rootContainer = document.getElementsByClassName(className)[0] as HTMLElement;

    const showTooltip = ({
      value,
      top,
      left,
      offsetHeight,
      offsetWidth,
    }: {
      value: string;
      top: number;
      left: number;
      offsetHeight: number;
      offsetWidth: number;
    }) => {
      setTitle(value);
      setStyle({
        top: top + offsetHeight / 2,
        left: left + offsetWidth / 2,
        position: 'fixed',
      });
      setOpen(true);
    };

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const { offsetWidth, offsetHeight } = target;

      if (target.classList.contains('dsg-cell-header-container')) {
        const { top, left } = target.getBoundingClientRect();

        showTooltip({
          value: target.innerText,
          top,
          left,
          offsetHeight,
          offsetWidth,
        });
      }

      if (target.classList.contains('dsg-cell')) {
        const input = target.querySelector('input');

        if (!input || !input.value) {
          return;
        }
        const { top, left } = target.getBoundingClientRect();

        showTooltip({
          value: input.value,
          top,
          left,
          offsetHeight,
          offsetWidth,
        });
      }
    };

    const handleMouseOut = () => {
      setOpen(false);
    };

    rootContainer.addEventListener('mouseover', handleMouseOver as EventListener);
    rootContainer.addEventListener('mouseout', handleMouseOut);

    return () => {
      rootContainer.removeEventListener('mouseover', handleMouseOver as EventListener);
      rootContainer.removeEventListener('mouseout', handleMouseOut);
    };
  }, [className]);

  return { open, title, style };
};

export default useTooltip;

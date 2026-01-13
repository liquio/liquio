import { useEffect, useState } from 'react';
import makeStyles from '@mui/styles/makeStyles';

import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

export const useStyles = makeStyles(() => ({
  alignLeft: {
    textAlign: 'left',
  },
  alignCenter: {
    textAlign: 'center',
    justifyContent: 'center',
  },
  alignRight: {
    textAlign: 'right',
    justifyContent: 'flex-end',
  },
  cutText: {
    '& > .dsg-cell-header-container': {
      wordBreak: 'break-all',
      display: '-webkit-box',
      '-webkit-box-orient': 'vertical',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      '-webkit-line-clamp': 1,
      lineHeight: '24px',
      color: '#00000080',
      fontSize: 14,
    },
  },
}));

const useHeaders = (headers) => {
  const classes = useStyles();
  const [className] = useState(crypto.randomUUID());

  useEffect(() => {
    const rootContainer = document.getElementsByClassName(className)[0];

    if (
      !rootContainer ||
      !headers ||
      rootContainer.querySelector('.dsg-additional-headers')
    ) {
      return;
    }

    const dsgContainer =
      rootContainer.getElementsByClassName('dsg-container')[0];
    const dsgRowHeader = dsgContainer.querySelector('.dsg-row-header');

    const dsgAdditionalHeaders = document.createElement('div');
    dsgAdditionalHeaders.className = 'dsg-additional-headers';
    dsgAdditionalHeaders.style.overflow = 'hidden';

    const dsgAdditionalHeadersSlider = document.createElement('div');
    dsgAdditionalHeadersSlider.className = 'dsg-additional-headers-slider';
    dsgAdditionalHeaders.appendChild(dsgAdditionalHeadersSlider);

    rootContainer.insertBefore(dsgAdditionalHeaders, rootContainer.firstChild);

    const widths = [];
    dsgRowHeader.childNodes.forEach((node) => {
      widths.push(node.offsetWidth);
    });

    headers.forEach((header) => {
      const headerElement = document.createElement('div');
      headerElement.classList.add('dsg-row');
      headerElement.classList.add('dsg-row-header');
      headerElement.classList.add('dsg-additional-header');
      headerElement.style.width = widths.reduce((a, b) => a + b, 0) + 'px';
      headerElement.style.height = dsgRowHeader.style.height;

      const gutter = document.createElement('div');
      gutter.classList.add('dsg-cell');
      gutter.classList.add('dsg-cell-gutter');
      gutter.classList.add('dsg-cell-header');
      gutter.style.minWidth = '40px';

      const gutterContent = document.createElement('div');
      gutterContent.classList.add('dsg-cell-header-container');

      gutter.appendChild(gutterContent);
      headerElement.appendChild(gutter);

      header.forEach((headerItem, headerItemIndex) => {
        const headerItemElement = document.createElement('div');
        headerItemElement.classList.add('dsg-cell');
        headerItemElement.classList.add('dsg-cell-header');
        headerItemElement.classList.add('dsg-additional-header-item');
        if (headerItem.headerAlign) {
          headerItemElement.classList.add(
            classes[`align${capitalizeFirstLetter(headerItem.headerAlign)}`],
          );
        }

        const firstColumn = header
          .slice(0, headerItemIndex)
          .reduce((acc, { colspan }) => acc + (colspan || 1), 0);
        const headerItemWidth = widths
          .slice(firstColumn + 1, firstColumn + (headerItem.colspan || 1) + 1)
          .reduce((acc, width) => acc + width, 0);
        headerItemElement.style.width = headerItemWidth + 'px';

        const headerItemContentElement = document.createElement('div');
        headerItemContentElement.classList.add('dsg-cell-header-container');
        headerItemContentElement.innerText = headerItem.title;

        headerItemElement.appendChild(headerItemContentElement);
        headerElement.appendChild(headerItemElement);
      });

      dsgAdditionalHeadersSlider.appendChild(headerElement);

      dsgContainer.addEventListener('scroll', (event) => {
        dsgAdditionalHeadersSlider.style.marginLeft = `${-event.target
          .scrollLeft}px`;
      });
    });
  }, [className, classes, headers]);

  return className;
};

export default useHeaders;

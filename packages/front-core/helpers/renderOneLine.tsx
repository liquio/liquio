import React from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';
import MobileDetect from 'mobile-detect';
import { Tooltip } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import { getTextWidth } from 'components/Select/components/ListboxComponent';

const styles = () => ({
  cutText: {
    wordBreak: 'break-all' as const,
    display: '-webkit-box',
    '-webkit-box-orient': 'vertical',
    textOverflow: 'ellipsis',
    overflow: 'hidden'
  },
  lineClamp1: {
    '-webkit-line-clamp': 1
  },
  lineClamp2: {
    '-webkit-line-clamp': 2
  },
  lineClamp3: {
    '-webkit-line-clamp': 3
  },
  fullWidth: {
    width: '100%'
  }
});

const useStyles = makeStyles(styles);

const getTextLines = (title = '', containerWidth: number, textParams?: string): number => {
  try {
    const textWidth = getTextWidth((title + '').toUpperCase(), textParams);
    const rowHeight = Number(Math.ceil(Number(textWidth) / containerWidth));
    return rowHeight;
  } catch {
    return 1;
  }
};

// `title` is normally a string, but callers also pass a React element whose rendered text we
// try to recover via non-public React fiber internals (`_owner`); this is fragile by design in
// the original implementation and is preserved as-is, guarded by the surrounding try/catch.
const getText = (title: unknown): string => {
  try {
    const el = title as { props?: { children?: unknown }; _owner?: { child?: { ref?: { current?: { innerText?: string } } } } };
    const componenetText = el?.props?.children ?? el?._owner?.child?.ref?.current?.innerText;

    if (!componenetText || typeof componenetText !== 'string') return '';

    return componenetText;
  } catch {
    return title as string;
  }
};

const CELL_MIN_WIDTH = 150;

interface RenderOneLineProps {
  title?: React.ReactNode;
  textParams?: string;
  disableTooltip?: boolean;
  minWidthDefault?: string;
  maxTextRows?: number;
  minWidthCustom?: number;
  allowMobile?: boolean;
  initDelay?: boolean;
}

const RenderOneLine = ({
  title = '',
  textParams = '400 15px Roboto',
  disableTooltip = false,
  minWidthDefault = '0px',
  maxTextRows = 1,
  minWidthCustom,
  allowMobile = false,
  initDelay = false
}: RenderOneLineProps) => {
  const classes = useStyles();
  const wrapper = React.useRef<HTMLDivElement>(null);
  const [titleLines, setTitleLines] = React.useState(1);
  const md = new MobileDetect(window.navigator.userAgent);
  const isMobile = !!md.mobile();

  React.useEffect(() => {
    async function fetchData() {
      if (!wrapper?.current) return;

      const containerWidth = wrapper?.current?.offsetWidth;

      const lines = getTextLines(getText(title) || '', containerWidth, textParams);

      setTitleLines(lines);
    }

    fetchData();
  }, [title, textParams, initDelay]);

  // Math.max coerces each argument with ToNumber; minWidthDefault is a string (e.g. '0px'),
  // which coerces to NaN unless it's purely numeric. That quirk is preserved from the original.
  const minWidth = minWidthCustom || Math.max(...([CELL_MIN_WIDTH, minWidthDefault, wrapper?.current?.offsetWidth] as number[]));

  const showOnMobile = allowMobile ? true : !isMobile;

  const showTooltip = titleLines > maxTextRows && !disableTooltip && showOnMobile;

  return (
    <div
      ref={wrapper}
      className={classNames({
        [classes.fullWidth]: initDelay
      })}
    >
      {showTooltip ? (
        <Tooltip title={title}>
          <span
            className={classNames({
              [classes.cutText]: true,
              [classes['lineClamp' + maxTextRows as keyof typeof classes]]: true
            })}
            style={{ minWidth }}
          >
            {title}
          </span>
        </Tooltip>
      ) : (
        <span
          style={{
            minWidth: title ? minWidth : 'unset'
          }}
        >
          {title}
        </span>
      )}
    </div>
  );
};

export default connect(null, null)(RenderOneLine);

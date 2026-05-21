import React, { useState, useRef, useEffect } from 'react';
import theme from 'theme';
import evaluate from 'helpers/evaluate';
import classNames from 'classnames';
import renderHTML from 'helpers/renderHTML';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { Button, Popover } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ReactComponent as HelperIcon } from 'assets/img/ic_helper.svg';
import { ReactComponent as InfoIcon } from 'assets/img/ic_info.svg';
import { ReactComponent as WarningIcon } from 'assets/img/ic_warning.svg';
import { ReactComponent as ErrorIcon } from 'assets/img/ic_error.svg';

const hasLayoutSettings =
  typeof theme?.defaultLayout === 'boolean' || typeof theme?.material === 'boolean';
const defaultLayout = hasLayoutSettings ? theme?.defaultLayout === true : false;
const material = hasLayoutSettings ? theme?.material === true : true;

const styles = (theme) => ({
  container: {
    padding: '24px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    '& p': {
      marginTop: 0
    }
  },
  mainContainer: {
    backgroundColor: '#FFF7E3',
  },
  additional: {
    overflow: 'hidden',
  },
  expanded: {
    maxHeight: 'none'
  },
  collapsed: {
    maxHeight: '48px'
  },
  emoji: {
    fontSize: '38px',
    marginBottom: 0
  },
  title: {
    fontWeight: 400,
    fontSize: '20px',
    marginTop: 0,
    fontFamily: theme?.typography?.fontFamily,
    '& p': {
      '&:last-child': {
        marginBottom: 0
      }
    }
  },
  mainTitle: {
    lineHeight: '24px',
    marginBottom: '8px',
  },
  materialTitle: {
    lineHeight: '30px',
    marginBottom: '4px',
  },
  text: {
    fontWeight: 400,
    margin: 0,
    fontFamily: theme?.typography?.fontFamily,
    '& p': {
      '&:last-child': {
        marginBottom: 0
      }
    }
  },
  mainText: {
    fontSize: '16px',
    lineHeight: '24px',
  },
  materialText: {
    fontSize: '14px',
    lineHeight: '21px',
  },
  expandedContainer: {
    borderRadius: '4px',
    padding: '16px',
    marginTop: '16px',
    cursor: 'pointer'
  },
  mainExpandedContainer: {
    backgroundColor: '#FFEBBB',
  },
  materialExpandedContainer: {
    backgroundColor: '#EDEDED',
  },
  collapseText: {
    fontWeight: 400,
    marginBottom: '8px',
    marginTop: 0,
    fontFamily: theme?.typography?.fontFamily,
  },
  mainCollapseText: {
    fontSize: '16px',
    lineHeight: '24px',
  },
  materialCollapseText: {
    fontSize: '14px',
    lineHeight: '21px',
  },
  btnWrap: {
    display: 'flex',
    alignItems: 'center',
  },
  iconWrap: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center'
  },
  icon: {
    fontSize: 18,
    marginLeft: 0
  },
  btnLabel: {
    fontWeight: 400,
    fontSize: '13px',
    lineHeight: '24px',
    textDecoration: 'underline',
    padding: 0,
    fontFamily: theme?.typography?.fontFamily,
    backgroundColor: 'transparent',
    color: '#000',
    '&:hover': {
      backgroundColor: 'transparent',
      textDecoration: 'underline',
    },
    '& .MuiTouchRipple-root': {
      display: 'none',
    },
  },
  helperButton: {
    padding: 0,
    minWidth: 'auto',
    order: 1,
    '&:hover': {
      backgroundColor: 'transparent',
    },
    '&:focus-visible': {
      outline: '2px solid #0073E6',
      borderRadius: 0,
      outlineOffset: '2px',
    },
    '& span': {
      margin: 0,
    },
    '& .MuiTouchRipple-root': {
      display: 'none',
    },
  },
  closeButton: {
    padding: 0,
    width: 14,
    height: 14,
    minWidth: 14,
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'transparent',
    },
    '&:focus-visible': {
      outline: '2px solid #0073E6',
      borderRadius: 0,
      outlineOffset: '2px',
    },
    '& span': {
      margin: 0,
    },
    '& .MuiTouchRipple-root': {
      display: 'none',
    },
  },
  tooltip: {
    backgroundColor: '#fff',
    padding: '12px 16px 16px 16px',
    borderRadius: 0,
    position: 'relative',
    width: '322px',
    overflow: 'visible',
    transform: 'translateY(-10px) !important'
  },
  mainTooltip: {
    border: '2px solid #000',
  },
  materialTooltip: {
    border: '1px solid #E2E8F0',
    boxShadow: '0px 0px 10px 0px #00000014'
  },
  arrow: {
    color: '#fff',
    width: '15px',
    display: 'block',
    height: '8px',
    overflow: 'hidden',
    position: 'absolute',
    bottom: '-8px',
    right: '2px',
    '&::before': {
      width: '15px',
      height: '15px',
      content: '""',
      display: 'block',
      position: 'absolute',
      backgroundColor: '#fff',
      transform: 'rotate(45deg)',
      marginTop: '-10px'
    },
  },
  mainArrow: {
    '&::before': {
      border: '2px solid #000',
    },
  },
  materialArrow: {
    '&::before': {
      border: '1px solid #E2E8F0',
      boxShadow: '0px 0px 10px 0px #00000014'
    },
  },
  helperHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  helperTitle: {
    color: '#444444',
    fontWeight: 400,
    fontSize: '12px',
    lineHeight: '16px',
    margin: 0,
    fontFamily: theme?.typography?.fontFamily,
  },
  helperContent: {
    color: '#000',
    wordBreak: 'break-word',
  },
  materialButton: {
    top: '3px',
    backgroundColor: 'transparent',
  },
  materialCloseButton: {
    backgroundColor: 'transparent',
    '& svg': {
      fill: '#000'
    }
  },
  materialContainer: {
    backgroundColor: '#F8F8F8',
    padding: '16px',
    alignItems: 'center',
    borderRadius: theme?.materialContainer?.borderRadius || 0
  },
  materialContainerMultiLine: {
    alignItems: 'flex-start',
  },
  iconType: {
    margin: 0,
    marginTop: '3px !important',
  }
});

const Infobox = ({ emoji, title, text, collapseHeader, collapseText, rootDocument, t, classes, tooltip, iconType, hidden, stepName, parentValue }) => {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [open, setOpen] = React.useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const textRef = useRef(null);
  const tooltipRef = useRef(null);

  const materialTextRef = (node) => {
    if (node) {
      const isSingleLine = node.scrollHeight <= 21;
      setIsMultiLine(!isSingleLine);
    }
  };

  const toggle = () => setExpanded(prev => !prev);

  useEffect(() => {
    const checkOverflow = () => {
      const el = textRef.current;
      if (!el) return;

      const limitedHeight = 48;
      requestAnimationFrame(() => {
        const isVisible = el.offsetParent !== null;

        if (isVisible && el.scrollHeight > 0) {
          setIsOverflowing(el.scrollHeight > limitedHeight);
        }
      });
    };

    checkOverflow();

    // const resizeObserver = new ResizeObserver(() => {
    //   checkOverflow();
    // });

    // if (textRef.current) {
    //   resizeObserver.observe(textRef.current);
    // }

    return () => {
      // resizeObserver.disconnect();
    };
  }, [collapseHeader, hidden]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!open) return;

      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = tooltipRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements || focusableElements.length === 0) {
          return;
        }

        const elements = Array.from(focusableElements);
        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];

        const isShift = event.shiftKey;
        const activeElement = document.activeElement;

        if (isShift) {
          if (activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const clear = (str) => str?.replace(/\s*style\s*=\s*(['"])[\s\S]*?\1/gi, '');
  const getTitle = (str) => {
    const evaluatedTitle = evaluate(
      str,
      rootDocument?.data[stepName],
      rootDocument?.data,
      parentValue
    );

    let cleanedHtml = '';
    if (!(evaluatedTitle instanceof Error)) {
      cleanedHtml = clear(evaluatedTitle);
      cleanedHtml = cleanedHtml?.replace(/\.(\s*(?:<\/[^>]+>\s*)*)$/u, '$1');

      return renderHTML(cleanedHtml);
    }

    cleanedHtml = clear(str);
    cleanedHtml = cleanedHtml?.replace(/\.(\s*(?:<\/[^>]+>\s*)*)$/u, '$1');
    return renderHTML(cleanedHtml, { disableTabIndex: true });
  };

  const getTooltip = () => {
    const evaluatedTitle = evaluate(
      tooltip,
      rootDocument?.data,
    );
    if (!(evaluatedTitle instanceof Error)) {
      return evaluatedTitle;
    }
    return tooltip;
  };
  const customTooltipMessage = () => {
    return (
      <>
        <div className={classes.helperHeader}>
          <p className={classes.helperTitle}>{t('helper')}</p>
          <Button
            onClick={() => setOpen(false)}
            startIcon={<CloseIcon />}
            className={classNames({
              [classes.closeButton]: true,
              [classes.materialCloseButton]: false,
            })}
            tabIndex={0}
            data-testid="infobox-tooltip-close-button"
          ></Button>
        </div>
        <div className={classes.helperContent}>{renderHTML(getTooltip())}</div>
      </>
    );
  };

  if (hidden) {
    return null;
  }

  return (
    <ElementContainer>
      <div
className={classNames({
        [classes.container]: true,
        [classes.mainContainer]: defaultLayout,
        [classes.materialContainer]: material,
        [classes.materialContainerMultiLine]: material && isMultiLine,
      })}
        role="region"
        aria-label={t('block')}
      >
        {defaultLayout && emoji ? <p className={classes.emoji}>{emoji}</p> : null}
        {material && iconType ? (
          iconType === 'info' ? <p className={classes.iconType}><InfoIcon /></p> :
            iconType === 'warning' ? <p className={classes.iconType}><WarningIcon /></p> :
              iconType === 'error' ? <p className={classes.iconType}><ErrorIcon /></p> :
                null) : null}
        {tooltip ? (
          <>
            <Button
              onClick={(event) => setOpen(event.currentTarget)}
              startIcon={<HelperIcon />}
              className={classNames({
                [classes.helperButton]: true,
                [classes.materialButton]: material,
              })}
              aria-label={t('details')}
              data-testid="infobox-tooltip-open-button"
            />

            <Popover
              open={open}
              anchorEl={open}
              onClose={() => setOpen(null)}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              PaperProps={{
                className: classNames({
                  [classes.tooltip]: true,
                  [classes.mainTooltip]: defaultLayout,
                  [classes.materialTooltip]: material,
                }),
                style: { borderRadius: 0 },
              }}
            >
              <span className={classNames({
                [classes.arrow]: true,
                [classes.mainArrow]: defaultLayout,
                [classes.materialArrow]: material,
              })}
              ></span>
              <div ref={tooltipRef}>
                {customTooltipMessage()}
              </div>
            </Popover>
          </>
        ) : null}
        <div>
          {title && <h3 className={classNames({
            [classes.title]: true,
            [classes.mainTitle]: defaultLayout,
            [classes.materialTitle]: material,
          })}
          >{getTitle(title)}</h3>}
          {text && <p
ref={materialTextRef} className={classNames({
            [classes.text]: true,
            [classes.mainText]: defaultLayout,
            [classes.materialText]: material,
          })}
          >{getTitle(text)}</p>}
          {collapseHeader && collapseText && (
            <div
className={classNames({
              [classes.expandedContainer]: true,
              [classes.mainExpandedContainer]: defaultLayout,
              [classes.materialExpandedContainer]: material,
            })}
              onClick={isOverflowing ? toggle : undefined}
            >
              <div
                ref={textRef}
                className={classNames({
                  [classes.additional]: true,
                  [classes.expanded]: expanded,
                  [classes.collapsed]: !expanded,
                })}
              >
                <p className={classNames({
                  [classes.collapseText]: true,
                  [classes.mainCollapseText]: defaultLayout,
                  [classes.materialCollapseText]: material,
                })}
                >{getTitle(collapseHeader)}{getTitle(collapseText)}</p>
              </div>

              {isOverflowing && (
                <div >
                  {expanded ?
                    <div className={classes.btnWrap}>
                      <div className={classes.iconWrap}>
                        <ArrowUpwardIcon className={classes.icon} />
                      </div>
                      <Button aria-expanded={expanded} className={classes.btnLabel} data-testid="infobox-hide-button">{t('hide')}</Button>
                    </div> :
                    <div className={classes.btnWrap}>
                      <div className={classes.iconWrap}>
                        <ArrowDownwardIcon className={classes.icon} />
                      </div>
                      <Button aria-expanded={expanded} className={classes.btnLabel} data-testid="infobox-show-button">{t('show')}</Button>
                    </div>
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ElementContainer>
  );
};



const styled = withStyles(styles)(Infobox);

const translated = translate('Infobox')(styled);

export default translated;

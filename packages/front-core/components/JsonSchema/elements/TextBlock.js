/* eslint-disable prefer-rest-params */
/* eslint-disable no-template-curly-in-string */
import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import renderHTML from 'helpers/renderHTML';
import evaluate from 'helpers/evaluate';
import Handlebars from 'components/JsonSchema/helpers/handlebarsHelpers';
import objectPath from 'object-path';
import withStyles from '@mui/styles/withStyles';
import { Fade , Button, Tooltip } from '@mui/material';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { ReactComponent as HelperIcon } from 'assets/img/ic_helper.svg';
import CloseIcon from '@mui/icons-material/Close';
import classNames from 'classnames'; 
import theme from 'theme';

const { material } = theme;

const styles = (theme) => ({
  visibility: {
    maxWidth: 1000,
    color: '#000',
    fontFamily: theme.typography.fontFamily,
    lineHeight: '1.5em',
    position: 'relative',
    [theme.breakpoints.down('xs')]: {
      fontSize: 13,
      lineHeight: '18px',
      marginBottom: 10,
      marginTop: 10,
    },
    '& h3': {
      ...(theme?.textBlockH3 || {}),
    },
    '& h4': {
      ...(theme?.textBlockH4 || {}),
    }
  },
  container: {
    marginTop: 0,
  },
  helperButton: {
    padding: 0,
    width: 24,
    height: 24,
    minWidth: 24,
    position: 'absolute',
    top: '33px',
    right: '16px',
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
    border: '2px solid #000',
    borderRadius: 0,
    position: 'relative',
    minWidth: '322px',
  },
  arrow: {
    color: '#fff',
    width: '15px',
    '&::before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      width: '15px',
      height: '12px',
      border: '2px solid #000',
      backgroundColor: '#fff',
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
  },
  materialButton: {
    top: 0,
    backgroundColor: 'transparent',
    '& span': {
      padding: '10px',
    },
  },
  materialCloseButton: {
    backgroundColor: 'transparent',
    '& svg': {
      fill: '#000'
    }
  }
});

const TextBlock = ({
  noMargin,
  htmlBlock,
  value,
  classes,
  pure,
  params,
  useParentData,
  parentValue,
  hidden,
  rootDocument,
  row,
  pathIndex,
  dataMapping,
  stepName,
  maxWidth,
  htmlBlockHelper,
  helperTopPosition,
  t,
  className: customClassName
}) => {
  if (hidden) return null;

  const [open, setOpen] = React.useState(false);

  const getDataToEval = () => {
    if (typeof dataMapping === 'string') {
      const mappedData = evaluate(
        dataMapping,
        rootDocument.data[stepName],
        rootDocument.data,
        parentValue,
      );
      if (!(mappedData instanceof Error)) return mappedData;
    }
    return useParentData ? parentValue : rootDocument.data;
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
              [classes.materialCloseButton]: material,
            })}
          ></Button>
        </div>
        <div style={{overflowX: 'scroll'}}>{renderHTML(htmlBlockHelper)}</div>
      </>
    );
  };

  if (params) {
    const template = Handlebars.compile(htmlBlock);

    const templateData = Object.keys(params).reduce((acc, param) => {
      const paramPath = pathIndex
        ? (params[param] || '').replace('${index}', pathIndex.index)
        : params[param];
      return {
        ...acc,
        [param]: objectPath.get(getDataToEval(), paramPath),
      };
    }, {});

    htmlBlock = template(templateData);
  }

  return pure ? (
    renderHTML(htmlBlock || value)
  ) : (
    <ElementContainer
      className={classNames({
        [classes.container]: true,
        [customClassName]: customClassName
      })}
      row={row}
      noMargin={noMargin}
      maxWidth={maxWidth}
    >
      <Fade in={true}>
        <div
          className={classes.visibility}
          style={{
            maxWidth,
          }}
        >
          {renderHTML(htmlBlock || value)}
          {htmlBlockHelper ? (
            <Tooltip
              open={open}
              placement="top-end"
              title={customTooltipMessage()}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              arrow
              classes={{
                tooltip: classes.tooltip,
                arrow: classes.arrow,
              }}
            >
              <Button
                onClick={() => setOpen(true)}
                startIcon={<HelperIcon />}
                className={classNames({
                  [classes.helperButton]: true,
                  [classes.materialButton]: material,
                })}
                style={helperTopPosition ? { top: `${helperTopPosition}px` } : undefined}
              ></Button>
            </Tooltip>
          ) : null}
        </div>
      </Fade>
    </ElementContainer>
  );
};

TextBlock.propTypes = {
  classes: PropTypes.object.isRequired,
  rootDocument: PropTypes.object.isRequired,
  htmlBlock: PropTypes.string,
  value: PropTypes.string,
  pure: PropTypes.bool,
  row: PropTypes.bool,
  hidden: PropTypes.bool,
  useParentData: PropTypes.bool,
  parentValue: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
  noMargin: PropTypes.bool,
  pathIndex: PropTypes.object,
  params: PropTypes.object,
  dataMapping: PropTypes.string,
  stepName: PropTypes.string,
  active: PropTypes.bool,
};

TextBlock.defaultProps = {
  htmlBlock: '',
  value: '',
  pure: false,
  hidden: false,
  row: false,
  useParentData: false,
  parentValue: false,
  noMargin: false,
  pathIndex: null,
  params: null,
  dataMapping: null,
  stepName: '',
  active: true,
};

const translated = translate('TextBlock')(TextBlock);
export default withStyles(styles)(translated);

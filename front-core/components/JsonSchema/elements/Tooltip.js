import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import MobileDetect from 'mobile-detect';
import { Tooltip, Typography, ClickAwayListener } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TextBlock from 'components/JsonSchema/elements/TextBlock';
import renderHTML from 'helpers/renderHTML';

const md = new MobileDetect(window.navigator.userAgent);

const HtmlTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    maxWidth: 355,
    fontSize: 13,
    lineHeight: '16px',
    borderRadius: 2,
    padding: 16,
    border: '2px solid #000000',
    [theme.breakpoints.down('md')]: {
      maxWidth: 300,
    },
  },
}))(Tooltip);

const styles = () => ({
  pointer: {
    cursor: 'pointer',
    marginLeft: 10,
    position: 'relative',
    top: -2,
  },
  tooltipLabel: {
    color: '#8d8d8d',
    display: 'flex',
  },
});

const TooltipControl = ({
  classes,
  hidden,
  description,
  required,
  error,
  sample,
  title,
  content,
  htmlBlock,
  params,
  rootDocument,
  parentValue,
  useParentData,
  dataMapping,
}) => {
  const [open, setOpen] = React.useState(false);
  const handleTooltipClose = () => setOpen(false);
  const handleTooltipOpen = () => setOpen(true);

  if (hidden) return null;

  const isMobile = !!md.mobile();

  return (
    <ElementContainer
      description={description}
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
    >
      <Typography className={classes.tooltipLabel}>
        {renderHTML(title)}
        {!isMobile ? (
          <HtmlTooltip title={renderHTML(content)}>
            <HelpOutlineIcon className={classes.pointer} />
          </HtmlTooltip>
        ) : (
          <ClickAwayListener onClickAway={handleTooltipClose}>
            <div>
              <HtmlTooltip
                title={renderHTML(content)}
                open={open}
                onClose={handleTooltipClose}
                disableFocusListener={true}
                disableHoverListener={true}
                disableTouchListener={true}
              >
                <HelpOutlineIcon
                  className={classes.pointer}
                  onClick={handleTooltipOpen}
                />
              </HtmlTooltip>
            </div>
          </ClickAwayListener>
        )}
      </Typography>
      {htmlBlock ? (
        <TextBlock
          htmlBlock={htmlBlock}
          params={params}
          dataMapping={dataMapping}
          rootDocument={rootDocument}
          parentValue={parentValue}
          useParentData={useParentData}
        />
      ) : null}
    </ElementContainer>
  );
};

TooltipControl.propTypes = {
  hidden: PropTypes.bool,
  description: PropTypes.string,
  sample: PropTypes.string,
  error: PropTypes.object,
  required: PropTypes.bool,
  classes: PropTypes.bool.isRequired,
  title: PropTypes.string,
  content: PropTypes.string,
  rootDocument: PropTypes.object.isRequired,
  htmlBlock: PropTypes.string,
  useParentData: PropTypes.bool,
  parentValue: PropTypes.bool,
  params: PropTypes.object,
  dataMapping: PropTypes.object,
};

TooltipControl.defaultProps = {
  hidden: false,
  description: null,
  sample: null,
  error: null,
  required: false,
  title: null,
  content: null,
  htmlBlock: '',
  useParentData: false,
  params: null,
  parentValue: false,
  dataMapping: null,
};

const styled = withStyles(styles)(TooltipControl);
const translated = translate('Elements')(styled);
export default translated;

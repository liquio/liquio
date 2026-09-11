import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from 'react-query';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Popover,
  CircularProgress,
  Paper,
  ClickAwayListener,
  Fade,
} from '@mui/material';
import TreeList from 'components/TreeList/index';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StringElement from 'components/JsonSchema/elements/StringElement';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { registerSearch } from 'application/actions/registry';
import waiter from 'helpers/waitForAction';

const SEARCH_INTERVAL = 500;
const RESULTS_LIMIT = 500;
const OFFSET = 0;

const optionsToMenu = (option) =>
  option
    ? {
        ...option,
        value: option.id,
        label: option.stringified,
        name: option.stringified,
      }
    : null;

const DataList = ({ componentId, options, onSelect }) => (
  <TreeList
    id={`${componentId}-tree-list`}
    items={options || []}
    registerSelect={true}
    onChange={(newValue) => onSelect(newValue)}
  />
);

DataList.propTypes = {
  componentId: PropTypes.number.isRequired,
  options: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
};

const RegistrySearch = ({
  keyId,
  noMargin,
  helperText,
  sample,
  required,
  error,
  path,
  value,
  description,
  onChange,
  actions,
  hidden,
}) => {
  const inputEl = React.useRef(null);
  const [text, setText] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [prevResults, setPrevResults] = React.useState();
  const { data, isFetching } = useQuery(
    text ? [keyId, text, RESULTS_LIMIT, OFFSET] : null,
    actions.registerSearch,
  );

  const componentId = path.join('-');
  const options = (data || prevResults || []).map(optionsToMenu);

  const isLoading = text && isFetching;

  const { current } = inputEl;
  const isMobile = window.innerWidth < 500;
  const isOpen = open && !isLoading;

  const onItemSelect = (newValue) => {
    onChange(newValue);
    setOpen(false);
    if (newValue) setText(newValue.name);
  };

  const clearValue = () => {
    onChange(null);
    setOpen(false);
    setText('');
  };

  const updateList = (newText) => {
    if (!newText.length || newText.length <= 2) {
      clearValue();
      return;
    }

    waiter.addAction(
      componentId,
      () => {
        data && setPrevResults(data);
        setText(newText);
        setOpen(true);
      },
      SEARCH_INTERVAL,
    );
  };

  const setChosenValue = () => value && setText(value.name);

  const onPopeverClose = () => {
    setOpen(false);
    setChosenValue();
  };

  if (!text && value) setChosenValue();

  if (hidden) return null;

  return (
    <ElementContainer
      noMargin={noMargin}
      sample={helperText || sample}
      required={required}
      bottomSample={true}
      error={error}
    >
      <div ref={inputEl}>
        <StringElement
          description={description}
          required={required}
          multiline={true}
          value={text}
          onChange={updateList}
          noMargin={helperText || sample}
          autoComplete="off"
          endAdornment={
            <>
              {isLoading ? <CircularProgress size={20} /> : null}
              {value || (text && text.length) ? (
                <CloseIcon style={{ cursor: 'pointer' }} onClick={clearValue} />
              ) : null}
              <ArrowForwardIcon />
            </>
          }
        />
        {isMobile ? (
          <>
            {isOpen ? (
              <ClickAwayListener onClickAway={onPopeverClose}>
                <Fade in={isOpen}>
                  <Paper
                    style={{
                      width: '100%',
                      maxHeight: 300,
                      overflow: 'hidden',
                      overflowY: 'scroll',
                    }}
                  >
                    <DataList
                      componentId={componentId}
                      options={options}
                      onSelect={onItemSelect}
                    />
                  </Paper>
                </Fade>
              </ClickAwayListener>
            ) : null}
          </>
        ) : (
          <Popover
            anchorEl={current}
            open={isOpen}
            disableAutoFocus={true}
            disableEnforceFocus={true}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              style: {
                width: current ? current.offsetWidth : '100%',
                maxHeight: 320,
                marginTop: 2,
                boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)',
              },
            }}
            onClose={onPopeverClose}
          >
            <DataList
              componentId={componentId}
              options={options}
              onSelect={onItemSelect}
            />
          </Popover>
        )}
      </div>
    </ElementContainer>
  );
};

RegistrySearch.propTypes = {
  keyId: PropTypes.number.isRequired,
  noMargin: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.object,
  actions: PropTypes.object.isRequired,
  description: PropTypes.string,
  value: PropTypes.object,
  onChange: PropTypes.func,
  path: PropTypes.array,
  hidden: PropTypes.bool,
  sample: PropTypes.string,
};

RegistrySearch.defaultProps = {
  description: '',
  value: null,
  onChange: () => null,
  noMargin: false,
  helperText: null,
  required: false,
  error: null,
  path: [],
  hidden: false,
  sample: null,
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    registerSearch: bindActionCreators(registerSearch, dispatch),
  },
});

export default connect(null, mapDispatchToProps)(RegistrySearch);

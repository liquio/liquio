import React from 'react';
import { useQuery } from 'react-query';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import {
  Popover,
  CircularProgress,
  Paper,
  ClickAwayListener,
  Fade,
} from '@mui/material';
import TreeListUntyped from 'components/TreeList/index';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StringElement from 'components/JsonSchema/elements/StringElement';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import * as registryActions from 'application/actions/registry';
import waiter from 'helpers/waitForAction';

const TreeList = TreeListUntyped as unknown as React.ComponentType<Record<string, unknown>>;

// registerSearch is only exported by cabinet-front's application/actions/registry;
// admin-front's copy lacks it, so it is resolved dynamically to keep this file shared between both apps.
const registerSearch = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).registerSearch;

const SEARCH_INTERVAL = 500;
const RESULTS_LIMIT = 500;
const OFFSET = 0;

interface RegistryOption {
  id?: unknown;
  stringified?: string;
  name?: string;
  [key: string]: unknown;
}

const optionsToMenu = (option?: RegistryOption | null) =>
  option
    ? {
        ...option,
        value: option.id,
        label: option.stringified,
        name: option.stringified,
      }
    : null;

interface DataListProps {
  componentId: string;
  options: RegistryOption[];
  onSelect: (value: RegistryOption | null) => void;
}

const DataList = ({ componentId, options, onSelect }: DataListProps) => (
  <TreeList
    id={`${componentId}-tree-list`}
    items={options || []}
    registerSelect={true}
    onChange={(newValue: RegistryOption) => onSelect(newValue)}
  />
);

interface RegistrySearchProps {
  keyId: number;
  noMargin?: boolean;
  helperText?: string | null;
  sample?: string | null;
  required?: boolean;
  error?: unknown;
  path?: Array<string | number>;
  value?: RegistryOption | null;
  description?: string;
  onChange?: (value: unknown) => void;
  actions: { registerSearch: (...args: unknown[]) => unknown };
  hidden?: boolean;
}

const RegistrySearch = ({
  keyId,
  noMargin,
  helperText,
  sample,
  required,
  error,
  path = [],
  value,
  description,
  onChange = () => null,
  actions,
  hidden,
}: RegistrySearchProps) => {
  const inputEl = React.useRef<HTMLDivElement>(null);
  const [text, setText] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [prevResults, setPrevResults] = React.useState<RegistryOption[]>();
  const { data, isFetching } = useQuery<RegistryOption[]>(
    text ? [keyId, text, RESULTS_LIMIT, OFFSET] : null,
    actions.registerSearch as (...args: unknown[]) => unknown,
  );

  const componentId = path.join('-');
  const options = (data || prevResults || []).map(optionsToMenu) as RegistryOption[];

  const isLoading = text && isFetching;

  const { current } = inputEl;
  const isMobile = window.innerWidth < 500;
  const isOpen = open && !isLoading;

  const onItemSelect = (newValue: RegistryOption | null) => {
    onChange(newValue);
    setOpen(false);
    if (newValue) setText(newValue.name || '');
  };

  const clearValue = () => {
    onChange(null);
    setOpen(false);
    setText('');
  };

  const updateList = (newText: string) => {
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

  const setChosenValue = () => value && setText(value.name || '');

  const onPopeverClose = () => {
    setOpen(false);
    setChosenValue();
  };

  if (!text && value) setChosenValue();

  if (hidden) return null;

  return (
    <ElementContainer
      noMargin={noMargin}
      sample={helperText || sample || undefined}
      required={required}
      bottomSample={true}
      error={error as never}
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

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    registerSearch: bindActionCreators(registerSearch as never, dispatch as never),
  },
});

export default connect(null, mapDispatchToProps)(RegistrySearch as never);

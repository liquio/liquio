/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import SplitPane from 'react-split-pane';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  Toolbar,
  IconButton,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import AceEditor from 'react-ace';
import { useResizeDetector } from 'react-resize-detector';

import propertiesEach from 'components/JsonSchema/helpers/propertiesEach';
import evaluate from 'helpers/evaluate';
import { setCheckValidFunc } from 'actions/debugTools';

import 'ace-builds/webpack-resolver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-twilight';

const styles = {
  root: {
    display: 'flex',
    height: '100%',
    '& > div': {
      flex: '.5'
    }
  },
  rightContainer: {
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    paddingLeft: 2
  },
  funcContainer: {
    flex: 1,
    paddingLeft: 5
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
    minHeight: 40,
    padding: 0
  },
  select: {
    padding: 7
  },
  formControl: {
    padding: 7,
    marginTop: 9
  },
  editorContainer: {
    padding: '5px',
    height: '100%'
  },
  fullHeightContainer: {
    height: 'calc(100% - 64px)',
    display: 'flex',
    flexDirection: 'column'
  },
  editorFullHeight: {
    height: 'calc(100% - 50px)'
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  radioGroup: {
    display: 'flex',
    flexWrap: 'nowrap'
  },
  radioLabel: {
    marginRight: '20px',
    display: 'flex',
    alignItems: 'flex-start'
  },
  funcContainerTitle: {
    marginTop: 45,
    minHeight: 30
  }
};

const LegacySplitPane = SplitPane as any;

// `react-resize-detector` v4's `<ReactResizeDetector>` render-prop component
// (which auto-detected its nearest DOM ancestor via `ReactDOM.findDOMNode`)
// was removed under React 19 — `findDOMNode` no longer exists. Converted
// from a class to a function component so the replacement
// `useResizeDetector()` hook can be used, with its `targetRef` pointed at
// the same `rightContainer` div the old detector auto-measured.
const CheckValidFunction = ({ t, classes, task, stepId, template, userInfo, checkValidFuncs, actions }: any) => {
  const [open, setOpen] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState('document');
  const [showControls, setShowControls] = React.useState(false);
  const aceComponentInput = React.useRef<any>(null);
  const aceComponentOutput = React.useRef<any>(null);
  const aceComponentOriginData = React.useRef<any>(null);
  const rightContainerRef = React.useRef<HTMLDivElement>(null);

  const handleChange = (property: string, value: any) => {
    actions.setCheckValidFunc(task?.id, {
      ...(checkValidFuncs[task?.id] || {}),
      [property]: value
    });
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelectedType = event.target.value;
    setSelectedType(newSelectedType);
    setShowControls(newSelectedType !== 'document');
  };

  const getElements = () => {
    const pages = template && template.jsonSchema.properties;
    const elements: any[] = [];

    if (stepId && pages[stepId]) {
      propertiesEach(
        pages[stepId],
        task.document.data[stepId],
        (schema: any, data: any, path: string, parentSchema: any, parentData: any, key: any) => {
          if (key) {
            const isNumberKey = !isNaN(key);

            if (!isNumberKey) {
              let displayPath = key;

              if (path.includes('[')) {
                const pathParts = path.split('[');
                const arrayIndex = pathParts[1]?.split(']')[0];
                displayPath = `[${arrayIndex}] ${key}`;
              }

              elements.push({
                schema,
                data,
                path: displayPath,
                parentSchema,
                parentData,
                key: displayPath
              });
            }
          }
        }
      );
    }

    return elements;
  };

  const handleCheckFunc = () => {
    const { element, func } = checkValidFuncs[task?.id] || {};

    if (!checkValidFuncs[task?.id]) return '';
    if (selectedType === 'document') {
      const result = evaluate(func, task.document.data);
      if (result instanceof Error) {
        (result as Error & { commit: (context: any) => void }).commit({ type: 'debug tools: check function', result });
        return '';
      }
      return JSON.stringify(result, null, 4);
    }

    const elements = getElements();
    const control = elements.find(({ key }: any) => key === element);
    if (!control) return '';

    const result = evaluate(
      func,
      control && control.data,
      task.document.data[stepId],
      task.document.data,
      selectedType === 'parent' || selectedType === 'userInfo' ? control.parentData : null,
      selectedType === 'userInfo' ? userInfo : null
    );

    if (result instanceof Error) {
      (result as Error & { commit: (context: any) => void }).commit({ type: 'debug tools: check valid function', task });
      return result.message;
    }

    return JSON.stringify(result, null, 4);
  };

  const renderControls = () => {
    const { element } = checkValidFuncs[task?.id] || {};
    const labelOptions = [
      { value: 'document', label: 'documentData' },
      { value: 'element', label: 'value, step, documentData' },
      { value: 'parent', label: 'value, step, documentData, parent' },
      {
        value: 'userInfo',
        label: 'value, step, documentData, parent, userInfo'
      }
    ];

    return (
      <>
        <FormControl component="fieldset" className={classes.formControl}>
          <RadioGroup
            row
            value={selectedType}
            onChange={handleTypeChange}
            className={classes.radioGroup}
          >
            {labelOptions.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={<div style={{ marginTop: 7 }}>{option.label}</div>}
                className={classes.radioLabel}
              />
            ))}
          </RadioGroup>
        </FormControl>

        {showControls ? (
          <FormControl fullWidth={true} className={classes.formControl}>
            <InputLabel>{t('SelectElement')}</InputLabel>
            <Select
              variant="outlined"
              value={element || ''}
              classes={{ select: classes.select }}
              onChange={({ target: { value } }) => handleChange('element', value)}
            >
              {getElements().map((item: any, index: number) => (
                <MenuItem key={item.key + index} value={item.key}>
                  {[item.path, item.schema.description].filter(Boolean).join(' - ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </>
    );
  };

  // The original wired the resize-to-editor callback via a typo'd
  // `onReіsize` prop (Cyrillic "і"), which `ReactResizeDetector` silently
  // ignored — the ace editors were never actually told to resize on
  // container resize. Preserved exactly: no `onResize` passed below.
  useResizeDetector({ handleHeight: true, targetRef: rightContainerRef });

  const openModal = () => setOpen(true);

  const closeModal = () => setOpen(false);

  const { func } = checkValidFuncs[task?.id] || {};

  return (
    <div className={classes.root}>
      <LegacySplitPane split="vertical" minSize="50%">
        <AceEditor
          ref={aceComponentOriginData}
          mode="json"
          theme="twilight"
          fontSize={14}
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          value={JSON.stringify(task && task.document.data, null, 4)}
          width="100%"
          height="100%"
          readOnly={true}
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 4
          }}
        />
        <div className={classes.rightContainer} ref={rightContainerRef}>
          {renderControls()}
          <div className={classes.funcContainer}>
            <Typography variant="body1">
              {t('Function')}
              <IconButton onClick={openModal}>
                <FullscreenIcon />
              </IconButton>
            </Typography>
            <AceEditor
              ref={aceComponentInput}
              mode="javascript"
              theme="twilight"
              fontSize={14}
              showPrintMargin={true}
              showGutter={true}
              highlightActiveLine={true}
              value={func || ''}
              width="100%"
              height="100%"
              readOnly={false}
              onChange={(value) => handleChange('func', value)}
              wrapEnabled={true}
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
                showLineNumbers: true,
                tabSize: 4,
                highlightActiveLine: true
              }}
            />
          </div>
          <div className={classes.funcContainer}>
            <Typography
              variant="body1"
              style={{ color: 'black', visibility: 'visible' }}
              className={classes.funcContainerTitle}
            >
              {t('Result')}
            </Typography>
            <AceEditor
              ref={aceComponentOutput}
              mode="json"
              theme="twilight"
              fontSize={14}
              showPrintMargin={true}
              showGutter={true}
              highlightActiveLine={true}
              value={handleCheckFunc()}
              width="100%"
              height="90%"
              readOnly={false}
              wrapEnabled={true}
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
                showLineNumbers: true,
                tabSize: 4
              }}
            />
          </div>
        </div>
      </LegacySplitPane>

      <Dialog open={open} fullScreen={true} fullWidth={true} onClose={closeModal}>
        <div className={classes.fullHeightContainer}>
          <LegacySplitPane split="vertical" minSize="50%" style={{ height: '100%' }}>
            <div className={classes.editorContainer}>
              <Typography variant="h6" style={{ height: '40px' }}>
                Функція
              </Typography>
              <AceEditor
                mode="javascript"
                theme="twilight"
                fontSize={14}
                showPrintMargin={true}
                showGutter={true}
                highlightActiveLine={true}
                value={func || ''}
                width="100%"
                height="calc(100% - 40px)"
                readOnly={false}
                onChange={(value) => handleChange('func', value)}
                wrapEnabled={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 4
                }}
              />
            </div>
            <div className={classes.editorContainer}>
              <div className={classes.resultHeader}>
                <Typography variant="h6">{t('Result')}</Typography>
                <Toolbar className={classes.toolbar}>
                  <IconButton onClick={closeModal} size="large">
                    <CloseIcon />
                  </IconButton>
                </Toolbar>
              </div>
              <AceEditor
                mode="json"
                theme="twilight"
                fontSize={14}
                showPrintMargin={true}
                showGutter={true}
                highlightActiveLine={true}
                value={handleCheckFunc()}
                width="100%"
                height="calc(100% - 40px)"
                readOnly={true}
                wrapEnabled={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 4
                }}
              />
            </div>
          </LegacySplitPane>
        </div>
      </Dialog>
    </div>
  );
};

const mapStateToProps = ({ debugTools: { checkValidFuncs } }: any) => ({
  checkValidFuncs
});

const mapDispatchToProps = (dispatch: any) => ({
  actions: {
    setCheckValidFunc: bindActionCreators(setCheckValidFunc, dispatch)
  }
});

const styled = withStyles(styles as any)(CheckValidFunction as any);
const translated = translate('DebugTools')(styled as any);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

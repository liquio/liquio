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
import ReactResizeDetector from 'react-resize-detector';

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

class CheckValidFunction extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: false, selectedType: 'document', showControls: false };
    this.aceComponentInput = React.createRef();
    this.aceComponentOutput = React.createRef();
    this.aceComponentOriginData = React.createRef();
  }

  handleChange = (property, value) => {
    const { actions, checkValidFuncs, task } = this.props;

    actions.setCheckValidFunc(task?.id, {
      ...(checkValidFuncs[task?.id] || {}),
      [property]: value
    });
  };

  handleTypeChange = (event) => {
    const selectedType = event.target.value;
    this.setState({ selectedType, showControls: selectedType !== 'document' });
  };

  handleCheckFunc = () => {
    const { task, stepId, checkValidFuncs, userInfo } = this.props;
    const { selectedType } = this.state;
    const { element, func } = checkValidFuncs[task?.id] || {};

    if (!checkValidFuncs[task?.id]) return '';
    if (selectedType === 'document') {
      const result = evaluate(func, task.document.data);
      if (result instanceof Error) {
        result.commit({ type: 'debug tools: check function', result });
        return '';
      }
      return JSON.stringify(result, null, 4);
    }

    const elements = this.getElements();
    const control = elements.find(({ key }) => key === element);
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
      result.commit({ type: 'debug tools: check valid function', task });
      return result.message;
    }

    return JSON.stringify(result, null, 4);
  };

  getElements = () => {
    const { task, template, stepId } = this.props;
    const pages = template && template.jsonSchema.properties;
    const elements = [];

    if (stepId && pages[stepId]) {
      propertiesEach(
        pages[stepId],
        task.document.data[stepId],
        (schema, data, path, parentSchema, parentData, key) => {
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

  renderControls = () => {
    const { t, task, checkValidFuncs, classes } = this.props;
    const { element } = checkValidFuncs[task?.id] || {};
    const { selectedType, showControls } = this.state;
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
            onChange={this.handleTypeChange}
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
              onChange={({ target: { value } }) => this.handleChange('element', value)}
            >
              {this.getElements().map((item, index) => (
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

  onResize = () => {
    this.aceComponentInput.current.editor.resize();
    this.aceComponentOutput.current.editor.resize();
    this.aceComponentOriginData.current.editor.resize();
  };

  openModal = () => this.setState({ open: true });

  closeModal = () => this.setState({ open: false });

  render() {
    const { t, classes, task, checkValidFuncs } = this.props;
    const { open } = this.state;
    const { func } = checkValidFuncs[task?.id] || {};

    return (
      <div className={classes.root}>
        <SplitPane split="vertical" minSize="50%">
          <AceEditor
            ref={this.aceComponentOriginData}
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
          <div className={classes.rightContainer}>
            <ReactResizeDetector handleHeight={true} onReіsize={this.onResize} />
            {this.renderControls()}
            <div className={classes.funcContainer}>
              <Typography variant="body1">
                {t('Function')}
                <IconButton onClick={this.openModal}>
                  <FullscreenIcon />
                </IconButton>
              </Typography>
              <AceEditor
                ref={this.aceComponentInput}
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
                onChange={(value) => this.handleChange('func', value)}
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
                ref={this.aceComponentOutput}
                mode="json"
                theme="twilight"
                fontSize={14}
                showPrintMargin={true}
                showGutter={true}
                highlightActiveLine={true}
                value={this.handleCheckFunc()}
                width="100%"
                height="90%"
                readOnly={false}
                onChange={this.handleChangeFunc}
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
        </SplitPane>

        <Dialog open={open} fullScreen={true} fullWidth={true} onClose={this.closeModal}>
          <div className={classes.fullHeightContainer}>
            <SplitPane split="vertical" minSize="50%" style={{ height: '100%' }}>
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
                  onChange={(value) => this.handleChange('func', value)}
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
                    <IconButton onClick={this.closeModal} size="large">
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
                  value={this.handleCheckFunc()}
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
            </SplitPane>
          </div>
        </Dialog>
      </div>
    );
  }
}

const mapStateToProps = ({ debugTools: { checkValidFuncs } }) => ({
  checkValidFuncs
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    setCheckValidFunc: bindActionCreators(setCheckValidFunc, dispatch)
  }
});

const styled = withStyles(styles)(CheckValidFunction);
const translated = translate('DebugTools')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);

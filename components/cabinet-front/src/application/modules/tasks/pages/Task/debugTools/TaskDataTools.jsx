import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@mui/styles/withStyles';
import AceEditor from 'react-ace';

import 'ace-builds/webpack-resolver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-twilight';

const styles = {
  root: {
    display: 'flex',
    height: '100%'
  }
};

class TaskDataTools extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      folds: null
    };
    this.editor = React.createRef();
  }

  saveFolds = () => {
    const folds = this.editor.current.editor.session.selection.session.$foldData || [];

    this.setState({
      folds: folds
        .map((fold) => ({
          start: fold.start.row,
          end: fold.end.row
        }))
        .filter(Boolean)
    });
  };

  setFold = ({ start, end }) => {
    this.editor.current.editor.session.selection.session.foldAll(start, end);
  };

  componentDidUpdate = () => {
    const { folds } = this.state;
    folds && folds.forEach(({ start, end }) => this.setFold({ start, end }));
  };

  render = () => {
    const { classes, task, template } = this.props;

    return (
      <div className={classes.root}>
        <AceEditor
          ref={this.editor}
          mode="json"
          theme="twilight"
          fontSize={14}
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          value={JSON.stringify(task && task.document.data, null, 4)}
          width="100%"
          readOnly={true}
          style={{ minHeight: '100%' }}
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 4
          }}
          onBlur={this.saveFolds}
        />
        <AceEditor
          mode="json"
          theme="twilight"
          fontSize={14}
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          minLines={20}
          value={JSON.stringify(template && template.jsonSchema, null, 4)}
          width="100%"
          style={{ minHeight: '100%' }}
          readOnly={true}
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 4
          }}
        />
      </div>
    );
  };
}

TaskDataTools.propTypes = {
  classes: PropTypes.object.isRequired,
  task: PropTypes.object.isRequired,
  template: PropTypes.object.isRequired
};

export default withStyles(styles)(TaskDataTools);

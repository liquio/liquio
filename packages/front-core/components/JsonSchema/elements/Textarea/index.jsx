import React from 'react';
import { translate } from 'react-translate';
import ReactQuill, { Quill } from 'react-quill';
import PropTypes from 'prop-types';
import {
  Button,
  Dialog,
  DialogActions,
  Typography,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import QuillToggleFullscreenButton from 'quill-toggle-fullscreen-button';
import SaveIcon from '@mui/icons-material/SaveOutlined';

import { quillFormats } from 'components/JsonSchema/elements/Textarea/settings';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import sanitize from 'components/JsonSchema/elements/Textarea/sanitize';
import renderHTML from 'helpers/renderHTML';
import 'react-quill/dist/quill.snow.css';

const style = (theme) => ({
  hint: {
    marginBottom: 8,
    color: 'rgba(0, 0, 0, 0.8)',
    lineHeight: '1.5em',
  },
  link: {
    color: '#1b69b6',
    cursor: 'pointer',
  },
  quill: {
    minHeight: 200,
    position: 'relative',
    '& .ql-container, .ql-editor': {
      minHeight: 200,
    },
    ...(theme.quill || {}),
  },
  quillErrored: {
    '& .ql-toolbar, .ql-container': {
      borderColor: '#f44336',
    },
  },
  elementHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textArea: {
    marginBottom: 40,
  },
  textAreaDescription: {
    color: '#000000',
  },
  saveIcon: {
  }
});

const EXTEND_TAGS = ['p', 'div', 'section', 'footer'];

EXTEND_TAGS.forEach((tag) => {
  const Block = Quill.import('blots/block');

  class CustomBlockBlot extends Block {
    static create(value) {
      const node = super.create(value);

      if (value.class) {
        const classNames = value.class.split(' ');
        classNames.forEach((className) => {
          node.classList.add(className);
        });
      }

      return node;
    }

    static formats(node) {
      const format = {};

      if (node.classList.length) {
        format.class = Array.from(node.classList).join(' ');
      }
      return format;
    }

    format(name, value) {
      if (name === 'class' && value) {
        const classNames = value.split(' ');
        classNames.forEach((className) => {
          this.domNode.classList.add(className);
        });
      } else {
        super.format(name, value);
      }
    }
  }

  CustomBlockBlot.blotName = tag;
  CustomBlockBlot.tagName = tag;

  Quill.register(CustomBlockBlot);
});

Quill.register('modules/toggleFullscreen', QuillToggleFullscreenButton);

const CustomListModule = Quill.import('core/module');

class CustomListHandler extends CustomListModule {
  constructor(quill, options) {
    super(quill, options);
  }
}

Quill.register('modules/customListHandler', CustomListHandler);

const Parchment = Quill.import('parchment');
const icons = Quill.import('ui/icons');
const IndentAttributor = new Parchment.Attributor.Class(
  'first-line-indent',
  'first-line-indent',
  {
    scope: Parchment.Scope.BLOCK,
    whitelist: ['3em'],
  },
);

Quill.register(IndentAttributor, true);

icons['first-line-indent'] = icons.direction;

const sanitizeQuill = (content = '') => {
  let sanitized = sanitize(content);
  sanitized = sanitized.replace(
    /background-color:rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/g,
    'background-color: rgb($1, $2, $3);',
  );
  sanitized = sanitized.replace(
    /color:rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/g,
    'color: rgb($1, $2, $3);',
  );
  sanitized = sanitized.replace(/<br \/>/g, '<br>');
  sanitized = sanitized.replace(/;;/g, '; ');

  if (/^<p><br><\/p>$/.test(sanitized)) {
    sanitized = sanitized.replace(/(<p><br><\/p>)+\s*$/g, '');
  }

  const nbspPositions = [];
  const nbspRegex = /&nbsp;/g;
  let match;
  while ((match = nbspRegex.exec(content)) !== null) {
    nbspPositions.push(match.index);
  }
  nbspPositions.forEach((position) => {
    sanitized =
      sanitized.substring(0, position) +
      '&nbsp;' +
      sanitized.substring(position + 1);
  });

  return sanitized;
};

const Textarea = (props) => {
  const {
    t,
    classes,
    sample,
    hint,
    errors,
    path,
    required,
    description,
    error,
    hidden,
    width,
    maxWidth,
    noMargin,
    htmlMaxLength,
    onChange,
    readOnly,
    height,
  } = props;
  const [showSample, setShowSample] = React.useState(false);
  const [value, setValue] = React.useState(sanitizeQuill(props.value || ''));
  const [saveTimeout, setSaveTimeout] = React.useState(null);
  const [showSaveMessageTimeout, setShowSaveMessageTimeout] =
    React.useState(null);
  const quillRef = React.useRef(null);

  const id = React.useMemo(() => {
    return (path || []).join('.').replace(/\./gi, '-');
  }, [path]);

  const toggleSampleDialog = React.useCallback(() => {
    setShowSample(!showSample);
  }, [showSample]);

  const handleTextChange = (content, _, source) => {
    setValue(content);
    if (source === 'api') return;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    setSaveTimeout(
      setTimeout(() => {
        const sanitizeContent = sanitizeQuill(content);
        onChange(sanitizeContent.replace(
          /(<p><br><\/p>)+\s*$/g,
          '',
        ));

        if (showSaveMessageTimeout) {
          clearTimeout(showSaveMessageTimeout);
        }
        setShowSaveMessageTimeout(setTimeout(() => {
          setShowSaveMessageTimeout(null);
        }, 2000));

      }, 1000));
  };

  const addAriaLabels = React.useCallback(() => {
    const quill = quillRef.current;
    const quillToolbar = quill && quill.getEditor().getModule('toolbar');

    const { controls } = quillToolbar || {};

    if (controls) {
      ['header', 'color', 'background'].forEach((type) => {
        const colorControl = controls.find((control) => control[0] === type);

        if (colorControl) {
          const colorControlElement = colorControl[1];

          if (colorControlElement) {
            const ariaLabel = colorControlElement.getAttribute('aria-label');
            const title = colorControlElement.getAttribute('title');

            const children = colorControlElement.previousSibling.children;

            if (children && children.length) {
              const child = children[0];
              child.setAttribute('aria-label', ariaLabel);
              child.setAttribute('title', title);
            }
          }
        }
      });

      const fullscreen = document.querySelectorAll('.ql-fullscreen');

      if (fullscreen.length) {
        fullscreen.forEach((element) => {
          element.setAttribute('aria-label', t('FULLSCREEN'));
          element.setAttribute('title', t('FULLSCREEN'));
        });
      }
    }
  }, [quillRef, t]);

  const renderSampleDialog = React.useCallback(() => {
    return (
      <Dialog
        open={showSample}
        onClose={toggleSampleDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        id={path.concat('dialog').join('-')}
        className={classes.dialog}
      >
        <DialogTitle
          className={classes.dialogContentWrappers}
          id={path.concat('dialog-title alert-dialog-title').join('-')}
          aria-label={t('SAMPLE_EXPAND')}
        >
          {t('SAMPLE_EXPAND')}
        </DialogTitle>
        <DialogContent
          className={classes.dialogContentWrappers}
          id={path.concat('dialog-content').join('-')}
          aria-label={hint}
        >
          <div>{renderHTML(hint)}</div>
        </DialogContent>
        <DialogActions
          className={classes.dialogContentWrappers}
          id={path.concat('dialog-actions').join('-')}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={toggleSampleDialog}
            id={path.concat('close-button').join('-')}
            aria-label={t('CLOSE')}
          >
            {t('CLOSE')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }, [showSample, toggleSampleDialog, t, hint, classes, path]);

  const renderCounter = React.useCallback(() => {
    const replaceTags = (value || '').replace(/<\/?[^>]+>/g, '');
    const limitReached = replaceTags.length > Number(htmlMaxLength);

    return (
      <Typography
        variant="body2"
        align="right"
        color={limitReached ? 'error' : 'initial'}
        style={{
          margin: '8px 0 4px',
        }}
        tabIndex="0"
        aria-label={t('SYMBOLS_COUNT', {
          num: replaceTags.length,
          max: htmlMaxLength ? `${t('FROM')} ${htmlMaxLength}` : '',
        })}
      >
        {t('SYMBOLS_COUNT', {
          num: replaceTags.length,
          max: htmlMaxLength ? `${t('FROM')} ${htmlMaxLength}` : '',
        })}
      </Typography>
    );
  }, [t, htmlMaxLength, value]);

  const customToolbar = React.useCallback(() => {
    return (
      <div id={`toolbar-custom-${id}`} className="quill-toolbar-custom">
        <div className="ql-formats">
          <select
            className="ql-header"
            defaultValue={''}
            onChange={(e) => e.persist()}
            aria-label={t('EditorBtnLabelTypeOfText')}
            title={t('EditorBtnLabelTypeOfText')}
            role="button"
          >
            <option value="1" />
            <option value="2" />
            <option value="3" />
            <option value="4" />
            <option value="5" />
            <option value="6" />
            <option selected />
          </select>
        </div>
        <div className="ql-formats color-block">
          <select
            className="ql-color"
            aria-label={t('EditorBtnLabelColor')}
            title={t('EditorBtnLabelColor')}
            role="button"
          />
          <select
            className="ql-background"
            aria-label={t('EditorBtnLabelBackground')}
            title={t('EditorBtnLabelBackground')}
            role="button"
          />
        </div>
        <div className="ql-formats">
          <button
            className="ql-bold"
            aria-label={t('EditorBtnLabelBold')}
            title={t('EditorBtnLabelBold')}
          />
          <button
            className="ql-italic"
            aria-label={t('EditorBtnLabelItalic')}
            title={t('EditorBtnLabelItalic')}
          />
          <button
            className="ql-underline"
            aria-label={t('EditorBtnLabelUnderline')}
            title={t('EditorBtnLabelUnderline')}
          />
          <button
            className="ql-strike"
            aria-label={t('EditorBtnLabelStrike')}
            title={t('EditorBtnLabelStrike')}
          />
          <button
            className="ql-link"
            aria-label={t('EditorBtnLabelLink')}
            title={t('EditorBtnLabelLink')}
          />
        </div>
        <div className="ql-formats">
          <button
            className="ql-align"
            value=""
            aria-label={t('EditorBtnLabelAlignTextLeft')}
            title={t('EditorBtnLabelAlignTextLeft')}
          />
          <button
            className="ql-align"
            value="center"
            aria-label={t('EditorBtnLabelAlignTextCenter')}
            title={t('EditorBtnLabelAlignTextCenter')}
          />
          <button
            className="ql-align"
            value="right"
            aria-label={t('EditorBtnLabelAlignTextRight')}
            title={t('EditorBtnLabelAlignTextRight')}
          />
          <button
            class="ql-align"
            value="justify"
            aria-label={t('EditorBtnLabelAlignTextJustify')}
            title={t('EditorBtnLabelAlignTextJustify')}
          />
        </div>
        <div className="ql-formats">
          <button
            className="ql-list"
            value="ordered"
            aria-label={t('EditorBtnLabelOlList')}
            title={t('EditorBtnLabelOlList')}
          />
          <button
            className="ql-list"
            value="bullet"
            aria-label={t('EditorBtnLabelUlList')}
            title={t('EditorBtnLabelUlList')}
          />
        </div>
        <div className="ql-formats">
          <button
            className="ql-indent"
            value="-1"
            aria-label={t('EditorBtnLabelRemoveIndent')}
            title={t('EditorBtnLabelRemoveIndent')}
          />
          <button
            className="ql-indent"
            value="+1"
            aria-label={t('EditorBtnLabelAddIndent')}
            title={t('EditorBtnLabelAddIndent')}
          />
          <button
            className="ql-first-line-indent"
            aria-label={t('EditorBtnLabelIndentBlock')}
            title={t('EditorBtnLabelIndentBlock')}
          />
        </div>
        <div className="ql-formats">
          <button
            className="ql-clean"
            aria-label={t('EditorBtnLabelClean')}
            title={t('EditorBtnLabelClean')}
          />
        </div>
      </div>
    );
  }, [id, t]);

  const onKeyDownCapture = React.useCallback(
    (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();

        const nextControl = document.getElementById(id).nextElementSibling;

        if (nextControl) {
          nextControl.querySelector('[tabIndex="0"]').focus();
        }
      }
    },
    [id],
  );

  const quillModulesCustom = React.useMemo(() => {
    return {
      toolbar: {
        container: `#toolbar-custom-${id}`,
        handlers: {
          'first-line-indent': function () {
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection();

            if (range) {
              const [line] = quill.getLine(range.index);
              const currentIndent = line.formats()['first-line-indent'] || '0';

              const hasList = quill.getFormat().list;
              if (hasList) {
                quill.format('list', false);
              }

              const nextIndent = currentIndent === '0' ? '3em' : '0';

              if (nextIndent === '0') {
                quill.format('first-line-indent', false);
              } else {
                quill.format('first-line-indent', nextIndent);
              }

              setTimeout(() => {
                const content = quill.root.innerHTML;
                handleTextChange(content, quill.getContents(), 'user');
              }, 0);
            }
          },
          list: function (value) {
            if (quillRef.current) {
              const quill = quillRef.current.getEditor();
              const currentList = quill.getFormat().list;

              if (value === currentList) {
                quill.format('list', false);
              } else {
                quill.format('list', value);
              }

              quill.format('first-line-indent', false);

              setTimeout(() => {
                const content = quill.root.innerHTML;
                handleTextChange(content, quill.getContents(), 'user');
              }, 0);
            }
          },
          color: function (value) {
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection();

            if (range) {
              const formats = quill.getFormat(range.index, range.length);
              const currentColor = formats.color || '';
              if (currentColor === value) {
                quill.format('color', false);
              } else {
                quill.format('color', value);
              }

              setTimeout(() => {
                const content = quill.root.innerHTML;
                handleTextChange(content, quill.getContents(), 'user');
              }, 0);
            }
          },
          background: function (value) {
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection();

            if (range) {
              const formats = quill.getFormat(range.index, range.length);
              const currentBackground = formats.background || '';
              if (currentBackground === value) {
                quill.format('background', false);
              } else {
                quill.format('background', value);
              }

              setTimeout(() => {
                const content = quill.root.innerHTML;
                handleTextChange(content, quill.getContents(), 'user');
              }, 0);
            }
          },
        },
      },
      customListHandler: true,
      toggleFullscreen: true,
      clipboard: {
        matchVisual: false,
      },
    };
  }, [id]);

  const renderElement = React.useCallback(() => {
    return (
      <div className="text-editor">
        {customToolbar()}
        <div onKeyDownCapture={onKeyDownCapture}>
          <ReactQuill
            ref={quillRef}
            readOnly={readOnly}
            modules={quillModulesCustom}
            formats={quillFormats.concat(EXTEND_TAGS)}
            value={value || ''}
            className={[classes.quill, error && classes.quillErrored]
              .filter(Boolean)
              .join(' ')}
            onChange={handleTextChange}
            id={path.join('-')}
            preserveWhitespace={true}
            style={{
              height: height || 'unset',
            }}
          />
        </div>
      </div>
    );
  }, [
    quillModulesCustom,
    classes,
    error,
    readOnly,
    path,
    height,
    customToolbar,
    handleTextChange,
    value,
    onKeyDownCapture,
  ]);

  const renderSample = React.useMemo(() => {
    return (
      <div className={classes.elementHead}>
        {showSaveMessageTimeout ? <SaveIcon className={classes.saveIcon}/> : null}
        <span>
          {sample}
          &nbsp;
          {hint ? (
            <span
              className={classes.link}
              onClick={toggleSampleDialog}
              id={path.concat('open-dialog-button').join('-')}
            >
              {t('SHOW_SAMPLE_DIALOG')}
              {renderSampleDialog()}
            </span>
          ) : null}
        </span>
        {renderCounter()}
      </div>
    );
  }, [
    classes,
    hint,
    path,
    renderCounter,
    renderSampleDialog,
    sample,
    t,
    toggleSampleDialog,
  ]);

  React.useEffect(() => {
    const sanitized = sanitizeQuill(props.value || '');
    const cleanedContent = sanitized.replace(/(<p><br><\/p>)+\s*$/g, '');
    setValue(cleanedContent);
  }, []);

  React.useEffect(() => {
    addAriaLabels();
  }, [addAriaLabels, props.value]);

  if (hidden) return null;

  return (
    <ElementContainer
      required={required}
      description={description}
      className={classes.textArea}
      noMargin={noMargin}
      error={error}
      bottomError={true}
      sample={renderSample}
      errors={errors}
      width={width}
      maxWidth={maxWidth}
      descriptionClassName={classes.textAreaDescription}
      id={id}
    >
      {renderElement()}
    </ElementContainer>
  );
};

Textarea.propTypes = {
  onChange: PropTypes.func,
  sample: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  classes: PropTypes.object.isRequired,
  path: PropTypes.array,
  readOnly: PropTypes.bool,
  t: PropTypes.func.isRequired,
  hint: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.number,
};

Textarea.defaultProps = {
  onChange: undefined,
  sample: '',
  error: null,
  readOnly: false,
  path: [],
  value: '',
  hint: '',
  height: null,
};

const styled = withStyles(style)(Textarea);

export default translate('Elements')(styled);

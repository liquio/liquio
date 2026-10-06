import React from 'react';
import { translate, Translate } from 'react-translate';
import ReactQuill from 'react-quill';
import {
  Button,
  Dialog,
  DialogActions,
  Typography,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import QuillToggleFullscreenButton from 'quill-toggle-fullscreen-button';
import SaveIcon from '@mui/icons-material/SaveOutlined';

import { quillFormats } from 'components/JsonSchema/elements/Textarea/settings';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import sanitize from 'components/JsonSchema/elements/Textarea/sanitize';
import renderHTML from 'helpers/renderHTML';
import 'react-quill/dist/quill.snow.css';

const Quill = ReactQuill.Quill;

const style = (theme: Theme) => ({
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
    position: 'relative' as const,
    '& .ql-container, .ql-editor': {
      minHeight: 200,
    },
    ...((theme as unknown as { quill?: object }).quill || {}),
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
    static create(value: { class?: string }) {
      const node = super.create(value);

      if (value.class) {
        const classNames = value.class.split(' ');
        classNames.forEach((className: string) => {
          node.classList.add(className);
        });
      }

      return node;
    }

    static formats(node: HTMLElement) {
      const format: { class?: string } = {};

      if (node.classList.length) {
        format.class = Array.from(node.classList).join(' ');
      }
      return format;
    }

    format(name: string, value: string) {
      if (name === 'class' && value) {
        const classNames = value.split(' ');
        classNames.forEach((className: string) => {
          (this as unknown as { domNode: HTMLElement }).domNode.classList.add(className);
        });
      } else {
        super.format(name, value);
      }
    }
  }

  (CustomBlockBlot as unknown as { blotName: string }).blotName = tag;
  (CustomBlockBlot as unknown as { tagName: string }).tagName = tag;

  Quill.register(CustomBlockBlot);
});

Quill.register('modules/toggleFullscreen', QuillToggleFullscreenButton);

const CustomListModule = Quill.import('core/module');

class CustomListHandler extends CustomListModule {
  constructor(quill: unknown, options: unknown) {
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

const sanitizeQuill = (content = ''): string => {
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

  const nbspPositions: number[] = [];
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

interface TextareaProps extends WithStyles<typeof style> {
  t: Translate;
  sample?: string;
  hint?: string;
  errors?: unknown[];
  path?: Array<string | number>;
  required?: boolean;
  description?: string;
  error?: unknown;
  hidden?: boolean;
  width?: string | number;
  maxWidth?: string | number;
  noMargin?: boolean;
  htmlMaxLength?: number;
  onChange?: ((value: string) => void) | undefined;
  readOnly?: boolean;
  height?: number | null;
  value?: string | number;
}

const Textarea = (props: TextareaProps) => {
  const {
    t,
    classes,
    sample = '',
    hint = '',
    errors,
    path = [],
    required,
    description,
    error = null,
    hidden,
    width,
    maxWidth,
    noMargin,
    htmlMaxLength,
    onChange,
    readOnly = false,
    height = null,
  } = props;
  const [showSample, setShowSample] = React.useState(false);
  const [value, setValue] = React.useState(sanitizeQuill(String(props.value || '')));
  const [saveTimeout, setSaveTimeout] = React.useState<ReturnType<typeof setTimeout> | null>(null);
  const [showSaveMessageTimeout, setShowSaveMessageTimeout] =
    React.useState<ReturnType<typeof setTimeout> | null>(null);
  const quillRef = React.useRef<ReactQuill | null>(null);

  const id = React.useMemo(() => {
    return (path || []).join('.').replace(/\./gi, '-');
  }, [path]);

  const toggleSampleDialog = React.useCallback(() => {
    setShowSample(!showSample);
  }, [showSample]);

  const handleTextChange = (content: string, _delta?: unknown, source?: string) => {
    setValue(content);
    if (source === 'api') return;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    setSaveTimeout(
      setTimeout(() => {
        const sanitizeContent = sanitizeQuill(content);
        onChange?.(sanitizeContent.replace(
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
    const quillToolbar = quill && (quill.getEditor() as unknown as { getModule: (name: string) => { controls?: Array<[string, HTMLElement]> } }).getModule('toolbar');

    const { controls } = quillToolbar || {};

    if (controls) {
      ['header', 'color', 'background'].forEach((type) => {
        const colorControl = controls.find((control) => control[0] === type);

        if (colorControl) {
          const colorControlElement = colorControl[1];

          if (colorControlElement) {
            const ariaLabel = colorControlElement.getAttribute('aria-label');
            const title = colorControlElement.getAttribute('title');

            const children = (colorControlElement.previousSibling as HTMLElement)?.children;

            if (children && children.length) {
              const child = children[0];
              child.setAttribute('aria-label', ariaLabel as string);
              child.setAttribute('title', title as string);
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
        className={(classes as unknown as { dialog?: string }).dialog}
      >
        <DialogTitle
          // `dialogContentWrappers` was never defined in `style` above — this
          // silently no-ops today (no such classKey exists). Preserved as-is.
          className={(classes as unknown as { dialogContentWrappers?: string }).dialogContentWrappers}
          id={path.concat('dialog-title alert-dialog-title').join('-')}
          aria-label={t('SAMPLE_EXPAND')}
        >
          {t('SAMPLE_EXPAND')}
        </DialogTitle>
        <DialogContent
          // `dialogContentWrappers` was never defined in `style` above — this
          // silently no-ops today (no such classKey exists). Preserved as-is.
          className={(classes as unknown as { dialogContentWrappers?: string }).dialogContentWrappers}
          id={path.concat('dialog-content').join('-')}
          aria-label={hint}
        >
          <div>{renderHTML(hint)}</div>
        </DialogContent>
        <DialogActions
          // `dialogContentWrappers` was never defined in `style` above — this
          // silently no-ops today (no such classKey exists). Preserved as-is.
          className={(classes as unknown as { dialogContentWrappers?: string }).dialogContentWrappers}
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
        tabIndex={0}
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
            {...({ class: 'ql-align' } as Record<string, unknown>)}
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
    (event: React.KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();

        const nextControl = document.getElementById(id)?.nextElementSibling;

        if (nextControl) {
          nextControl.querySelector<HTMLElement>('[tabIndex="0"]')?.focus();
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
          'first-line-indent': function (this: { quill: ReturnType<ReactQuill['getEditor']> }) {
            const quill = quillRef.current?.getEditor();
            const range = quill?.getSelection();

            if (range) {
              const [line] = (quill as unknown as { getLine: (index: number) => [{ formats: () => Record<string, unknown> }] }).getLine(range.index);
              const currentIndent = line.formats()['first-line-indent'] || '0';

              const hasList = (quill?.getFormat() as { list?: unknown })?.list;
              if (hasList) {
                quill?.format('list', false);
              }

              const nextIndent = currentIndent === '0' ? '3em' : '0';

              if (nextIndent === '0') {
                quill?.format('first-line-indent', false);
              } else {
                quill?.format('first-line-indent', nextIndent);
              }

              setTimeout(() => {
                const content = (quill as unknown as { root: HTMLElement }).root.innerHTML;
                handleTextChange(content, quill?.getContents(), 'user');
              }, 0);
            }
          },
          list: function (value: string) {
            if (quillRef.current) {
              const quill = quillRef.current.getEditor();
              const currentList = (quill.getFormat() as { list?: unknown }).list;

              if (value === currentList) {
                quill.format('list', false);
              } else {
                quill.format('list', value);
              }

              quill.format('first-line-indent', false);

              setTimeout(() => {
                const content = (quill as unknown as { root: HTMLElement }).root.innerHTML;
                handleTextChange(content, quill.getContents(), 'user');
              }, 0);
            }
          },
          color: function (value: string) {
            const quill = quillRef.current?.getEditor();
            const range = quill?.getSelection();

            if (range) {
              const formats = quill?.getFormat(range.index, range.length) as { color?: string };
              const currentColor = formats.color || '';
              if (currentColor === value) {
                quill?.format('color', false);
              } else {
                quill?.format('color', value);
              }

              setTimeout(() => {
                const content = (quill as unknown as { root: HTMLElement }).root.innerHTML;
                handleTextChange(content, quill?.getContents(), 'user');
              }, 0);
            }
          },
          background: function (value: string) {
            const quill = quillRef.current?.getEditor();
            const range = quill?.getSelection();

            if (range) {
              const formats = quill?.getFormat(range.index, range.length) as { background?: string };
              const currentBackground = formats.background || '';
              if (currentBackground === value) {
                quill?.format('background', false);
              } else {
                quill?.format('background', value);
              }

              setTimeout(() => {
                const content = (quill as unknown as { root: HTMLElement }).root.innerHTML;
                handleTextChange(content, quill?.getContents(), 'user');
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
    const sanitized = sanitizeQuill(String(props.value || ''));
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
      sample={renderSample as never}
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

const styled = withStyles(style)(Textarea);

export default translate('Elements')(styled);

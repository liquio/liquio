import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import beautify, { html as prettifyHtml } from 'js-beautify';

import FunctionEditor from './FunctionEditor';

vi.mock('components/Editor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="editor" value={value} onChange={(e) => onChange(e.target.value)} />
  )
}));

const JS_SRC = '(doc) => { if (doc.a) { return doc.b; } return null; }';
const JS_PRETTY = '(doc) => {\n    if (doc.a) {\n        return doc.b;\n    }\n    return null;\n}';
const HTML_SRC = '<div>{{#if a}}<p>yes</p>{{else}}<p>no</p>{{/if}}</div>';
const HTML_PRETTY = '<div>{{#if a}}\n    <p>yes</p>\n  {{else}}\n    <p>no</p>\n  {{/if}}</div>';

const htmlOptions = {
  indent_size: 2,
  preserve_newlines: true,
  indent_handlebars: true,
  wrap_line_length: 120
};

type EditorProps = React.ComponentProps<typeof FunctionEditor>;

const setup = (props: Pick<EditorProps, 'language' | 'functionBody'>) => {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <FunctionEditor functionRow={1} functionName="fn" onChange={onChange} onClose={onClose} {...props} />
  );
  return { onChange, onClose, ...view };
};

describe('js-beautify contract', () => {
  it('exposes a default function and a named html function', () => {
    expect(typeof beautify).toBe('function');
    expect(typeof prettifyHtml).toBe('function');
  });

  it('formats JS with indent_size 4', () => {
    expect(beautify(JS_SRC, { indent_size: 4 })).toBe(JS_PRETTY);
  });

  it('formats HTML with handlebars blocks', () => {
    expect(prettifyHtml(HTML_SRC, htmlOptions)).toBe(HTML_PRETTY);
  });
});

describe('FunctionEditor', () => {
  it('shows beautified JS in the editor', () => {
    setup({ language: 'javascript', functionBody: JS_SRC });
    expect((screen.getByTestId('editor') as HTMLTextAreaElement).value).toBe(JS_PRETTY);
  });

  it('shows beautified HTML in the editor', () => {
    setup({ language: 'html', functionBody: HTML_SRC });
    expect((screen.getByTestId('editor') as HTMLTextAreaElement).value).toBe(HTML_PRETTY);
  });

  it('saves JS as a single-line function', async () => {
    const { onChange, onClose } = setup({ language: 'javascript', functionBody: JS_SRC });
    fireEvent.click(screen.getByLabelText('add'));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalledWith({
      functionRow: 1,
      functionName: 'fn',
      functionBody: '(doc) => {if (doc.a) {return doc.b}return null};'
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('wraps a bare argument in parentheses on save', async () => {
    const { onChange } = setup({ language: 'javascript', functionBody: 'doc => doc.a' });
    fireEvent.click(screen.getByLabelText('add'));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0].functionBody).toBe('(doc) => doc.a;');
  });

  it('saves HTML minified to one line', () => {
    const { onChange, onClose } = setup({ language: 'html', functionBody: HTML_SRC });
    fireEvent.click(screen.getByLabelText('add'));
    expect(onChange).toHaveBeenCalledWith({
      functionRow: 1,
      functionName: 'fn',
      functionBody: '<div>{{#if a}} <p>yes</p> {{else}} <p>no</p> {{/if}}</div>'
    });
    expect(onClose).toHaveBeenCalled();
  });
});

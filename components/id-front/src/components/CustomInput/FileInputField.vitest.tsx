import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import FileInputField from 'components/CustomInput/FileInputField';

// FileInputField has no translate() of its own: the parent passes `t` (PKCS7SignForm does, with the "SignForm"
// namespace). This stand-in does the same with the real English strings.
type FieldProps = Omit<ComponentProps<typeof FileInputField>, 't'>;
const Field = translate('SignForm')(({ t, ...props }: FieldProps & { t: Translate }) => <FileInputField t={t} {...props} />);

const renderField = (props: Partial<FieldProps> = {}) => {
  const onChange = vi.fn();
  const utils = renderWithTranslations(<Field onChange={onChange} {...props} />);
  const root = utils.container.querySelector('.MuiPaper-root') as HTMLElement;
  const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement | null;
  return { ...utils, onChange, root, input };
};

const makeFile = (name = 'key.p12', type = 'application/x-pkcs12', size?: number) => {
  const file = new File(['data'], name, { type });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
};

const upload = async (input: HTMLInputElement, files: File[]) => {
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
};

describe('FileInputField', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the drop prompt with a "browse" link and the size limit when there is no value', () => {
      const { getByText, container } = renderField();
      expect(container.textContent).toContain('Drag the key file here or');
      expect(getByText('browse')).toBeInTheDocument();
      expect(getByText('browse').className).toMatch(/FileInputField-link-\d+/);
      expect(getByText('Supported formats: .jks, .pfx, .pk8, .zs2, .dat')).toBeInTheDocument();
    });

    it('renders the upload icon, because the bpmn theme sets selectFilesAlt', () => {
      const { container } = renderField();
      expect(container.querySelector('svg')?.getAttribute('class')).toMatch(/FileInputField-uploadIcon-\d+/);
    });

    it('labels the file input and the drop zone for assistive technology', () => {
      const { input, container } = renderField();
      expect(input).toHaveAttribute('aria-label', 'browse');
      // DropFilesAriaLabel has no English string, so the key is shown.
      expect(container.querySelector('.MuiPaper-root > div')).toHaveAttribute('aria-label', 'SignForm.DropFilesAriaLabel');
    });

    it('is focusable and dashed by the paper class', () => {
      const { root } = renderField();
      expect(root).toHaveAttribute('tabindex', '0');
      expect(root.className).toMatch(/FileInputField-paper-\d+/);
      expect(root.className).not.toMatch(/errored|disabled|dropZoneActive/);
    });

    it('shows the chosen file name and the replace link instead of the prompt', () => {
      const { container, getByText, queryByText } = renderField({ value: makeFile('my.p12') });
      expect(getByText('Key file:')).toBeInTheDocument();
      expect(getByText('my.p12')).toBeInTheDocument();
      expect(getByText('Upload another file')).toBeInTheDocument();
      expect(queryByText('browse')).toBeNull();
      expect(container.textContent).not.toContain('Drag the key file');
    });

    it('shows no file name line for a value without a name', () => {
      const { getByText, container } = renderField({ value: { name: '' } as File });
      expect(getByText('Key file:')).toBeInTheDocument();
      expect(container.querySelectorAll('p')).toHaveLength(2);
    });
  });

  describe('disabled', () => {
    it('renders no file input and the disabled class', () => {
      const { input, root } = renderField({ disabled: true });
      expect(input).toBeNull();
      expect(root.className).toMatch(/FileInputField-disabled-\d+/);
      expect(root).toHaveAttribute('tabindex', '0');
    });

    it('dims the replace link when a file is set', () => {
      const { getByText } = renderField({ disabled: true, value: makeFile() });
      expect(getByText('Upload another file')).toHaveStyle({ opacity: '0.5' });
    });

    it('does not dim the replace link when enabled', () => {
      const { getByText } = renderField({ value: makeFile() });
      expect(getByText('Upload another file')).not.toHaveAttribute('style');
    });
  });

  describe('errors and helper text', () => {
    it('marks the field as errored for a boolean error', () => {
      const { root, getByText } = renderField({ error: true, helperText: 'Hint' });
      expect(root.className).toMatch(/FileInputField-errored-\d+/);
      expect(getByText('Hint')).toHaveClass('Mui-error');
    });

    it('renders an error object message as text', () => {
      const { getByText } = renderField({ error: { message: 'Key is required' } });
      expect(getByText('Key is required')).toBeInTheDocument();
    });

    // Pre-existing: PKCS7SignForm passes `error={!!errors.key}`, and `true.message` is undefined, so nothing is shown.
    it('renders no message for a boolean error', () => {
      const { container } = renderField({ error: true });
      expect(container.querySelector('.MuiFormControl-root')?.textContent).not.toMatch(/true|undefined/);
    });

    it('renders the helper text as an assertive alert', () => {
      const { getByText } = renderField({ helperText: 'Choose a key' });
      const helper = getByText('Choose a key');
      expect(helper).toHaveAttribute('role', 'alert');
      expect(helper).toHaveAttribute('aria-live', 'assertive');
      expect(helper).toHaveAttribute('tabindex', '-1');
    });

    it('focuses the helper text after a timeout when an error appears', () => {
      vi.useFakeTimers();
      const { rerender, getByText } = renderField({ helperText: 'Choose a key' });
      rerender(<Field onChange={vi.fn()} helperText="Choose a key" error={true} />);
      expect(document.activeElement).not.toBe(getByText('Choose a key'));
      act(() => void vi.advanceTimersByTime(0));
      expect(document.activeElement).toBe(getByText('Choose a key'));
    });

    it('does not steal focus when there is no error', () => {
      vi.useFakeTimers();
      const { rerender, getByText } = renderField({ helperText: 'Choose a key' });
      rerender(<Field onChange={vi.fn()} helperText="Another hint" />);
      act(() => void vi.advanceTimersByTime(10));
      expect(document.activeElement).not.toBe(getByText('Another hint'));
    });
  });

  describe('choosing a file', () => {
    it('calls onChange with the file', async () => {
      const { input, onChange } = renderField();
      const file = makeFile();
      await upload(input as HTMLInputElement, [file]);
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(file));
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('accepts a file dropped on the drop zone', async () => {
      const { root, onChange } = renderField();
      const file = makeFile();
      await act(async () => {
        fireEvent.drop(root, { dataTransfer: { files: [file], types: ['Files'] } });
      });
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(file));
    });

    it('rejects a file over the 50 MB limit: shows the error and calls onChange(null)', async () => {
      const { input, onChange, getByText } = renderField();
      await upload(input as HTMLInputElement, [makeFile('big.p12', 'application/x-pkcs12', 50 * 1024 * 1024 + 1)]);
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
      expect(getByText('Allowable file size exceeded or incorrect file format')).toBeInTheDocument();
    });

    it('accepts a file of exactly 50 MB', async () => {
      const { input, onChange } = renderField();
      const file = makeFile('ok.p12', 'application/x-pkcs12', 50 * 1024 * 1024);
      await upload(input as HTMLInputElement, [file]);
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(file));
    });

    // Pre-existing: a drop with no files at all is neither accepted nor rejected, so `acceptedFiles[0]` is undefined.
    it('calls onChange(undefined) for a drop that carries no files', async () => {
      const { root, onChange } = renderField();
      await act(async () => {
        fireEvent.drop(root, { dataTransfer: { files: [], types: ['Files'] } });
      });
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(undefined));
    });

    it('is single-file: two files are both rejected', async () => {
      const { input, onChange, getByText } = renderField();
      await upload(input as HTMLInputElement, [makeFile('a.p12'), makeFile('b.p12')]);
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
      expect(getByText('Allowable file size exceeded or incorrect file format')).toBeInTheDocument();
    });

    it('clears the error after a valid file follows a rejected one', async () => {
      const { input, onChange, queryByText } = renderField();
      await upload(input as HTMLInputElement, [makeFile('big.p12', 'application/x-pkcs12', 60 * 1024 * 1024)]);
      await waitFor(() => expect(queryByText('Allowable file size exceeded or incorrect file format')).toBeInTheDocument());
      const good = makeFile('good.p12');
      await upload(input as HTMLInputElement, [good]);
      await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(good));
      expect(queryByText('Allowable file size exceeded or incorrect file format')).toBeNull();
    });

    it('marks the field as errored while the size error is shown', async () => {
      const { input, root } = renderField();
      await upload(input as HTMLInputElement, [makeFile('big.p12', 'application/x-pkcs12', 60 * 1024 * 1024)]);
      await waitFor(() => expect(root.className).toMatch(/FileInputField-errored-\d+/));
    });

    it('does not throw without an onChange handler', async () => {
      const utils = renderWithTranslations(<Field {...({} as FieldProps)} />);
      const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
      await upload(input, [makeFile()]);
      expect(input).toBeInTheDocument();
    });
  });

  describe('accept', () => {
    it('sets the accept attribute from an accept map and rejects other types', async () => {
      const { input, onChange, getByText } = renderField({ accept: { 'application/x-pkcs12': ['.p12', '.pfx'] } });
      expect(input).toHaveAttribute('accept', 'application/x-pkcs12,.p12,.pfx');
      await upload(input as HTMLInputElement, [makeFile('notes.txt', 'text/plain')]);
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
      expect(getByText('Allowable file size exceeded or incorrect file format')).toBeInTheDocument();
    });

    it('accepts a file that matches the accept map', async () => {
      const { input, onChange } = renderField({ accept: { 'application/x-pkcs12': ['.p12'] } });
      const file = makeFile();
      await upload(input as HTMLInputElement, [file]);
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(file));
    });

    // Pre-existing: PKCS7SignForm passes accept={'.p12,.pfx'}, a string. react-dropzone 14 only understands a
    // map, so the string is silently turned into an empty accept attribute and every file type is accepted.
    it('ignores a string accept like the one PKCS7SignForm passes: nothing is restricted', async () => {
      const { input, onChange } = renderField({ accept: '.p12,.pfx' as unknown as FieldProps['accept'] });
      expect(input).toHaveAttribute('accept', '');
      const file = makeFile('notes.txt', 'text/plain');
      await upload(input as HTMLInputElement, [file]);
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(file));
    });
  });

  describe('drag state', () => {
    it('adds the active class while a file is dragged over and removes it on leave', async () => {
      const { root } = renderField();
      const dataTransfer = { files: [makeFile()], types: ['Files'] };
      await act(async () => {
        fireEvent.dragEnter(root, { dataTransfer });
      });
      await waitFor(() => expect(root.className).toMatch(/FileInputField-dropZoneActive-\d+/));
      await act(async () => {
        fireEvent.dragLeave(root, { dataTransfer });
      });
      await waitFor(() => expect(root.className).not.toMatch(/FileInputField-dropZoneActive-\d+/));
    });
  });
});

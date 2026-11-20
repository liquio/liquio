import { describe, expect, it, vi } from 'vitest';
import renderWithTheme from 'core/testHelpers/renderWithTheme';
import SelectFilesDialogContent from 'core/components/SelectFilesDialog/SelectFilesDialogContent';

vi.mock('core/components/SelectFileArea', () => ({
  default: () => <div data-testid="select-file-area" />
}));

const renderContent = (file?: File | null) =>
  renderWithTheme(
    <SelectFilesDialogContent
      classes={{}}
      setId={(name: string) => `test-${name}`}
      t={(key: string) => key}
      busy={false}
      handleChange={vi.fn()}
      getCurrentTitle={(title: string) => title}
      name="doc"
      showEmptyNameError={false}
      file={file}
      removeFile={vi.fn()}
      onDrop={vi.fn()}
    />
  );

describe('SelectFilesDialogContent', () => {
  it('renders the selected file name and size instead of the upload area', () => {
    const file = new File([new Uint8Array(1536)], 'report.pdf');
    const { container } = renderContent(file);
    expect(container.querySelector('#test-file-name')?.textContent).toBe('report.pdf');
    expect(container.querySelector('#test-file-size')?.textContent).toBe('1.5 KB');
    expect(container.querySelector('[data-testid="select-file-area"]')).toBeNull();
  });

  it('renders the upload area and no file card when no file is selected', () => {
    const { container } = renderContent(null);
    expect(container.querySelector('#test-card')).toBeNull();
    expect(container.querySelector('#test-file-name')).toBeNull();
    expect(container.querySelector('[data-testid="select-file-area"]')).not.toBeNull();
  });
});

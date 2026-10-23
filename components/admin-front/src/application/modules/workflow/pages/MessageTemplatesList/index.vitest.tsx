import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageTemplatesList from './index';

vi.mock('application/actions/messagesTemplates', () => ({
  requestMessagesTemplate: vi.fn(),
  updateMessagesTemplate: vi.fn(),
  createMessagesTemplate: vi.fn(),
  deleteMessagesTemplate: vi.fn(),
  exportMessagesTemplate: vi.fn(),
  importMessagesTemplate: vi.fn()
}));
vi.mock('actions/error', () => ({ addMessage: vi.fn() }));
vi.mock('react-translate', () => ({ useTranslate: () => (key: string) => key }));
vi.mock('react-redux', () => ({ connect: () => (component: unknown) => component }));
vi.mock('hooks/asModulePage', () => ({ default: (component: unknown) => component }));
vi.mock('layouts/LeftSidebar', () => ({
  default: ({ children }: React.PropsWithChildren) => <>{children}</>
}));
vi.mock('components/Editor', () => ({ EditorDialog: () => null }));
vi.mock('components/ConfirmDialog', () => ({ default: () => null }));
vi.mock('helpers/checkAccess', () => ({ default: () => false }));
vi.mock('components/DataTable', () => ({
  default: ({
    data,
    columns,
    actions,
    search
  }: {
    actions: {
      onSearchChange: (value: string) => void;
      load: () => void;
      onChangePage: (page: number) => void;
    };
    search: string;
    data: Record<string, unknown>[];
    columns: {
      id: string;
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
    }[];
  }) => (
    <>
      <input
        aria-label="Search"
        value={search}
        onChange={(e) => actions.onSearchChange(e.target.value)}
      />
      <button onClick={actions.load}>Reload</button>
      <button onClick={() => actions.onChangePage(1)}>Next</button>
      <table>
        <tbody>
          {data.map((row) => (
            <tr key={String(row.template_id)}>
              {columns.map((column) => (
                <td key={column.id}>
                  {column.render
                    ? column.render(row[column.id], row)
                    : String(row[column.id] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}));

const templates = [
  { template_id: 101, type: 'email', title: 'Welcome', text: '<h1>Hello Alice</h1>' },
  { template_id: 202, type: 'sms', title: 'Reminder', text: 'Appointment tomorrow' }
];

const setup = async () => {
  const Page = MessageTemplatesList as React.ComponentType<Record<string, unknown>>;
  const requestMessagesTemplate = vi
    .fn()
    .mockResolvedValue({ items: [...templates].reverse(), total: 25 });
  render(<Page actions={{ requestMessagesTemplate }} userInfo={{}} userUnits={[]} />);
  await screen.findByText('Welcome');
  return requestMessagesTemplate;
};

describe('Message templates', () => {
  it('requests backend search and pagination, resets the page and refreshes the current query', async () => {
    const request = await setup();
    expect(request).toHaveBeenLastCalledWith({ search: '', page: 1, count: 10 });
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith({ search: '', page: 2, count: 10 })
    );
    request.mockResolvedValue({ items: [templates[1]], total: 1 });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), {
      target: { value: 'server query' }
    });
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith({ search: 'server query', page: 1, count: 10 })
    );
    await waitFor(() => expect(screen.queryByText('Welcome')).not.toBeInTheDocument());
    expect(screen.getByText('Reminder')).toBeInTheDocument();
    const calls = request.mock.calls.length;
    fireEvent.click(screen.getByText('Reload'));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(calls + 1));
    expect(request).toHaveBeenLastCalledWith({ search: 'server query', page: 1, count: 10 });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: '' } });
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith({ search: '', page: 1, count: 10 })
    );
  });

  it('opens the selected HTML in a sandboxed modal and closes it', async () => {
    await setup();
    expect(screen.queryByText('Appointment tomorrow')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]);
    expect(screen.getByRole('dialog')).toHaveTextContent('Reminder');
    const frame = screen.getByTitle('Preview: Reminder');
    expect(frame).toHaveAttribute('srcdoc', 'Appointment tomorrow');
    expect(frame).toHaveAttribute('sandbox', '');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

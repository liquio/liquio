import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import moment from 'moment';

import ScheduleCalendar from 'components/JsonSchema/elements/ScheduleCalendar/index.js';
import MockStore from '../__mocks__/MockStore';
import MockTheme from '../__mocks__/MockTheme';

it('should display a disclaimer when scheduleDays is empty', () => {
  const description = 'Select your preferred schedule';
  const keyId = '123456';
  const onChange = jest.fn();
  const rootDocument = { id: 'rootDocumentId', data: { schedule: [] } };
  const dataPath = 'schedule';
  const notFoundMessage = 'No schedule found';

  render(
    <MockTheme>
      <MockStore>
        <ScheduleCalendar
          description={description}
          keyId={keyId}
          onChange={onChange}
          rootDocument={rootDocument}
          dataPath={dataPath}
          notFoundMessage={notFoundMessage}
        />
      </MockStore>
    </MockTheme>
  );

  waitFor(() => {
    expect(screen.getByText('No schedule found')).toBeInTheDocument();
  });
});

it('should render slots if dataPath provided', async () => {
  render(
    <MockTheme>
      <MockStore>
        <ScheduleCalendar
          description="Test Description"
          rootDocument={{
            data: {
              schedule: [
                {
                  start: moment().format('YYYY-MM-DD') + 'T11:00:00Z',
                  end: moment().format('YYYY-MM-DD') + 'T17:00:00Z',
                  title: 'title'
                }
              ]
            }
          }}
          dataPath={'schedule'}
          path={[]}
          stepName="step"
          taskId="taskId"
        />
      </MockStore>
    </MockTheme>
  );

  act(() => {
    const week = `${moment().startOf('week').format('DD.MM.YYYY')} — ${moment()
      .endOf('week')
      .format('DD.MM.YYYY')}`;
    screen.getByText(week).click();
  });

  expect(screen.getByText('13:00 - 13:15')).toBeInTheDocument();
});

it('should open and close dialog as expected', async () => {
  const mockOnChange = jest.fn();

  render(
    <MockTheme>
      <MockStore>
        <ScheduleCalendar
          description="Test Description"
          onChange={mockOnChange}
          rootDocument={{
            data: {
              schedule: [
                {
                  start: moment().format('YYYY-MM-DD') + 'T11:00:00Z',
                  end: moment().format('YYYY-MM-DD') + 'T17:00:00Z',
                  title: '11:00 - 17:00'
                }
              ]
            }
          }}
          dataPath={'schedule'}
          path={[]}
          stepName="step"
          handleOpenDialog={() => '<div>Dialog Content</div>'}
          taskId="taskId"
        />
      </MockStore>
    </MockTheme>
  );

  act(() => {
    const week = `${moment().startOf('week').format('DD.MM.YYYY')} — ${moment()
      .endOf('week')
      .format('DD.MM.YYYY')}`;
    screen.getByText(week).click();
  });

  act(() => {
    screen.getByText('11:00 - 17:00').click();
  });

  expect(screen.getByText('Dialog Content')).toBeInTheDocument();

  screen.getByTestId('close-dialog').click();
});

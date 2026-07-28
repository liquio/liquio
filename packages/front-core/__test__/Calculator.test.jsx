import React from 'react';
import { render } from '@testing-library/react';

import Calculator from 'components/JsonSchema/elements/Calculator.jsx';

it('should not execute calculation when `calculate` is not provided', async () => {
  const mockOnChange = jest.fn();
  const mockEvaluate = jest.fn();
  const mockWaiter = { addAction: jest.fn() };

  jest.mock('helpers/evaluate/asyncEvaluate', () => mockEvaluate);
  jest.mock('helpers/waitForAction', () => mockWaiter);

  render(
    <Calculator
      value={{}}
      path={[]}
      onChange={mockOnChange}
      rootDocument={{ data: {} }}
      calculate={null}
      documents={{}}
    />
  );

  expect(mockEvaluate).not.toHaveBeenCalled();
  expect(mockOnChange).not.toHaveBeenCalled();
});

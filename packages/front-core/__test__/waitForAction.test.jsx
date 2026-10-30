import waiter from 'helpers/waitForAction.js';

jest.useFakeTimers();

it('should schedule an action correctly with the specified time', async () => {
  const action = jest.fn();
  const key = 'testAction';
  const time = 100;

  waiter.addAction(key, action, time);

  expect(waiter.hasAction(key)).toBe(true);
  jest.advanceTimersByTime(time);
  expect(action).toHaveBeenCalled();
});

it('should replace an existing action with the same key', async () => {
  const action1 = jest.fn();
  const action2 = jest.fn();
  const key = 'testAction';
  const time1 = 100;
  const time2 = 200;

  waiter.addAction(key, action1, time1);
  waiter.addAction(key, action2, time2);

  expect(waiter.hasAction(key)).toBe(true);
  jest.advanceTimersByTime(time1);
  expect(action1).not.toHaveBeenCalled();
  jest.advanceTimersByTime(time2 - time1);
  expect(action2).toHaveBeenCalled();
});

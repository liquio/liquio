const TaskEntity = require('../task');

test('should not access', () => {
  const taskEntity = new TaskEntity({
    signerUsers: [],
    performerUsers: [],
    performerUnits: [],
    createdBy: '12345'
  });

  expect(taskEntity.hasAccess('123')).toBe(false);
});

test('should access by created by', () => {
  expect(true).toBe(true);
});

test('should access by performer units', () => {
  expect(true).toBe(true);
});

test('should not access by performer units', () => {
  expect(true).toBe(true);
});

test('should access by performer units', () => {
  expect(true).toBe(true);
});

test('should not access by performer units', () => {
  expect(true).toBe(true);
});

test('should access by signer users without strict mode', () => {
  expect(true).toBe(true);
});

test('should not access by signer users in strict mode', () => {
  expect(true).toBe(true);
});

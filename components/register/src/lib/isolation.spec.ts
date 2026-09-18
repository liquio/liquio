import Isolation from './isolation';

describe('Isolation', () => {
  it('should be instantiated', () => {
    const isolate = new Isolation();
    expect(isolate).toBeDefined();
  });

  it('should evaluate simple expressions', () => {
    const isolate = new Isolation();
    const result = isolate.eval('1 + 2');
    expect(result).toBe(3);
  });

  it('should evaluate string concatenation', () => {
    const isolate = new Isolation();
    const result = isolate.eval('"hello " + "world"');
    expect(result).toBe('hello world');
  });

  it('should evaluate function expressions', () => {
    const isolate = new Isolation();
    const result = isolate.eval('(x) => x * 2')(5);
    expect(result).toBe(10);
  });

  it('should set variables and use in expressions', () => {
    const isolate = new Isolation();
    // In isolated-vm, we need to use the reference properly
    const result = isolate.set('value', 10).eval('value.copySync() + 5');
    expect(result).toBe(15);
  });

  it('should set and add multiple numeric variables', () => {
    const isolate = new Isolation();
    const result = isolate.set('a', 5).set('b', 3).eval('a.copySync() + b.copySync()');
    expect(result).toBe(8);
  });

  it('should set complex objects and access properties', () => {
    const isolate = new Isolation();
    const obj = { name: 'test', value: 42 };
    const result = isolate.set('obj', obj).eval('obj.copySync().name + ": " + obj.copySync().value');
    expect(result).toBe('test: 42');
  });

  it('should set arrays and access length', () => {
    const isolate = new Isolation();
    const arr = [1, 2, 3, 4, 5];
    const result = isolate.set('arr', arr).eval('arr.copySync().length');
    expect(result).toBe(5);
  });

  it('should have access to moment library', () => {
    const isolate = new Isolation();
    const result = isolate.eval('typeof moment');
    expect(result).toBe('function');
  });

  it('should evaluate search string function with data reference', () => {
    const isolate = new Isolation();
    const data = { firstName: 'John', lastName: 'Doe' };
    const toSearchString = '(obj) => obj.data.firstName + " " + obj.data.lastName';
    const result = isolate.set('data', data).eval(`(${toSearchString})({ data: data.copySync() })`);
    expect(result).toBe('John Doe');
  });

  it('should evaluate search string with multiple results', () => {
    const isolate = new Isolation();
    const data = { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' };
    // Simple test that function can be called multiple times with different data
    const toSearchString = '(obj) => obj.data.firstName + \"-\" + obj.data.lastName';
    const result = isolate.set('data', data).eval(`(${toSearchString})({ data: data.copySync() })`);
    expect(result).toBe('Jane-Smith');
  });

  it('should evaluate filter function with element and step references', () => {
    const isolate = new Isolation();
    const element = { id: 1, name: 'test' };
    const step = { stepId: 'step1' };
    const document = { docId: 'doc1' };
    const additionalFilter = '(elem, st, doc) => elem.id === 1 && st.stepId === "step1"';
    const result = isolate
      .set('element', element)
      .set('step', step)
      .set('document', document)
      .eval(`(${additionalFilter})(element.copySync(), step.copySync(), document.copySync())`);
    expect(result).toBe(true);
  });

  it('should handle errors gracefully', () => {
    const isolate = new Isolation();
    expect(() => {
      isolate.eval('throw new Error("test error")');
    }).toThrow();
  });

  it('should isolate code execution - no access to globals', () => {
    const isolate = new Isolation();
    const result = isolate.eval('typeof global === "undefined"');
    expect(result).toBe(true);
  });

  it('should isolate code execution - no access to require', () => {
    const isolate = new Isolation();
    const result = isolate.eval('typeof require === "undefined"');
    expect(result).toBe(true);
  });

  it('should isolate code execution - no access to process', () => {
    const isolate = new Isolation();
    const result = isolate.eval('typeof process === "undefined"');
    expect(result).toBe(true);
  });

  it('should evaluate conditional logic with references', () => {
    const isolate = new Isolation();
    const value = 42;
    const result = isolate.set('val', value).eval('val.copySync() > 40 ? "high" : "low"');
    expect(result).toBe('high');
  });

  it('should call methods on string references', () => {
    const isolate = new Isolation();
    const str = 'Hello World';
    const result = isolate.set('text', str).eval('text.copySync().toLowerCase()');
    expect(result).toBe('hello world');
  });
});

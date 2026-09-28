import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));

test('production Calculator worker evaluates formulas without Node globals', async () => {
  const result = await build({
    root,
    configFile: path.join(root, 'vite.config.mjs'),
    logLevel: 'silent',
    plugins: [{
      name: 'calculator-worker-test-entry',
      resolveId(id) {
        if (id === 'calculator-worker-test') return '\0calculator-worker-test';
      },
      load(id) {
        if (id === '\0calculator-worker-test') {
          const worker = path.resolve(root, '../../packages/front-core/helpers/evaluate/worker.ts');
          return `import Worker from ${JSON.stringify(`${worker}?worker`)}; globalThis.CalculatorWorker = Worker;`;
        }
      }
    }],
    build: {
      write: false,
      rollupOptions: { input: 'calculator-worker-test' }
    }
  });
  const worker = result.output.find((item) => item.type === 'asset' && /worker-.*\.js$/.test(item.fileName));
  assert.ok(worker, 'production worker asset must be emitted');

  let onMessage;
  let response;
  const context = vm.createContext({
    setTimeout,
    clearTimeout,
    console,
    self: {
      addEventListener(type, listener) {
        assert.equal(type, 'message');
        onMessage = listener;
      },
      postMessage(message) { response = JSON.parse(JSON.stringify(message)); }
    }
  });
  vm.runInContext(String(worker.source), context);
  await onMessage({ data: {
    commandId: 'quiz',
    func: `(documentData) => documentData?.quizInfo?.questionsList.map(item => {
      const selected = item.questions.map(question => question.answerId);
      const answers = item.answers.map(answer => ({ ...answer, isSelected: selected.includes(answer.answerId) }));
      return { answers, isPassed: answers.every(answer => answer.isCorrect === answer.isSelected) };
    })`,
    params: [{ quizInfo: { questionsList: [{
      questions: [{ answerId: 1 }],
      answers: [{ answerId: 1, isCorrect: true }, { answerId: 2, isCorrect: false }]
    }] } }]
  } });
  assert.deepEqual(response, {
    commandId: 'quiz',
    result: [{ answers: [
      { answerId: 1, isCorrect: true, isSelected: true },
      { answerId: 2, isCorrect: false, isSelected: false }
    ], isPassed: true }]
  });
});

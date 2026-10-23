import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditScreen from 'modules/tasks/pages/Task/screens/EditScreen';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('store', () => ({
  default: { getState: vi.fn(), dispatch: vi.fn(), subscribe: vi.fn() },
  history: { push: vi.fn(), replace, listen: vi.fn() }
}));
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({ application: {} }), loadConfig: vi.fn() }));
vi.mock('core/helpers/configLoader', () => ({ getConfig: () => ({ application: {} }), loadConfig: vi.fn() }));
vi.mock('helpers/indexedDB', () => ({ default: {} }));
// jsdom has no Worker, so validate in the same thread with the synchronous validator.
vi.mock('components/JsonSchema', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown> & { validateData: (...args: unknown[]) => unknown }>();
  return { ...original, validateDataAsync: async (...args: unknown[]) => original.validateData(...args) };
});
vi.mock('react-redux', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  connect: () => (component: unknown) => component
}));
vi.mock('react-translate', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  translate: () => (component: unknown) => component
}));

interface Screen {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  setState: (update: Record<string, unknown>, callback?: () => void) => void;
  scrollToInvalidField: () => void;
  incrementStep: () => Promise<void>;
  validateStep: (step?: string) => Promise<boolean>;
  componentDidUpdate: (prevProps: Record<string, unknown>) => void;
}

const TASK_ID = 'task-1';
const TEMPLATE_ID = 10;
const ROOT_PATH = `/tasks/${TASK_ID}`;

// s2 is shown only once `calculated.showS2` is set; s1 needs its radio answered.
const template = {
  id: TEMPLATE_ID,
  jsonSchema: {
    properties: {
      calculated: { type: 'object', checkStepHidden: '() => true', properties: {} },
      s1: {
        type: 'object',
        required: ['radio'],
        properties: { radio: { type: 'string' } }
      },
      s2: {
        type: 'object',
        checkStepHidden: '(data) => data?.calculated?.showS2 !== true',
        properties: {}
      },
      s3: { type: 'object', properties: {} }
    }
  }
};

const ghostTemplate = {
  id: TEMPLATE_ID,
  jsonSchema: {
    stepOrders: "() => ['s1', 'ghost', 's2']",
    properties: {
      s1: { type: 'object', properties: {} },
      s2: { type: 'object', properties: {} }
    }
  }
};

const makeTask = (data: Record<string, unknown>) => ({
  id: TASK_ID,
  taskTemplateId: TEMPLATE_ID,
  finished: false,
  document: { id: 'doc-1', data }
});

const makeProps = ({
  data = {},
  stepId,
  activeStep,
  jsonTemplate = template
}: {
  data?: Record<string, unknown>;
  stepId: string;
  activeStep: number;
  jsonTemplate?: typeof template | typeof ghostTemplate;
}) => ({
  t: (key: string) => key,
  taskId: TASK_ID,
  stepId,
  tasks: { [TASK_ID]: makeTask(data) },
  origins: { [TASK_ID]: makeTask(data) },
  templates: { [TEMPLATE_ID]: jsonTemplate },
  authInfo: {},
  userInfo: {},
  taskSteps: { [TASK_ID]: activeStep },
  actual: {},
  actions: { setTaskStep: vi.fn(), setTaskDocumentValues: vi.fn() },
  self: { settingDefaultStep: false, handleFinishEditing: vi.fn() },
  getRootPath: () => ROOT_PATH,
  saveLastStepVisited: vi.fn(),
  handleStore: vi.fn().mockResolvedValue(undefined),
  handleSilentTriggers: vi.fn().mockResolvedValue(undefined),
  setBusy: vi.fn()
});

// The instance is not mounted, so setState applies the update and runs the callback right away.
const createScreen = (props: ReturnType<typeof makeProps>): Screen => {
  const Screen = EditScreen as unknown as new (props: Record<string, unknown>) => Screen;
  const screen = new Screen(props);
  screen.props = props;
  screen.setState = (update, callback) => {
    screen.state = { ...screen.state, ...update };
    callback?.();
  };
  screen.scrollToInvalidField = vi.fn();
  return screen;
};

describe('EditScreen step navigation', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  describe('incrementStep', () => {
    it('moves to the next step of the list recomputed after the silent triggers', async () => {
      const props = makeProps({ data: { s1: { radio: 'yes' } }, stepId: 's1', activeStep: 0 });
      const screen = createScreen(props);
      // The silent trigger un-hides s2, so the step list becomes [s1, s2, s3].
      props.handleSilentTriggers.mockImplementation(async () => {
        screen.props = makeProps({
          data: { s1: { radio: 'yes' }, calculated: { showS2: true } },
          stepId: 's1',
          activeStep: 0
        });
      });

      await screen.incrementStep();

      expect(props.handleSilentTriggers).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith(`${ROOT_PATH}/s2`);
      expect(screen.props.saveLastStepVisited).toHaveBeenCalledWith({ stepId: 's2' });
    });

    it('moves to the next step when the step list does not change', async () => {
      const props = makeProps({ data: { s1: { radio: 'yes' } }, stepId: 's1', activeStep: 0 });
      const screen = createScreen(props);

      await screen.incrementStep();

      expect(replace).toHaveBeenCalledWith(`${ROOT_PATH}/s3`);
      expect(props.saveLastStepVisited).toHaveBeenCalledWith({ stepId: 's3' });
    });

    it('does not move when the current step is invalid', async () => {
      const props = makeProps({ data: {}, stepId: 's1', activeStep: 0 });
      const screen = createScreen(props);

      await screen.incrementStep();

      expect(replace).not.toHaveBeenCalled();
      expect(props.saveLastStepVisited).not.toHaveBeenCalled();
    });

    it('does not move when the next index is past the recomputed list', async () => {
      const props = makeProps({ data: { s1: { radio: 'yes' } }, stepId: 's3', activeStep: 1 });
      const screen = createScreen(props);

      await screen.incrementStep();

      expect(replace).not.toHaveBeenCalled();
    });
  });

  describe('validateStep', () => {
    it('returns false for the active step when stepOrders names a step without a schema', async () => {
      const screen = createScreen(makeProps({ stepId: 'ghost', activeStep: 1, jsonTemplate: ghostTemplate }));

      expect(await screen.validateStep()).toBe(false);
    });

    it('returns false for a named step without a schema', async () => {
      const screen = createScreen(makeProps({ stepId: 's1', activeStep: 0, jsonTemplate: ghostTemplate }));

      expect(await screen.validateStep('ghost')).toBe(false);
    });

    it('returns true for an existing step with valid data', async () => {
      const screen = createScreen(makeProps({ data: { s1: { radio: 'yes' } }, stepId: 's1', activeStep: 0 }));

      expect(await screen.validateStep()).toBe(true);
    });

    it('returns false for an existing step with invalid data', async () => {
      const screen = createScreen(makeProps({ data: {}, stepId: 's1', activeStep: 0 }));

      expect(await screen.validateStep()).toBe(false);
      expect(screen.state.validationErrors).not.toEqual([]);
    });
  });

  describe('componentDidUpdate', () => {
    it('finishes editing once when the current step disappears from the step list', () => {
      const props = makeProps({ stepId: 's2', activeStep: 1, data: { calculated: { showS2: true } } });
      const screen = createScreen(props);
      // s2 is hidden again, so the list is [s1, s3] while the URL still points at s2.
      screen.props = { ...makeProps({ stepId: 's2', activeStep: 1 }), self: props.self };

      screen.componentDidUpdate(props);
      screen.componentDidUpdate(props);

      expect(props.self.handleFinishEditing).toHaveBeenCalledTimes(1);
    });

    it('does not finish editing while the current step is in the step list', () => {
      const props = makeProps({ stepId: 's1', activeStep: 0 });
      const screen = createScreen(props);

      screen.componentDidUpdate(props);

      expect(props.self.handleFinishEditing).not.toHaveBeenCalled();
    });
  });
});

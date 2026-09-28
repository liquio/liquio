import React, { useMemo } from 'react';
import objectPath from 'object-path';
import useRS from 'radioactive-state';
import { IconButton, CircularProgress } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import SaveIcon from '@mui/icons-material/Save';
import * as elements from './elements';

interface ValidationError {
  type?: string;
  severity?: number;
  [key: string]: unknown;
}

interface EditorState {
  rootValue: unknown;
  newValue: unknown;
  editPath: Array<string | number>;
  errors: ValidationError[];
  selection: unknown[];
}

interface ProviderData {
  elements: typeof elements;
  errors: ValidationError[];
  rootValue: unknown;
  newValue: unknown;
  editPath: Array<string | number>;
  selection: unknown[];
  onSchemaChange: (newValue: unknown) => void;
  handleSave: () => void;
  onSave: () => Promise<void>;
  onChange: (rootValue: unknown) => void;
  onValidate: (errors: ValidationError[]) => void;
  setEditPath: (editPath: Array<string | number>) => void;
  setSelection: (selection: unknown[]) => void;
  moveElementTo: (sourcePath: Array<string | number>, targetPath: Array<string | number>) => void;
  createElementAt: (
    component: { defaultData?: Record<string, unknown>; snippet?: string },
    targetPath: Array<string | number>,
    elementId: string,
  ) => void;
  deleteElementAt: (targetPath: Array<string | number>) => void;
  isElementExists: (elementId: string, targetPath: Array<string | number>) => boolean;
  onChangeProperty: (path: string, newValue: unknown) => void;
}

const { Provider, Consumer } = React.createContext<ProviderData | undefined>(undefined);

const styles = {
  root: {
    display: 'flex',
    height: '100%',
    color: '#e2e2e2',
    background: '#232323',
  },
  saveButton: {
    color: '#E2E2E2',
    position: 'absolute' as const,
    right: 50,
    top: 4,
  },
  disabled: {
    color: '#E2E2E2!important',
    opacity: 0.3,
  },
  progress: {
    color: '#E2E2E2',
  },
};

const initialState = (rootValue: unknown): EditorState => ({
  rootValue,
  newValue: rootValue,
  editPath: [],
  errors: [],
  selection: [],
});

const insertCode = ({
  schema,
  path,
  element,
}: {
  schema: Record<string, unknown>;
  path: string;
  element: { type?: string; data: string };
}) => {
  const isFunction = element.type === 'function';

  const getCode = () => {
    const parsedCode = JSON.parse(element.data).code;
    if (isFunction) {
      return parsedCode;
    }
    return JSON.parse(parsedCode);
  };

  const code = getCode();

  if (!code) return schema;

  objectPath.set(schema, path, code);

  return schema;
};

const insertTriggers = ({
  schema,
  element,
}: {
  schema: Record<string, unknown> & { calcTriggers?: unknown[] };
  element: { data: string };
}) => {
  const json = JSON.parse(JSON.parse(element.data).json || '{}');

  if (!json) return schema;

  if (Object.keys(json || {}).length === 0) {
    return schema;
  }

  const triggers = (schema.calcTriggers || []).concat(json);

  schema.calcTriggers = triggers;

  return schema;
};

const insertAddition = ({
  schema,
  element,
}: {
  schema: Record<string, unknown>;
  element: { data: string };
}) => {
  const innerJson = JSON.parse(JSON.parse(element.data).innerJson || '{}');

  if (!innerJson) return schema;

  if (Object.keys(innerJson || {}).length === 0) {
    return schema;
  }

  Object.keys(innerJson).forEach((key) => {
    const prevValue = objectPath.get(schema, key);
    const newValue = innerJson[key];

    if (prevValue) {
      if (Array.isArray(prevValue)) {
        objectPath.set(schema, key, prevValue.concat(newValue));
      } else if (typeof prevValue === 'object') {
        objectPath.set(schema, key, {
          ...prevValue,
          ...newValue,
        });
      }
    }
  });

  return schema;
};

interface JsonSchemaProviderProps extends WithStyles<typeof styles> {
  children: React.ReactNode;
  value?: unknown;
  onChange: (value: unknown) => Promise<void> | void;
  onValidate?: (errors: unknown[]) => void;
  busy?: boolean;
  setBusy?: (busy: boolean) => void;
  handleSave?: () => void;
}

const JsonSchemaProvider = ({
  classes,
  children,
  value = {},
  onChange,
  onValidate,
  busy,
  setBusy,
  handleSave,
}: JsonSchemaProviderProps) => {
  const state = useRS(initialState(value));

  const checkDisabled = () => {
    return (
      JSON.stringify(state.newValue) === JSON.stringify(state.rootValue) ||
      !!state.errors.length ||
      !!busy
    );
  };

  const disabled = useMemo(checkDisabled, [
    state.newValue,
    state.rootValue,
    state.errors,
    busy,
  ]);

  const getParsedSchema = (schema: unknown): Record<string, unknown> => {
    try {
      return JSON.parse(schema as string);
    } catch (e) {
      return {};
    }
  };

  const providerData: ProviderData = {
    elements,
    errors: state.errors,
    rootValue: state.rootValue,
    newValue: state.newValue,
    editPath: state.editPath,
    selection: state.selection,
    onSchemaChange: (newValue: unknown) => {
      state.newValue = newValue;
    },
    handleSave: () => {
      const hasError = state.errors.length;
      if (hasError || checkDisabled()) return;
      setBusy && setBusy(true);
      state.rootValue = JSON.parse(JSON.stringify(state.newValue));
      providerData.onSave();
      onValidate && onValidate([]);
    },
    onSave: async () => {
      await onChange(state.rootValue);
      handleSave && handleSave();
    },
    onChange: (rootValue: unknown) => {
      state.rootValue = rootValue;
      onChange(state.rootValue);
    },
    onValidate: (errors: ValidationError[]) => {
      // NOTE: monacoEditor MarkerSeverity codes -> Hint = 1, Info = 2, Warning = 4, Error = 8.
      state.errors = errors.filter((e) => e?.type !== 'warning' || e?.severity === 8);

      if (!disabled) {
        onValidate &&
          onValidate([
            {
              error: 'unSavedError',
              monacoEditorSeverityError: errors.some((e) => e?.severity === 8),
              saveCallback: providerData.handleSave,
            },
          ]);
      } else {
        onValidate && onValidate(errors);
      }
    },
    setEditPath: (editPath: Array<string | number>) => {
      state.editPath = editPath;
    },
    setSelection: (selection: unknown[]) => {
      state.selection = selection;
    },
    moveElementTo: (sourcePath: Array<string | number>, targetPath: Array<string | number>) => {
      const source = objectPath.get(
        getParsedSchema(state.rootValue),
        'properties.' + sourcePath.join('.properties.'),
      );

      const target = objectPath.get(
        getParsedSchema(state.rootValue),
        'properties.' + targetPath.join('.properties.'),
      );

      console.log('moveElementTo', source, target);
    },
    createElementAt: (
      { defaultData, snippet }: { defaultData?: Record<string, unknown>; snippet?: string },
      targetPath: Array<string | number>,
      elementId: string,
    ) => {
      const component = JSON.parse(
        JSON.stringify({
          ...defaultData,
          snippet,
        }),
      );

      const propertyPath = targetPath.length
        ? 'properties.' + targetPath.join('.properties.') + '.properties'
        : 'properties';

      const parsedValue = getParsedSchema(state.newValue);

      objectPath.ensureExists(parsedValue, propertyPath, {});

      const updatedCode = insertCode({
        schema: parsedValue,
        path: 'properties.' + targetPath.concat(elementId).join('.properties.'),
        element: component,
      });

      const updatedTriggers = insertTriggers({
        schema: updatedCode,
        element: component,
      });

      const updatedAddition = insertAddition({
        schema: updatedTriggers,
        element: component,
      });

      state.newValue = JSON.stringify(updatedAddition, null, 4);
    },
    deleteElementAt: (targetPath: Array<string | number>) => {
      const parsedValue = getParsedSchema(state.newValue);

      objectPath.del(
        parsedValue,
        'properties.' + targetPath.join('.properties.'),
      );

      state.newValue = JSON.stringify(parsedValue, null, 4);

      state.selection = [];
    },
    isElementExists: (elementId: string, targetPath: Array<string | number>) => {
      const parsedValue = getParsedSchema(state.rootValue);

      return !!objectPath.get(
        parsedValue,
        'properties.' + targetPath.concat(elementId).join('.properties.'),
      );
    },
    onChangeProperty: (path: string, newValue: unknown) => {
      const parsedValue = getParsedSchema(state.newValue);

      objectPath.set(parsedValue, path, newValue);
    },
  };

  return (
    <Provider value={providerData}>
      <div className={classes.root}>
        <IconButton
          disabled={disabled}
          onClick={providerData.handleSave}
          className={classes.saveButton}
          classes={{ disabled: classes.disabled }}
          size="large"
        >
          {busy ? (
            <CircularProgress size={24} className={classes.progress} />
          ) : (
            <SaveIcon {...({ size: 24 } as unknown as Record<string, unknown>)} />
          )}
        </IconButton>
        {children}
      </div>
    </Provider>
  );
};

const withEditor = (EditorComponent: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
  <Consumer>
    {(context) => <EditorComponent {...props} {...context} />}
  </Consumer>
);

const Editor = withStyles(styles)(JsonSchemaProvider);

export { Editor, Consumer, withEditor };

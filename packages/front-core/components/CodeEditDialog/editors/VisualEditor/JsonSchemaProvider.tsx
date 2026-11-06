import React from 'react';
import { DndProvider as DndProviderUntyped } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import objectPath from 'object-path';
import useRS from 'radioactive-state';
import { IconButton, CircularProgress } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import SaveIcon from '@mui/icons-material/Save';

interface ValidateError {
  type?: string;
  error?: string;
  saveCallback?: () => void;
  [key: string]: unknown;
}

interface ProviderData {
  errors: ValidateError[];
  rootValue: string;
  newValue: string;
  editPath: unknown[];
  selection: unknown[];
  onSchemaChange: (newValue: string) => void;
  handleSave: () => void;
  onSave: () => Promise<void>;
  onChange: (rootValue: string) => void;
  onValidate: (errors: ValidateError[]) => void;
  setEditPath: (editPath: unknown[]) => void;
  setSelection: (selection: unknown[]) => void;
  moveElementTo: (sourcePath: string[], targetPath: string[]) => void;
  createElementAt: (
    element: { defaultData: Record<string, unknown>; snippet: unknown },
    targetPath: string[],
    elementId: string
  ) => void;
  deleteElementAt: (targetPath: string[]) => void;
  isElementExists: (elementId: string, targetPath: string[]) => boolean;
  onChangeProperty: (path: string, newValue: unknown) => void;
}

const { Provider, Consumer } = React.createContext<ProviderData | undefined>(undefined);

// react-dnd's shipped DndProviderProps type omits `children`, which its own
// React.FC return type needs against this app's @types/react — loosened here
// rather than changing runtime behavior.
const DndProvider = DndProviderUntyped as unknown as React.ComponentType<{
  backend: unknown;
  children?: React.ReactNode;
}>;

const styles = {
  root: {
    display: 'flex',
    height: '100%',
    color: '#e2e2e2',
    background: '#232323'
  },
  saveButton: {
    color: '#E2E2E2',
    position: 'absolute' as const,
    right: 50,
    top: 4
  },
  disabled: {
    color: '#E2E2E2!important',
    opacity: 0.3
  },
  progress: {
    color: '#E2E2E2'
  }
};

const initialState = (rootValue: string) => ({
  rootValue,
  newValue: rootValue,
  editPath: [] as unknown[],
  errors: [] as ValidateError[],
  selection: [] as unknown[]
});

interface SchemaElement {
  type?: string;
  data: string;
}

const insertCode = ({ schema, path, element }: { schema: Record<string, unknown>; path: string; element: SchemaElement }) => {
  const isFunction = element.type === 'function';

  const getCode = () => {
    const parsedCode = (JSON.parse(element.data) as { code: unknown }).code;

    if (isFunction || typeof parsedCode === 'object') {
      return parsedCode;
    }

    return JSON.parse(parsedCode as string);
  };

  const code = getCode();

  if (!code) return schema;

  objectPath.set(schema, path, code);

  return schema;
};

const insertTriggers = ({ schema, element }: { schema: Record<string, unknown>; element: SchemaElement }) => {
  const json = JSON.parse((JSON.parse(element.data) as { json?: string }).json || '{}');

  if (!json) return schema;

  if (Object.keys(json || {}).length === 0) {
    return schema;
  }

  const triggers = ((schema.calcTriggers as unknown[]) || []).concat(json);

  schema.calcTriggers = triggers;

  return schema;
};

const insertAddition = ({ schema, element }: { schema: Record<string, unknown>; element: SchemaElement }) => {
  const innerJson = JSON.parse((JSON.parse(element.data) as { innerJson?: string }).innerJson || '{}') as Record<string, unknown>;

  if (!innerJson) return schema;

  if (Object.keys(innerJson || {}).length === 0) {
    return schema;
  }

  Object.keys(innerJson).forEach((key) => {
    const prevValue = objectPath.get(schema, key) as unknown;
    const newValue = innerJson[key];

    if (prevValue) {
      if (Array.isArray(prevValue)) {
        objectPath.set(schema, key, prevValue.concat(newValue));
      } else if (typeof prevValue === 'object') {
        objectPath.set(schema, key, {
          ...prevValue,
          ...(newValue as object)
        });
      }
    }
  });

  return schema;
};

interface JsonSchemaProviderProps {
  classes: Record<string, string>;
  children?: React.ReactNode;
  value?: string;
  onChange: (value: string) => Promise<void> | void;
  onValidate?: (errors: ValidateError[]) => void;
  busy?: boolean;
  setBusy?: (busy: boolean) => void;
  handleSave?: () => void;
  handleSaveOnChange?: boolean;
}

const JsonSchemaProvider = ({
  classes,
  children,
  value = {} as unknown as string,
  onChange,
  onValidate,
  busy,
  setBusy,
  handleSave,
  handleSaveOnChange
}: JsonSchemaProviderProps) => {
  const state = useRS(initialState(value));

  const disabled =
    JSON.stringify(state.newValue) === JSON.stringify(state.rootValue) ||
    !!state.errors.length ||
    !!busy;

  const getParsedSchema = (schema: string): Record<string, unknown> => {
    try {
      return JSON.parse(schema);
    } catch (e) {
      return {};
    }
  };

  const providerData: ProviderData = {
    errors: state.errors,
    rootValue: state.rootValue,
    newValue: state.newValue,
    editPath: state.editPath,
    selection: state.selection,
    onSchemaChange: (newValue: string) => {
      state.newValue = newValue;
    },
    handleSave: () => {
      const hasError = state.errors.length;
      if (hasError || disabled) return;
      setBusy && setBusy(true);
      state.rootValue = JSON.parse(JSON.stringify(state.newValue));
      providerData.onSave();
      onValidate && onValidate([]);
    },
    onSave: async () => {
      await onChange(state.rootValue);
      handleSave && handleSave();
    },
    onChange: (rootValue: string) => {
      state.rootValue = rootValue;
      onChange(state.rootValue);
    },
    onValidate: (errors: ValidateError[]) => {
      state.errors = errors.filter((e) => e.type !== 'warning');

      if (!disabled) {
        onValidate &&
          onValidate([
            {
              error: 'unSavedError',
              saveCallback: providerData.handleSave
            }
          ]);
      } else {
        onValidate && onValidate(errors);
      }
    },
    setEditPath: (editPath: unknown[]) => {
      state.editPath = editPath;
    },
    setSelection: (selection: unknown[]) => {
      state.selection = selection;
    },
    moveElementTo: (sourcePath: string[], targetPath: string[]) => {
      const source = objectPath.get(
        getParsedSchema(state.rootValue),
        'properties.' + sourcePath.join('.properties.')
      );

      const target = objectPath.get(
        getParsedSchema(state.rootValue),
        'properties.' + targetPath.join('.properties.')
      );

      console.log('moveElementTo', source, target);
    },
    createElementAt: ({ defaultData, snippet }, targetPath: string[], elementId: string) => {
      const component = JSON.parse(
        JSON.stringify({
          ...defaultData,
          snippet
        })
      ) as SchemaElement;

      const propertyPath = targetPath.length
        ? 'properties.' + targetPath.join('.properties.') + '.properties'
        : 'properties';

      const parsedValue = getParsedSchema(state.newValue);

      objectPath.ensureExists(parsedValue, propertyPath, {});

      const updatedCode = insertCode({
        schema: parsedValue,
        path: 'properties.' + targetPath.concat(elementId).join('.properties.'),
        element: component
      });

      const updatedTriggers = insertTriggers({
        schema: updatedCode,
        element: component
      });

      const updatedAddition = insertAddition({
        schema: updatedTriggers,
        element: component
      });

      state.newValue = JSON.stringify(updatedAddition, null, 4);

      setTimeout(() => {
        onChange(state.newValue);
      }, 100);
    },
    deleteElementAt: (targetPath: string[]) => {
      const parsedValue = getParsedSchema(state.newValue);

      objectPath.del(parsedValue, 'properties.' + targetPath.join('.properties.'));

      state.newValue = JSON.stringify(parsedValue, null, 4);

      state.selection = [];

      setTimeout(() => {
        onChange(state.newValue);
      }, 100);
    },
    isElementExists: (elementId: string, targetPath: string[]) => {
      const parsedValue = getParsedSchema(state.rootValue);

      return !!objectPath.get(
        parsedValue,
        'properties.' + targetPath.concat(elementId).join('.properties.')
      );
    },
    onChangeProperty: (path: string, newValue: unknown) => {
      const parsedValue = getParsedSchema(state.newValue);

      objectPath.set(parsedValue, path, newValue);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Provider value={providerData}>
        <div className={classes.root}>
          {!handleSaveOnChange ? (
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
          ) : null}
          {children}
        </div>
      </Provider>
    </DndProvider>
  );
};

const withEditor = (EditorComponent: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => {
  return <Consumer>{(context) => <EditorComponent {...props} {...(context as unknown as Record<string, unknown>)} />}</Consumer>;
};

const Editor = withStyles(styles)(JsonSchemaProvider as never) as unknown as React.ComponentType<Record<string, unknown>>;

export { Editor, Consumer, withEditor };

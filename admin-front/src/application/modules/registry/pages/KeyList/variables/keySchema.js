export default ({ t, type, newKey }) => {
  if (type === 'toExport') {
    return {
      type: 'object',
      properties: {
        toExport: {
          control: 'code.editor',
          description: t('ExportExcelFunction'),
          mode: 'javascript',
          validate: true,
          autoOpen: true,
          defaultSchema: '() => "";',
        },
      },
      required: [],
    };
  }

  if (type === 'stringify') {
    return {
      type: 'object',
      properties: {
        toString: {
          control: 'code.editor',
          description: t('ToString'),
          mode: 'javascript',
          validate: true,
          autoOpen: true,
          defaultSchema: '() => "";',
        },
      },
      required: [],
    };
  }

  if (type === 'indexSearch') {
    return {
      type: 'object',
      properties: {
        toSearchString: {
          control: 'code.editor',
          description: t('ToSearchString'),
          mode: 'javascript',
          validate: true,
          autoOpen: true,
          defaultSchema: '() => "";',
        },
      },
      required: [],
    };
  }

  if (type === 'json') {
    return {
      type: 'object',
      properties: {
        schema: {
          control: 'code.editor',
          description: t('JsonSchema'),
          mode: 'visual',
          validate: true,
          asJsonObject: true,
          autoOpen: true,
          defaultSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: t('FieldDescriptionText'),
                public: true,
              },
            },
            required: [],
          },
        },
      },
      required: [],
    };
  }

  if (type === 'settings') {
    return {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: t('Name'),
          useTrim: true,
          maxLength: 255,
          darkTheme: true,
          variant: 'outlined',
          checkValid: [
            {
              isValid:
                '(propertyData) => !!(propertyData && propertyData.length)',
              errorText: "Обов'язкове поле",
            },
          ],
        },
        parentId: {
          control: 'key.select',
          darkTheme: true,
          variant: 'outlined',
          description: t('ParentId'),
        },
        lock: {
          control: 'toggle',
          onText: t('IsLocked'),
          noMargin: true,
        },
        meta: {
          type: 'object',
          properties: {
            isTest: {
              control: 'toggle',
              onText: t('IsTest'),
              noMargin: true,
            },
            isPersonal: {
              control: 'toggle',
              onText: t('isPersonal'),
              noMargin: true,
            },
          },
        },
      },
      required: ['name'],
    };
  }

  return {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: t('Name'),
        useTrim: true,
        maxLength: 255,
        darkTheme: true,
        variant: 'outlined',
        checkValid: [
          {
            isValid:
              '(propertyData) => !!(propertyData && propertyData.length)',
            errorText: "Обов'язкове поле",
          },
        ],
      },
      parentId: {
        control: 'key.select',
        darkTheme: true,
        variant: 'outlined',
        description: t('ParentId'),
      },
      meta: {
        type: 'object',
        properties: {
          isTest: {
            control: 'toggle',
            onText: t('IsTest'),
            noMargin: true,
          },
          isPersonal: {
            control: 'toggle',
            onText: t('isPersonal'),
            noMargin: true,
            setDefaultValue: `() => ${newKey ? 'true' : 'false'}`,
          },
        },
      },
      lock: {
        control: 'toggle',
        onText: t('IsLocked'),
      },
      schema: {
        control: 'code.editor',
        description: t('JsonSchema'),
        notRequiredLabel: '',
        mode: 'visual',
        validate: true,
        asJsonObject: true,
        defaultSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      toString: {
        control: 'code.editor',
        description: t('ToString'),
        mode: 'javascript',
        validate: true,
        defaultSchema: '() => "";',
      },
      toSearchString: {
        control: 'code.editor',
        description: t('ToSearchString'),
        mode: 'javascript',
        validate: true,
        defaultSchema: '() => "";',
      },
    },
    required: ['name', 'schema', 'toString', 'toSearchString'],
  };
};

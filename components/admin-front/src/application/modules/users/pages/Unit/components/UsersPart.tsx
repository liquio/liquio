import React from 'react';
import { translate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';
import type { JsonSchemaNode } from 'components/JsonSchema/types';

const usersSchema = (t: (key: string) => string): JsonSchemaNode => ({
  type: 'object',
  description: t('Users'),
  properties: {
    members: {
      control: 'user.list',
      darkTheme: true,
      autocompleteFilters: true,
      toolbarAction: true,
      addButtonText: t('AddUsers'),
      emptyListText: t('NoUsers'),
      filterText: t('FilterUsers'),
      controls: {
        pagination: true,
        toolbar: true,
        search: true,
      },
    },
  },
  required: ['members'],
});

const headsSchema = (t: (key: string) => string): JsonSchemaNode => ({
  type: 'object',
  description: t('Heads'),
  properties: {
    heads: {
      control: 'user.list',
      darkTheme: true,
      autocompleteFilters: true,
      toolbarAction: true,
      addButtonText: t('AddHeads'),
      emptyListText: t('NoUsers'),
      filterText: t('FilterHeads'),
      dialogTitle: t('AddHeadsDialogTitle'),
      controls: {
        pagination: true,
        toolbar: true,
        search: true,
      },
    },
  },
  required: ['heads'],
});

const IPNUsers = (t: (key: string) => string, errors: string[]): JsonSchemaNode => ({
  type: 'object',
  description: t('IPNUsers'),
  properties: {
    errorMembers: {
      control: 'text.block',
      checkHidden: `()=> ${!errors.some((el) => el === 'member')}`,
      htmlBlock: `<div style='margin-top: 20px; color: red; padding: 10px 10px 10px 0px'>${t('InvalidUserCodeFormat')}</div><div style='color: red;'>${t('AvailableFormats')}</div>`,
    },
    membersIpn: {
      type: 'array',
      description: t('Users'),
      allowEmpty: true,
      items: {
        type: 'string',
        darkTheme: true,
        variant: 'outlined',
      },
    },
    errorHead: {
      control: 'text.block',
      checkHidden: `()=> ${!errors.some((el) => el === 'head')}`,
      htmlBlock: `<div style='margin-top: 20px; color: red; padding: 10px 10px 10px 0px'>${t('InvalidUserCodeFormat')}</div><div style='color: red;'>${t('AvailableFormats')}</div>`,
    },
    headsIpn: {
      type: 'array',
      description: t('Heads'),
      allowEmpty: true,
      items: {
        type: 'string',
        darkTheme: true,
        variant: 'outlined',
      },
    },
  },
  required: ['membersIpn', 'headsIpn'],
});

interface UsersPartProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes?: Record<string, string>;
  value: unknown;
  onChange: (...args: unknown[]) => void;
  deleteAction: (...args: unknown[]) => void;
  addAction: (...args: unknown[]) => void;
  active: number;
  readOnly?: boolean;
  errors?: string[];
}

const UsersPart = ({
  t,
  classes,
  value,
  onChange,
  deleteAction,
  addAction,
  active,
  readOnly,
  errors = [],
}: UsersPartProps) => {
  const activeSchema = (
    [usersSchema, headsSchema, IPNUsers][active] as (t: (key: string) => string, errors: string[]) => JsonSchemaNode
  )(t, errors);

  return (
    <SchemaForm
      schema={activeSchema}
      value={value}
      onChange={onChange}
      deleteAction={deleteAction}
      addAction={addAction}
      readOnly={readOnly}
      className={(classes || {}).fullWidth}
    />
  );
};

const translated = translate('UnitPage')(UsersPart as never);
export default translated as unknown as React.ComponentType<Record<string, unknown>>;

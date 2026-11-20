import { useCallback, useEffect, useMemo } from 'react';
import { history } from 'store';
import qs from 'qs';
import sanitizeHtml from 'sanitize-html';
import evaluate from 'helpers/evaluate';
import { JsonSchemaNode } from '../../types';

interface UseTabsProps {
  path: Array<string | number>;
  value?: Record<string, unknown> & { active?: string };
  errors: Array<{ path: string }>;
  onChange: ((...args: unknown[]) => void) | null;
  properties: Record<string, JsonSchemaNode>;
  emptyHidden?: boolean;
  rootDocument: { data: Record<string, unknown> };
  hidden?: boolean;
}

export const useTabs = ({
  path,
  value,
  errors,
  onChange,
  properties,
  emptyHidden,
  rootDocument,
  hidden,
}: UseTabsProps) => {
  const tabs = useMemo(
    () =>
      Object.keys(properties).filter((tabName) => {
        const { hidden } = properties[tabName];

        if (!hidden) {
          return true;
        }

        if (typeof hidden === 'string') {
          const result = evaluate(
            hidden,
            rootDocument.data,
            (value || {})[tabName],
            value || {},
          );

          if (result instanceof Error) {
            (result as Error & { commit: (info: Record<string, unknown>) => void }).commit({ type: 'schema form isHidden', rootDocument });
            return false;
          }

          return result !== true;
        }

        return !hidden;
      }),
    [properties, rootDocument, value],
  );

  const errored = useMemo(() => {
    const output = tabs.map((tabName, index) => {
      const tabPath = path.concat(tabName).join('.');
      return errors.some((error) => error.path.indexOf(tabPath) === 0)
        ? index
        : false;
    });

    if (output.includes(0)) {
      return output;
    }

    return output.filter(Boolean);
  }, [errors, path, tabs]);

  // The original called `useMemo(fn)` with no deps array at all, which recomputes
  // on every render (React's typings require a DependencyList, so this is
  // rewritten as a plain computation with the same every-render behavior).
  const queryTabActive = (() => {
    const search = history?.location?.search;
    const queryParams = qs.parse(search, { ignoreQueryPrefix: true }) as { tab?: string };
    const tabParams = sanitizeHtml(queryParams?.tab || '') || '';
    const tabParamsIndex = tabs?.findIndex(
      (tab) => tab?.toLowerCase() === tabParams?.toLowerCase(),
    );
    return tabParamsIndex && tabParamsIndex !== -1 ? tabParamsIndex : null;
  })();

  const activeTab = useMemo(
    () => tabs.indexOf((value && value.active) || tabs[0]),
    [tabs, value],
  );

  const handleChange = useCallback(
    (event: unknown, activeTab: number) =>
      onChange &&
      onChange({
        ...(emptyHidden ? {} : value || {}),
        active: tabs[activeTab],
      }),
    [emptyHidden, onChange, tabs, value],
  );

  useEffect(() => {
    if (!emptyHidden) {
      return;
    }

    const hiddenValues = tabs
      .filter((tabName, index) =>
        index === activeTab ? false : !!value?.[tabName],
      )
      .filter(Boolean);

    if (hiddenValues.length) {
      onChange &&
        onChange({
          [tabs[activeTab]]: value?.[tabs[activeTab]],
          active: tabs[activeTab],
        });
    }
  }, [activeTab, emptyHidden, onChange, tabs, value]);

  useEffect(() => {
    if (properties && (!value || !value.active) && !hidden) {
      if (queryTabActive !== null) {
        onChange?.bind(null, 'active')(tabs[queryTabActive]);
        return;
      }
      if (!tabs[0]) return;
      onChange?.bind(null, 'active')(tabs[0]);
    }
  }, [properties, value, hidden, onChange, tabs, queryTabActive]);

  const activeSchema =
    properties[value?.active as string] || Object.values(properties)[activeTab] || {};

  return {
    tabs,
    errored,
    activeTab,
    handleChange,
    activeSchema,
    tabKey: tabs[activeTab],
  };
};

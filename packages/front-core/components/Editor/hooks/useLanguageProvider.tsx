import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useMonaco, Monaco } from '@monaco-editor/react';

import { getTextsList } from 'actions/multiLang';

type HoverProviderType = Parameters<Monaco['languages']['registerHoverProvider']>[1];
type HoverModel = Parameters<HoverProviderType['provideHover']>[0];
type HoverPosition = Parameters<HoverProviderType['provideHover']>[1];

interface TranslationEntry {
  key: string;
  localizationLanguageCode?: string;
  value?: string;
  [key: string]: unknown;
}

export const useLanguageProvider = (value = '') => {
  const translationsMapRef = useRef(new Map<string, TranslationEntry[]>());
  const dispatch = useDispatch() as unknown as (action: unknown) => Promise<{ data?: TranslationEntry[] } | TranslationEntry[]>;
  const monaco = useMonaco();

  useEffect(() => {
    if (!value) return;

    try {
      const langMatches = [...value.matchAll(/"LANG_([^"]*)"/g)];
      const keys = [...new Set(langMatches.map((m) => m[0].replace(/"/g, '')))];

      if (keys.length === 0) return;

      dispatch((getTextsList as unknown as (keys: string[]) => unknown)(keys)).then((res) => {
        const raw: TranslationEntry[] = Array.isArray((res as { data?: TranslationEntry[] })?.data)
          ? ((res as { data?: TranslationEntry[] }).data as TranslationEntry[])
          : Array.from((res as TranslationEntry[]) || []);
        const map = new Map<string, TranslationEntry[]>();

        raw.forEach((entry) => {
          const key = entry.key;
          if (!key) return;

          if (!map.has(key)) map.set(key, []);
          (map.get(key) as TranslationEntry[]).push(entry);
        });

        translationsMapRef.current = map;
      });
    } catch (err) {
      console.error('Error parsing LANG_ keys:', err);
    }
  }, [value, dispatch]);

  useEffect(() => {
    if (!monaco) return;

    const hoverProvider = monaco.languages.registerHoverProvider('json', {
      provideHover: function (model: HoverModel, position: HoverPosition) {
        const text = model.getValue();
        let foundRange = null;
        let hoverContents: { value: string }[] = [];
        const langMatch = /"LANG_[^"]*"/g;
        let langMatchResult;

        while ((langMatchResult = langMatch.exec(text)) !== null) {
          const startIndex = langMatchResult.index;
          const endIndex = startIndex + langMatchResult[0].length;
          const startPos = model.getPositionAt(startIndex);
          const endPos = model.getPositionAt(endIndex);

          if (
            position.lineNumber >= startPos.lineNumber &&
            position.lineNumber <= endPos.lineNumber &&
            position.column >= startPos.column &&
            position.column <= endPos.column
          ) {
            foundRange = new monaco.Range(
              startPos.lineNumber,
              startPos.column,
              endPos.lineNumber,
              endPos.column
            );
            const foundLangKey = langMatchResult[0].replace(/"/g, '');
            const translations = translationsMapRef.current.get(foundLangKey);
            hoverContents = [{ value: `**${foundLangKey}**` }];

            if (translations && translations.length > 0) {
              const oneLine = translations
                .map((t) => `${t.localizationLanguageCode}: ${t.value || '_'}`)
                .join(' | ');
              hoverContents.push({ value: oneLine });
            } else {
              hoverContents.push({ value: '_No translations found._' });
            }
            return { range: foundRange, contents: hoverContents };
          }
        }
        return null;
      }
    });

    return () => {
      hoverProvider.dispose();
    };
  }, [monaco]);
};

import { useEffect, useRef } from 'react';
import { useMonaco } from '@monaco-editor/react';
import { useDispatch } from 'react-redux';

import { useUserSettings } from 'components/UserSettings';
import * as api from 'services/api';

const MAX_PREFIX_LENGTH = 3000;
const MAX_SUFFIX_LENGTH = 1000;

const fetchSuggestions = (requestOptions, signal, dispatch) =>
  api
    .post('bpmn-ai-proxy/copilot', requestOptions, 'AI_MODEL_PROMPT', dispatch, null, { signal })
    .then((response) => response?.split('\n').filter((part) => part.trim()));

const preparePrompt = (
  model,
  position,
  maxPrefixLength = MAX_PREFIX_LENGTH,
  maxSuffixLength = MAX_SUFFIX_LENGTH
) => {
  const text = model.getValue();
  const offset = model.getOffsetAt(position);

  let prefix = text.slice(0, offset);
  let suffix = text.slice(offset);

  if (prefix.length > maxPrefixLength) {
    prefix = prefix.slice(-maxPrefixLength);
  }

  if (suffix.length > maxSuffixLength) {
    suffix = suffix.slice(0, maxSuffixLength);
  }

  return {
    prefix,
    suffix
  };
};

function debouncePromise(func, wait) {
  let timeout;
  return function (...args) {
    return new Promise((resolve, reject) => {
      const later = () => {
        timeout = null;
        try {
          resolve(func(...args));
        } catch (e) {
          reject(e);
        }
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    });
  };
}

// Debounced fetchSuggestions wrapper
const fetchSuggestionsDebounced = debouncePromise(fetchSuggestions, 1000);

export const useInlineCompletionProvider = (language = 'json') => {
  const dispatch = useDispatch();
  const monaco = useMonaco();
  const { settings } = useUserSettings('editor', {
    copilot: {
      enabled: true,
      model: 'liquio-copilot'
    }
  });

  const abortControllerRef = useRef(null);
  const lastCompletingPosition = useRef(null);
  const lastSuggestions = useRef([]);

  useEffect(() => {
    if (!monaco || !settings.copilot?.enabled) return;

    const inlineCompletionsProvider = monaco.languages.registerInlineCompletionsProvider(language, {
      provideInlineCompletions: async (model, position) => {
        if (
          lastSuggestions.current &&
          lastCompletingPosition.current &&
          lastCompletingPosition.current.lineNumber === position.lineNumber &&
          lastCompletingPosition.current.column === position.column
        ) {
          return lastSuggestions.current;
        }
        lastCompletingPosition.current = position;

        // Abort previous request if still pending
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create a new controller for the new request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const { prefix, suffix } = preparePrompt(
          model,
          position,
          settings.copilot?.maxPrefixLength || MAX_PREFIX_LENGTH,
          settings.copilot?.maxSuffixLength || MAX_SUFFIX_LENGTH
        );

        try {
          const suggestions = await fetchSuggestionsDebounced(
            {
              prefix,
              suffix,
              model: settings.copilot?.model,
              options: {
                temperature: settings.copilot?.temperature ?? 0.2,
                maxOutputTokens: settings.copilot?.maxOutputTokens || 25
              }
            },
            controller.signal, // Pass the signal here
            dispatch
          );

          lastSuggestions.current = suggestions.length
            ? {
                items: [
                  {
                    insertText: suggestions.join('\n'),
                    range: new monaco.Range(
                      position.lineNumber,
                      position.column,
                      position.lineNumber,
                      position.column
                    )
                  }
                ]
              }
            : { items: [] };
          return lastSuggestions.current;
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('Fetch was aborted');
          } else {
            console.error('Fetch error:', error);
          }
          return { items: [] };
        }
      },
      freeInlineCompletions: () => {}
    });

    return () => {
      inlineCompletionsProvider.dispose();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    monaco,
    settings.copilot?.enabled,
    settings.copilot?.model,
    settings.copilot?.temperature,
    settings.copilot?.maxOutputTokens,
    settings.copilot?.maxPrefixLength,
    settings.copilot?.maxSuffixLength,
    language
  ]);
};

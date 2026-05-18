import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import * as api from 'services/api';

const mapStateToProps = ({
  dictionary: {
    controls: { list, map }
  }
}) => ({ list, map });

export const useControlDictionary = () => {
  const dispatch = useDispatch();
  const { list, map } = useSelector(mapStateToProps);

  React.useEffect(() => {
    if (!list) {
      api
        .get('dictionary/controls/list', 'DICTIONARY/LOAD_CONTROLS', dispatch)
        .then((result) => {
          if (!Array.isArray(result)) {
            dispatch({ type: 'DICTIONARY/LOAD_CONTROLS_SUCCESS', payload: [] });
          }
        })
        .catch((error) => {
          console.error('Error fetching control dictionary:', error);
          dispatch({ type: 'DICTIONARY/LOAD_CONTROLS_SUCCESS', payload: [] });
          return [];
        });
    }
  }, [list, dispatch]);

  const getControlContents = (control, key) => {
    const controlKey = [control, key].join('.');
    if (map[controlKey]) {
      return Promise.resolve(map[controlKey]);
    }

    return api
      .get(
        `dictionary/controls?control=${control}&key=${key}`,
        'DICTIONARY/LOAD_CONTROL_CONTENTS',
        dispatch,
        { control, key }
      )
      .catch((error) => {
        console.error('Error fetching control contents:', error);
        return [];
      });
  };

  return {
    list: Array.isArray(list) ? list.filter(Boolean) : [],
    getControlContents
  };
};

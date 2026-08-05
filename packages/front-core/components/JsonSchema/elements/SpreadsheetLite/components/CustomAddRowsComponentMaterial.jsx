import React from 'react';
import { useTranslate } from 'react-translate';

const CustomAddRowsComponent = ({ addRows }) => {
  const [value, setValue] = React.useState(1);
  const [rawValue, setRawValue] = React.useState(value);
  const t = useTranslate('Elements');

  return (
    <div className="dsg-add-row">
      <button
        type="button"
        className="dsg-add-row-btn"
        onClick={() => addRows(value)}
      >
        {t('Add')}
      </button>{' '}
      <input
        className="dsg-add-row-input"
        value={rawValue}
        onBlur={() => setRawValue(value)}
        type="number"
        min={1}
        style={{ width: '70px' }}
        onInput={(e) => {
          e.target.value = Math.max(1, parseInt(e.target.value) || 0);
        }}
        onChange={(e) => {
          if (e.target.value > 1000) {
            setValue(1000);
            setRawValue('1000');
            return;
          }
          setRawValue(e.target.value);
          setValue(Math.max(1, Math.round(parseInt(e.target.value) || 0)));
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            addRows(value);
          }
        }}
      />{' '}
    </div>
  );
};

export default CustomAddRowsComponent;

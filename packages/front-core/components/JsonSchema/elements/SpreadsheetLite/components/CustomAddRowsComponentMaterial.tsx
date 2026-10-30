import React from 'react';
import { useTranslate } from 'react-translate';

interface CustomAddRowsComponentProps {
  addRows: (count: number) => void;
}

const CustomAddRowsComponent = ({ addRows }: CustomAddRowsComponentProps) => {
  const [value, setValue] = React.useState(1);
  const [rawValue, setRawValue] = React.useState<string | number>(value);
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
        onInput={(event) => {
          const input = event.currentTarget;
          input.value = String(Math.max(1, parseInt(input.value) || 0));
        }}
        onChange={(event) => {
          const inputValue = event.currentTarget.value;
          if (Number(inputValue) > 1000) {
            setValue(1000);
            setRawValue('1000');
            return;
          }
          setRawValue(inputValue);
          setValue(Math.max(1, Math.round(parseInt(inputValue) || 0)));
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

import React from 'react';
import { Chip, Button } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import CheckIcon from '@mui/icons-material/Check';
import classNames from 'classnames';
import { useTranslate } from 'react-translate';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Theme } from '@mui/material/styles';

type LegendTheme = Theme & {
  chipColor?: string;
  iconButtonFill?: string;
};

const styles = (theme: LegendTheme) => ({
  previewColor: {
    width: 10,
    height: 10,
  },
  chip: {
    background: theme.chipColor,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 3,
    marginTop: 3,
    '& span': {
      color: theme.iconButtonFill,
    },
  },
  chipActive: {
    background: 'rgba(255, 255, 255, 0.08)',
  },
  chipsWrapper: {
    paddingLeft: 12,
    paddingRight: 12,
  },
  chipHidden: {
    display: 'none',
  },
  colorLabel: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginLeft: 10,
  },
  icon: {
    marginLeft: 5,
  },
});

const useStyles = makeStyles(styles as never);

const CHIPS_LIMIT = 15;

interface ChartLine {
  name: string;
  id?: string;
  color: string;
}

interface LegendProps {
  selected?: string[];
  chartLines?: ChartLine[];
  onChipSelect?: (selected: string[]) => void;
  chartData?: Record<string, unknown>[];
}

const Legend = ({
  selected = [],
  chartLines = [],
  onChipSelect = () => {},
  chartData = [],
}: LegendProps) => {
  const t = useTranslate('WorkflowAdminPage');
  const classes = useStyles();
  const [showAll, setShowAll] = React.useState(false);

  const tagsList = chartLines.filter(({ name }) =>
    chartData.find((el) => el[name]),
  );

  const ExpandIcon = showAll ? ExpandLessIcon : ExpandMoreIcon;
  const ExpandText = showAll
    ? t('HideAll')
    : t('ShowAll', {
        count: tagsList.length - CHIPS_LIMIT,
      });

  const PreviewLabel = ({ color }: { color: string }) => (
    <span className={classes.colorLabel} style={{ background: color }} />
  );

  return (
    <div className={classes.chipsWrapper}>
      {tagsList.length !== selected.length ? (
        <Chip
          label={t('SelectAll')}
          variant="outlined"
          className={classNames({
            [classes.chip]: true,
          })}
          onClick={() => onChipSelect(chartLines.map(({ name }) => name))}
        />
      ) : null}

      {selected.length ? (
        <Chip
          label={t('UnSelectAll')}
          variant="outlined"
          className={classNames({
            [classes.chip]: true,
          })}
          onClick={() => onChipSelect([])}
        />
      ) : null}

      {tagsList.map(({ name, color }, index) => {
        const checked = selected.includes(name);

        return (
          <Chip
            label={name}
            key={name}
            icon={
              checked ? (
                <>
                  <CheckIcon className={classes.icon} />
                  <PreviewLabel color={color} />
                </>
              ) : (
                <PreviewLabel color={color} />
              )
            }
            variant="outlined"
            className={classNames({
              [classes.chip]: true,
              [classes.chipActive]: checked,
              [classes.chipHidden]: CHIPS_LIMIT <= index && !showAll,
            })}
            onClick={() => {
              const newValue = checked
                ? selected.filter((el) => el !== name)
                : selected.concat([name]);

              onChipSelect(newValue);
            }}
          />
        );
      })}

      {CHIPS_LIMIT <= tagsList.length ? (
        <Button
          onClick={() => setShowAll(!showAll)}
          variant="outlined"
          size={'small'}
        >
          <ExpandIcon />
          {ExpandText}
        </Button>
      ) : null}
    </div>
  );
};

export default Legend;

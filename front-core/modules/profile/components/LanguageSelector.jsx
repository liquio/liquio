import appConfig from 'config';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from '@mui/styles';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { setCurrentLanguage } from 'actions/auth';
import {
  getCurrentLanguageCode,
  getTranslationCandidates,
  normalizeCode,
} from 'helpers/localization';

const useStyles = makeStyles((theme) => {
  const getPalette = (darkTheme) => {
    const defaults = darkTheme
      ? {
          background: theme?.buttonHoverBg || theme?.palette?.grey?.[800],
          menuBackground: theme?.buttonHoverBg || theme?.palette?.grey?.[800],
          color: theme?.header?.textColor || theme?.palette?.primary?.contrastText,
          hoverBg: theme?.palette?.action?.hover,
          selectedBg:
            theme?.buttonBg ||
            theme?.palette?.primary?.main ||
            theme?.palette?.primary?.main,
          selectedColor: theme?.textColorDark || theme?.palette?.text?.primary,
          selectedBgHover:
            theme?.palette?.primary?.dark ||
            theme?.palette?.primary?.main ||
            theme?.palette?.primary?.main
        }
      : {
          background: theme?.palette?.background?.default,
          menuBackground: theme?.palette?.background?.paper,
          color: theme?.textColorDark || theme?.palette?.text?.primary,
          hoverBg: theme?.palette?.action?.hover,
          selectedBg: theme?.palette?.primary?.main,
          selectedColor: theme?.palette?.primary?.contrastText,
          selectedBgHover: theme?.palette?.primary?.dark
        };

    const baseOverrides = theme?.languageSelector || {};
    const overrides = darkTheme
      ? { ...baseOverrides, ...(theme?.languageSelector?.dark || {}) }
      : baseOverrides;

    return {
      background:
        overrides.background !== undefined ? overrides.background : defaults.background,
      menuBackground:
        overrides.menuBackground !== undefined ? overrides.menuBackground : defaults.menuBackground,
      color: overrides.color !== undefined ? overrides.color : defaults.color,
      hoverBg: overrides.hoverBg !== undefined ? overrides.hoverBg : defaults.hoverBg,
      selectedBg:
        overrides.selectedBg !== undefined ? overrides.selectedBg : defaults.selectedBg,
      selectedColor:
        overrides.selectedColor !== undefined
          ? overrides.selectedColor
          : defaults.selectedColor,
      selectedBgHover:
        overrides.selectedBgHover !== undefined ? overrides.selectedBgHover : defaults.selectedBgHover
    };
  };

  return {
    root: {
      display: 'flex',
      alignItems: 'center'
    },
    group: ({ darkTheme }) => {
      const palette = getPalette(darkTheme);

      return {
        background: palette.background,
        borderRadius: 20,
        padding: 2,
        height: 32,
        ...(darkTheme && {
          border: `1px solid ${theme?.borderColor || 'transparent'}`
        }),
        '& .MuiToggleButtonGroup-grouped': {
          margin: 0,
          border: 0,
          borderRadius: 18,
          textTransform: 'none',
          padding: '4px 10px',
          minWidth: 40,
          fontWeight: 600,
          fontSize: 12,
          color: palette.color,
          '&.Mui-selected': {
            background: palette.selectedBg,
            color: palette.selectedColor,
            '&:hover': {
              background: palette.selectedBgHover
            }
          },
          '&:hover': {
            background: palette.hoverBg
          },
          '&:focus-visible': {
            outline: `${theme.outlineColor || theme?.palette?.primary?.main} solid 3px`,
            outlineOffset: 1
          }
        }
      };
    },
    select: ({ darkTheme }) => {
      const palette = getPalette(darkTheme);

      return {
        background: palette.background,
        color: palette.color,
        borderRadius: 10,
        height: 24,
        fontWeight: 600,
        fontSize: 11,
        paddingLeft: 8,
        paddingRight: '10px !important',
        border: darkTheme ? `1px solid ${theme?.borderColor || 'transparent'}` : 'none',
        '& .MuiSelect-icon': {
          color: palette.color,
          fontSize: 16,
          right: 2
        },
        '&:before, &:after': {
          display: 'none'
        },
        '&:focus': {
          borderRadius: 10,
          background: palette.background
        },
        '& .MuiSelect-select:focus': {
          background: 'transparent'
        },
        '& .MuiSelect-select.Mui-focused': {
          background: 'transparent'
        }
      };
    }
  };
});

export const LanguageSelector = ({ darkTheme = false }) => {
  const dispatch = useDispatch();
  const classes = useStyles({ darkTheme });
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const langSelectorTheme = muiTheme?.languageSelector || {};
  const menuBackground = darkTheme
    ? (langSelectorTheme?.dark?.menuBackground ?? langSelectorTheme?.menuBackground ?? muiTheme?.buttonHoverBg ?? muiTheme?.palette?.grey?.[800])
    : (langSelectorTheme?.menuBackground ?? muiTheme?.palette?.background?.paper);

  const chosen = normalizeCode(
    getCurrentLanguageCode({
      defaultLanguage: appConfig.defaultLanguage,
      fallbackLanguage: 'uk',
    }),
  );

  const languages = useSelector((state) => state?.app?.localization || []);
  if (!appConfig.multiLanguage || !Array.isArray(languages) || languages.length <= 1) {
    return null;
  }

  const current =
    languages.find((x) => getTranslationCandidates(chosen).includes(x.code))
      ?.code || languages[0]?.code;

  const handleChange = (_, next) => {
    if (!next || next === current) return;
    dispatch(setCurrentLanguage(next));
    window.location.reload();
  };

  const handleSelectChange = (event) => {
    const next = event.target.value;
    if (!next || next === current) return;
    dispatch(setCurrentLanguage(next));
    window.location.reload();
  };

  if (isMobile) {
    return (
      <div className={classes.root}>
        <Select
          variant="standard"
          value={current}
          onChange={handleSelectChange}
          className={classes.select}
          inputProps={{ 'aria-label': 'Language selector' }}
          SelectDisplayProps={{ style: { outline: 'none' } }}
          disableUnderline
          MenuProps={{
            disablePortal: false,
            PaperProps: { sx: { background: menuBackground } },
            MenuListProps: {
              sx: {
                outline: 'none',
                '& .MuiMenuItem-root:focus-visible': { outline: 'none', backgroundColor: 'transparent' },
                '& .MuiMenuItem-root.Mui-selected:focus-visible': { outline: 'none' }
              }
            }
          }}
        >
          {languages.map(({ code }) => (
            <MenuItem key={code} value={code} sx={{ fontWeight: 600, fontSize: 11, minHeight: 32, py: 0.5 }}>
              {code.toUpperCase()}
            </MenuItem>
          ))}
        </Select>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={current}
        onChange={handleChange}
        className={classes.group}
        aria-label="Language selector"
      >
        {languages.map(({ code }) => (
          <ToggleButton key={code} value={code} aria-label={code} title={code}>
            {code.toUpperCase()}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
};

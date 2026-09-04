import React from 'react';
import {
  Box,
  ButtonBase,
  IconButton,
  InputAdornment,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import VirtualGrid from 'react-virtualized/dist/commonjs/Grid';
import MaterialSymbolIcon from 'components/MaterialSymbolIcon';
import materialSymbolNames from 'helpers/materialSymbolNames';
import muiIcons from 'components/muiIcons';

const muiIconNames = Object.keys(muiIcons);

export const baseIconOptions = [...muiIconNames, ...materialSymbolNames];

const isMaterialSymbolName = (value) => materialSymbolNames.includes(value);

const isImageSource = (value) => (
  typeof value === 'string' && (
    value.startsWith('data:image/') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/')
  )
);

const getMuiIconComponent = (iconName) => {
  if (!iconName) {
    return null;
  }

  const iconCandidates = [
    iconName,
    iconName.endsWith('Icon') ? iconName.slice(0, -4) : `${iconName}Icon`,
  ];

  return iconCandidates.reduce(
    (resolved, candidate) => resolved || muiIcons[candidate],
    null,
  );
};

export const isSupportedIconName = (value) => (
  isMaterialSymbolName(value) ||
  Boolean(getMuiIconComponent(value)) ||
  isImageSource(value)
);

export const renderIconPreview = (iconName, sx = {}) => {
  if (isMaterialSymbolName(iconName)) {
    return <MaterialSymbolIcon name={iconName} sx={{ fontSize: 20, ...sx }} />;
  }

  const MuiIconComponent = getMuiIconComponent(iconName);

  if (MuiIconComponent) {
    return <MuiIconComponent fontSize="small" sx={sx} />;
  }

  if (isImageSource(iconName)) {
    return (
      <Box
        component="img"
        src={iconName}
        alt=""
        sx={{
          width: 20,
          height: 20,
          objectFit: 'contain',
          display: 'block',
          ...sx,
        }}
      />
    );
  }

  return null;
};

const getUniqueOptions = (value) => {
  const options = baseIconOptions.includes(value)
    ? baseIconOptions
    : [value, ...baseIconOptions];

  return options.filter((option, index, list) => (
    option && list.indexOf(option) === index && isSupportedIconName(option)
  ));
};

const CELL_SIZE = 40;
const GRID_HEIGHT = 220;
const STATUS_BAR_HEIGHT = 32;
const GRID_SCROLLBAR_GAP = 14;

const IconSelect = ({
  label,
  value,
  onChange,
  disabled = false,
  helperText,
  searchLabel = 'Search',
  sx,
}) => {
  const anchorRef = React.useRef(null);
  const [hoveredIcon, setHoveredIcon] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const options = React.useMemo(() => getUniqueOptions(value), [value]);
  const filteredOptions = React.useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(normalizedSearch));
  }, [options, searchValue]);
  const statusIcon = hoveredIcon || value || '';
  const popoverWidth = anchorRef.current?.clientWidth || 320;

  const handleOpen = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setHoveredIcon('');
    setSearchValue('');
  };

  const handleChange = (nextValue) => {
    onChange?.(nextValue);
    handleClose();
  };

  return (
    <>
      <TextField
        fullWidth={true}
        ref={anchorRef}
        label={label}
        value={value || ''}
        disabled={disabled}
        helperText={helperText}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpen();
          }
        }}
        InputProps={{
          readOnly: true,
          startAdornment: value ? (
            <InputAdornment position="start">
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.primary',
                }}
              >
                {renderIconPreview(value)}
              </Box>
            </InputAdornment>
          ) : null,
          endAdornment: (
            <InputAdornment position="end">
              {value ? (
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange?.('');
                  }}
                  edge="end"
                  sx={{ mr: 0.25 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              ) : null}
              <ArrowDropDownIcon
                sx={{
                  color: disabled ? 'action.disabled' : 'action.active',
                  transform: open ? 'rotate(180deg)' : 'none',
                  transition: 'transform 120ms ease',
                }}
              />
            </InputAdornment>
          ),
        }}
        inputProps={{
          role: 'button',
          'aria-haspopup': 'listbox',
          'aria-expanded': open,
        }}
        sx={{
          ...sx,
          '& .MuiInputBase-input': {
            cursor: disabled ? 'default' : 'pointer',
          },
          '& .MuiInputBase-root': {
            cursor: disabled ? 'default' : 'pointer',
          },
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: (theme) => ({
            mt: 0.5,
            width: popoverWidth,
            overflow: 'hidden',
            bgcolor: theme.palette.grey.A400,
            color: theme.palette.text.primary,
          }),
        }}
      >
        <Box
          sx={(theme) => ({
            border: 1,
            borderColor: theme.palette.grey[700],
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: theme.palette.grey.A400,
          })}
        >
          <Box
            sx={(theme) => ({
              p: 1,
              borderBottom: 1,
              borderColor: theme.borderColor,
            })}
          >
            <TextField
              fullWidth={true}
              size="small"
              autoFocus={true}
              label={searchLabel}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              sx={(theme) => ({
                '& .MuiInputBase-root': {
                  color: theme.palette.text.primary,
                  bgcolor: theme.searchInputBg,
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.grey[700],
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.grey[500],
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.grey[400],
                },
              })}
            />
          </Box>
          <Box
            sx={{
              height: GRID_HEIGHT,
              overflow: 'hidden',
              '& .ReactVirtualized__Grid': {
                overflowX: 'hidden !important',
                backgroundColor: 'transparent !important',
              },
            }}
          >
            <AutoSizer disableHeight={true}>
              {({ width }) => {
                const gridWidth = Math.max(1, Math.floor(width));
                const iconColumnCount = Math.max(1, Math.floor((gridWidth - GRID_SCROLLBAR_GAP) / CELL_SIZE));
                const columnCount = iconColumnCount + 1;
                const rowCount = Math.ceil(filteredOptions.length / iconColumnCount);
                const cellWidth = Math.floor((gridWidth - GRID_SCROLLBAR_GAP) / iconColumnCount);

                return (
                  <VirtualGrid
                    width={gridWidth}
                    height={GRID_HEIGHT}
                    columnCount={columnCount}
                    columnWidth={({ index }) => (
                      index === iconColumnCount ? GRID_SCROLLBAR_GAP : cellWidth
                    )}
                    rowCount={rowCount}
                    rowHeight={CELL_SIZE}
                    overscanRowCount={4}
                    style={{ overflowX: 'hidden' }}
                    cellRenderer={({ columnIndex, key, rowIndex, style }) => {
                      if (columnIndex === iconColumnCount) {
                        return <Box key={key} style={style} />;
                      }

                      const optionIndex = rowIndex * iconColumnCount + columnIndex;
                      const option = filteredOptions[optionIndex];

                      if (!option) {
                        return <Box key={key} style={style} />;
                      }

                      const selected = option === value;

                      return (
                        <Box key={key} style={style} sx={{ p: 0.5 }}>
                          <ButtonBase
                            disabled={disabled}
                            aria-label={option}
                            aria-pressed={selected}
                            onMouseEnter={() => setHoveredIcon(option)}
                            onMouseLeave={() => setHoveredIcon('')}
                            onFocus={() => setHoveredIcon(option)}
                            onBlur={() => setHoveredIcon('')}
                            onClick={() => handleChange(option)}
                            sx={(theme) => ({
                              width: '100%',
                              height: '100%',
                              borderRadius: 1,
                              color: selected
                                ? theme.palette.primary.contrastText
                                : theme.palette.text.primary,
                              bgcolor: selected ? theme.palette.primary.main : 'transparent',
                              border: 1,
                              borderColor: selected ? theme.palette.primary.main : 'transparent',
                              '&:hover': {
                                bgcolor: selected ? theme.palette.primary.main : theme.listHover,
                                borderColor: selected ? theme.palette.primary.main : theme.borderColor,
                              },
                              '&.Mui-focusVisible': {
                                outline: '2px solid',
                                outlineColor: theme.palette.primary.main,
                                outlineOffset: -2,
                              },
                            })}
                          >
                            {renderIconPreview(option, { fontSize: 22 })}
                          </ButtonBase>
                        </Box>
                      );
                    }}
                  />
                );
              }}
            </AutoSizer>
          </Box>
          <Box
            sx={(theme) => ({
              height: STATUS_BAR_HEIGHT,
              px: 1.25,
              display: 'flex',
              alignItems: 'center',
              borderTop: 1,
              borderColor: theme.borderColor,
              bgcolor: theme.palette.grey[800],
              color: theme.palette.text.primary,
              minWidth: 0,
            })}
          >
            <Box
              sx={{
                width: 22,
                height: 22,
                mr: 1,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.primary',
              }}
            >
              {renderIconPreview(statusIcon)}
            </Box>
            <Typography
              variant="caption"
              title={statusIcon}
              sx={(theme) => ({
                flex: 1,
                color: statusIcon ? theme.palette.text.primary : theme.palette.grey.A200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              })}
            >
              {statusIcon || '-'}
            </Typography>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default IconSelect;

import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useDispatch } from "react-redux";
import { useTranslate } from "react-translate";
import Editor from "components/Editor";
import * as api from "services/api";
import { updateCabinetMenuItem } from "../helpers/actions";

const UNIT_ACCESS_KEYS = ["userHasUnit", "userHasUnitNotHead", "isUserUnitHead"];
const UNIT_ACCESS_OPTIONS = [
  { key: "userHasUnit", labelKey: "AccessUnitRuleAllUsers" },
  { key: "userHasUnitNotHead", labelKey: "AccessUnitRuleMembersOnly" },
  { key: "isUserUnitHead", labelKey: "AccessUnitRuleHeadsOnly" },
];

const RULES = [
  { key: "unitAccess", type: "unitAccess" },
  { key: "userDoesNotHaveUnit", type: "unitList" },
  { key: "custom", type: "custom" },
];

const CUSTOM_RULE_DEFAULT_VALUE = `(userInfo, userUnits) => {

}`;

const getRuleDefaultValue = (rule) => {
  if (rule?.type === "custom") {
    return CUSTOM_RULE_DEFAULT_VALUE;
  }

  if (rule?.type === "unitAccess") {
    return {
      key: UNIT_ACCESS_KEYS[0],
      units: [],
    };
  }

  return "";
};

const normalizeUnitList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => !Number.isNaN(item));
  }

  if (value === null || value === undefined || value === "") {
    return [];
  }

  const normalizedValue = Number(value);
  return Number.isNaN(normalizedValue) ? [] : [normalizedValue];
};

const mergeUnitOptions = (options, ids) => {
  const merged = new Map((options || []).map((option) => [option.id, option]));

  (ids || []).forEach((id) => {
    if (!merged.has(id)) {
      merged.set(id, {
        id,
        name: String(id),
      });
    }
  });

  return Array.from(merged.values());
};

const getInitialState = (value) => {
  const access = value?.access || {};
  const unitAccessKey = UNIT_ACCESS_KEYS.find((key) =>
    Object.prototype.hasOwnProperty.call(access, key),
  );

  return {
    rules: RULES.reduce((acc, rule) => {
      const rawValue = access[rule.key];
      const stringValue = rawValue || getRuleDefaultValue(rule);

      acc[rule.key] = {
        enabled: rule.type === "unitAccess"
          ? Boolean(unitAccessKey)
          : Object.prototype.hasOwnProperty.call(access, rule.key),
        value: rule.type === "unitAccess" ? {
          key: unitAccessKey || UNIT_ACCESS_KEYS[0],
          units: normalizeUnitList(access[unitAccessKey]),
        } : (
          rule.type === "unitList" ? normalizeUnitList(rawValue) : stringValue
        ),
      };

      return acc;
    }, {}),
  };
};

const buildAccessPayload = (form) => {
  const nextAccess = {};

  RULES.forEach((rule) => {
    const ruleState = form.rules[rule.key];

    if (!ruleState?.enabled) {
      return;
    }

    if (rule.type === "unitAccess") {
      const unitAccessKey = UNIT_ACCESS_KEYS.includes(ruleState.value?.key)
        ? ruleState.value.key
        : UNIT_ACCESS_KEYS[0];

      nextAccess[unitAccessKey] = normalizeUnitList(ruleState.value?.units);
      return;
    }

    if (rule.type === "unitList") {
      nextAccess[rule.key] = ruleState.value || [];
      return;
    }

    nextAccess[rule.key] = String(ruleState.value || "").trim();
  });

  return nextAccess;
};

const CabinetMenuAccessDialog = ({
  open,
  onClose,
  onAction,
  value,
}) => {
  const t = useTranslate("CabinetMenuPage");
  const dispatch = useDispatch();
  const [form, setForm] = React.useState(getInitialState(value));
  const [unitOptions, setUnitOptions] = React.useState([]);
  const [addRuleAnchorEl, setAddRuleAnchorEl] = React.useState(null);
  const isSystem = Boolean(value?.options?.system);
  const activeRules = RULES.filter((rule) => form.rules[rule.key]?.enabled);
  const availableRules = RULES.filter((rule) => !form.rules[rule.key]?.enabled);
  const addRuleMenuOpen = Boolean(addRuleAnchorEl);

  React.useEffect(() => {
    if (open) {
      setForm(getInitialState(value));
    }
  }, [open, value]);

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    let isActive = true;

    const loadUnits = async () => {
      try {
        const result = await api.get("units/all", "REQUEST_ALL_UNITS_FOR_MENU_ACCESS", dispatch);
        const nextOptions = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : [];

        if (isActive) {
          setUnitOptions(nextOptions.map((item) => ({
            id: item.id,
            name: item.name || String(item.id),
          })));
        }
      } catch (error) {
        if (isActive) {
          setUnitOptions([]);
        }
      }
    };

    loadUnits();

    return () => {
      isActive = false;
    };
  }, [dispatch, open]);

  const handleAddRule = (key) => {
    const rule = RULES.find((item) => item.key === key);

    setForm((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [key]: {
          ...prev.rules[key],
          enabled: true,
          value: prev.rules[key]?.value || getRuleDefaultValue(rule),
        },
      },
    }));
    setAddRuleAnchorEl(null);
  };

  const handleRemoveRule = (key) => {
    setForm((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [key]: {
          ...prev.rules[key],
          enabled: false,
        },
      },
    }));
  };

  const handleRuleValueChange = (key) => (event) => {
    const nextValue = event?.target?.type === "checkbox"
      ? event.target.checked
      : event.target.value;

    setForm((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [key]: {
          ...prev.rules[key],
          value: nextValue,
        },
      },
    }));
  };

  const getSelectedRuleUnits = React.useCallback((ruleKey) => {
    const rule = RULES.find((item) => item.key === ruleKey);
    const selectedIds = rule?.type === "unitAccess"
      ? (form.rules[ruleKey]?.value?.units || [])
      : (form.rules[ruleKey]?.value || []);
    const mergedOptions = mergeUnitOptions(unitOptions, selectedIds);
    return mergedOptions.filter((option) => selectedIds.includes(option.id));
  }, [form.rules, unitOptions]);

  const getRuleLabel = React.useCallback((ruleKey) => {
    return t(`AccessRuleLabel_${ruleKey}`);
  }, [t]);

  const handleSubmit = async () => {
    if (isSystem) {
      return;
    }

    const nextAccess = buildAccessPayload(form);
    const savedItem = await updateCabinetMenuItem({
      id: value.id,
      access: nextAccess,
    }, dispatch);

    onAction?.({
      type: "update",
      item: savedItem,
    });
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        component="div"
        sx={{
          alignItems: "center",
          display: "flex",
          gap: 2,
          justifyContent: "space-between",
        }}
      >
        <Box component="span">
          {t("AccessBuilderTitle", { name: value?.name || "-" })}
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          endIcon={<KeyboardArrowDownIcon />}
          disabled={isSystem || availableRules.length === 0}
          onClick={(event) => setAddRuleAnchorEl(event.currentTarget)}
        >
          {t("AddRule")}
        </Button>
      </DialogTitle>
      <Menu
        anchorEl={addRuleAnchorEl}
        open={addRuleMenuOpen}
        onClose={() => setAddRuleAnchorEl(null)}
      >
        {availableRules.map((rule) => (
          <MenuItem key={rule.key} onClick={() => handleAddRule(rule.key)}>
            {getRuleLabel(rule.key)}
          </MenuItem>
        ))}
      </Menu>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {activeRules.length === 0 ? (
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                color: "text.secondary",
                px: 2,
                py: 3,
                textAlign: "center",
              }}
            >
              <Typography variant="body2">
                {t("AccessRulesEmpty")}
              </Typography>
            </Box>
          ) : null}
          {activeRules.map((rule, ruleIndex) => {
            const ruleState = form.rules[rule.key];

            return (
              <React.Fragment key={rule.key}>
                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 2,
                    position: "relative",
                  }}
                >
                  {ruleIndex > 0 ? (
                    <Typography
                      variant="caption"
                      color="text.primary"
                      sx={{
                        left: 24,
                        lineHeight: 1,
                        px: 0.5,
                        position: "absolute",
                        top: 0,
                        transform: "translateY(-50%)",
                      }}
                    >
                      {t("AccessRulesOr")}
                    </Typography>
                  ) : null}
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography variant="subtitle2">
                        {getRuleLabel(rule.key)}
                      </Typography>
                      <Tooltip title={t("Delete")}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveRule(rule.key)}
                            disabled={isSystem}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                    {ruleState.enabled ? (
                      rule.type === "unitAccess" ? (
                        <Stack spacing={1.5}>
                          <RadioGroup
                            row
                            value={ruleState.value?.key || UNIT_ACCESS_KEYS[0]}
                            onChange={(event) => {
                              setForm((prev) => ({
                                ...prev,
                                rules: {
                                  ...prev.rules,
                                  [rule.key]: {
                                    ...prev.rules[rule.key],
                                    value: {
                                      ...(prev.rules[rule.key]?.value || getRuleDefaultValue(rule)),
                                      key: event.target.value,
                                    },
                                  },
                                },
                              }));
                            }}
                          >
                            {UNIT_ACCESS_OPTIONS.map((option) => (
                              <FormControlLabel
                                key={option.key}
                                value={option.key}
                                control={<Radio />}
                                label={t(option.labelKey)}
                                disabled={isSystem}
                              />
                            ))}
                          </RadioGroup>
                          <Autocomplete
                            multiple
                            disabled={isSystem}
                            options={mergeUnitOptions(unitOptions, ruleState.value?.units)}
                            value={getSelectedRuleUnits(rule.key)}
                            filterSelectedOptions
                            onChange={(event, nextValue) => {
                              setForm((prev) => ({
                                ...prev,
                                rules: {
                                  ...prev.rules,
                                  [rule.key]: {
                                    ...prev.rules[rule.key],
                                    value: {
                                      ...(prev.rules[rule.key]?.value || getRuleDefaultValue(rule)),
                                      units: (nextValue || []).map((item) => item.id),
                                    },
                                  },
                                },
                              }));
                            }}
                            getOptionLabel={(option) => option?.name || String(option?.id || "")}
                            isOptionEqualToValue={(option, selectedValue) =>
                              option?.id === selectedValue?.id
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                label={t("AccessUnits")}
                                helperText={t("AccessUnitsHelper")}
                              />
                            )}
                          />
                        </Stack>
                      ) : rule.type === "unitList" ? (
                        <Autocomplete
                          multiple
                          disabled={isSystem}
                          options={mergeUnitOptions(unitOptions, ruleState.value)}
                          value={getSelectedRuleUnits(rule.key)}
                          filterSelectedOptions
                          onChange={(event, nextValue) => {
                            setForm((prev) => ({
                              ...prev,
                              rules: {
                                ...prev.rules,
                                [rule.key]: {
                                  ...prev.rules[rule.key],
                                  value: (nextValue || []).map((item) => item.id),
                                },
                              },
                            }));
                          }}
                          getOptionLabel={(option) => option?.name || String(option?.id || "")}
                          isOptionEqualToValue={(option, selectedValue) =>
                            option?.id === selectedValue?.id
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              label={t("AccessUnits")}
                              helperText={t("AccessUnitsHelper")}
                            />
                          )}
                        />
                      ) : rule.type === "custom" ? (
                        <Box
                          sx={{
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            height: 240,
                            overflow: "hidden",
                          }}
                        >
                          <Editor
                            height="240px"
                            language="javascript"
                            value={ruleState.value}
                            readOnly={isSystem}
                            onChange={(nextValue) => {
                              handleRuleValueChange(rule.key)({
                                target: {
                                  value: nextValue,
                                },
                              });
                            }}
                            options={{
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                            }}
                          />
                        </Box>
                      ) : null
                    ) : null}
                  </Stack>
                </Box>
              </React.Fragment>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSystem}>
          {t("Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CabinetMenuAccessDialog;

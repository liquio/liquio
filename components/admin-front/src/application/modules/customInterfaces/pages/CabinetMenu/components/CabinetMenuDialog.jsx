import React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import TranslateIcon from "@mui/icons-material/Translate";
import { useDispatch } from "react-redux";
import { useTranslate } from "react-translate";
import {
  getCurrentLanguageCode,
  getTranslationCandidates,
} from "helpers/localization";
import * as api from "services/api";
import {
  createCabinetMenuItem,
  sortCabinetMenuItems,
  updateCabinetMenuItem,
} from "../helpers/actions";
import CabinetMenuTranslationsDialog from "./CabinetMenuTranslationsDialog";
import IconSelect, { isSupportedIconName } from "./IconSelect";

const stringifyObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "{}";
  }

  return JSON.stringify(value, null, 2);
};

const parseJsonObject = (value, label) => {
  if (!value?.trim()) {
    return {};
  }

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(label);
  }

  return parsed;
};

const getLocalizedName = (value, languageCode) => {
  const translations = value?.translations;

  if (translations && typeof translations === "object" && !Array.isArray(translations)) {
    for (const candidate of getTranslationCandidates(languageCode)) {
      if (typeof translations[candidate] === "string" && translations[candidate].trim()) {
        return translations[candidate];
      }
    }
  }

  return value?.name || "";
};

const updateCurrentLocaleTranslation = (translationsValue, languageCode, name, errorLabel) => {
  let translations = {};

  try {
    translations = parseJsonObject(translationsValue, errorLabel);
  } catch {
    translations = {};
  }

  if (name.trim()) {
    translations[languageCode] = name.trim();
  } else {
    delete translations[languageCode];
  }

  return translations;
};

const SystemItemIcon = ({ title }) => (
  <Tooltip title={title}>
    <AdminPanelSettingsOutlinedIcon
      fontSize="small"
      sx={{ color: "text.secondary", flexShrink: 0 }}
    />
  </Tooltip>
);

const isRouteType = (type) => type === "link" || type === "button";
const CUSTOM_INTERFACES_PAGE_SIZE = 100;

const getInitialState = (value, parentId, languageCode) => ({
  id: value?.id || null,
  parentId: parentId !== undefined ? parentId : (value?.parentId || ""),
  order: value?.order ?? 0,
  name: getLocalizedName(value, languageCode),
  description: value?.description || "",
  icon: value?.icon || "",
  route: value?.options?.route || value?.options?.endpoint || value?.options?.path || "",
  customInterfaceId: value?.options?.customInterfaceId || "",
  type: value?.type || "customInterface",
  enabled: value?.enabled ?? true,
  translations: stringifyObject(value?.translations),
  options: stringifyObject(value?.options),
  access: stringifyObject(value?.access),
});

const getCustomInterfacesPageUrl = (page) => (
  `custom-interfaces?page=${page}&count=${CUSTOM_INTERFACES_PAGE_SIZE}`
);

const normalizeCustomInterfacesResponse = (result) => ({
  data: Array.isArray(result)
    ? result
    : Array.isArray(result?.data)
      ? result.data
      : [],
  meta: result?.meta || {},
});

const loadAllCustomInterfaces = async (dispatch) => {
  const firstResult = await api.get(
    getCustomInterfacesPageUrl(1),
    "GET_CUSTOM_INTERFACES_FOR_MENU",
    dispatch,
  );
  const firstPage = normalizeCustomInterfacesResponse(firstResult);
  const lastPage = Number(firstPage.meta?.lastPage) || 1;

  if (lastPage <= 1) {
    return firstPage.data;
  }

  const restPages = await Promise.all(
    Array.from({ length: lastPage - 1 }, (item, index) => (
      api.get(
        getCustomInterfacesPageUrl(index + 2),
        "GET_CUSTOM_INTERFACES_FOR_MENU",
        dispatch,
      )
    )),
  );

  return restPages.reduce(
    (list, result) => list.concat(normalizeCustomInterfacesResponse(result).data),
    firstPage.data,
  );
};

const CabinetMenuDialog = ({
  open,
  onClose,
  onAction,
  value,
  items,
  parentId,
}) => {
  const t = useTranslate("CabinetMenuPage");
  const dispatch = useDispatch();
  const currentLanguageCode = React.useMemo(() => getCurrentLanguageCode(), []);
  const [form, setForm] = React.useState(getInitialState(value, parentId, currentLanguageCode));
  const [error, setError] = React.useState("");
  const [customInterfaceOptions, setCustomInterfaceOptions] = React.useState([]);
  const [customInterfacesLoading, setCustomInterfacesLoading] = React.useState(false);
  const [translationsOpen, setTranslationsOpen] = React.useState(false);
  const isEdit = Boolean(value?.id);
  const isSystem = Boolean(value?.options?.system);

  React.useEffect(() => {
    if (open) {
      setForm(getInitialState(value, parentId, currentLanguageCode));
      setError("");
    }
  }, [open, value, parentId, currentLanguageCode]);

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    let isActive = true;

    const loadCustomInterfaces = async () => {
      setCustomInterfacesLoading(true);
      try {
        const nextOptions = await loadAllCustomInterfaces(dispatch);

        if (isActive) {
          setCustomInterfaceOptions(nextOptions);
        }
      } catch (loadError) {
        if (isActive) {
          setCustomInterfaceOptions([]);
        }
      } finally {
        if (isActive) {
          setCustomInterfacesLoading(false);
        }
      }
    };

    loadCustomInterfaces();

    return () => {
      isActive = false;
    };
  }, [dispatch, open]);

  const parentOptions = React.useMemo(() => {
    return (items || []).filter((item) => (
      item.id !== value?.id && !item.parentId
    ));
  }, [items, value?.id]);

  const selectedCustomInterface = React.useMemo(() => {
    if (!form.customInterfaceId) {
      return null;
    }

    return customInterfaceOptions.find((item) => item.id === form.customInterfaceId) || null;
  }, [customInterfaceOptions, form.customInterfaceId]);
  const isValid = isRouteType(form.type) || Boolean(form.customInterfaceId);

  const handleChange = (field) => (event) => {
    const nextValue = event?.target?.type === "checkbox"
      ? event.target.checked
      : event?.target?.value;

    if (field === "type") {
      setForm((prev) => ({
        ...prev,
        type: nextValue,
        route: isRouteType(nextValue) ? prev.route : "",
        customInterfaceId: nextValue === "customInterface" ? prev.customInterfaceId : "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleNameChange = (event) => {
    const nextValue = event?.target?.value || "";

    setForm((prev) => {
      const translations = updateCurrentLocaleTranslation(
        prev.translations,
        currentLanguageCode,
        nextValue,
        t("TranslationsJsonError"),
      );

      return {
        ...prev,
        name: nextValue,
        translations: stringifyObject(translations),
      };
    });
  };

  const handleSubmit = async () => {
    setError("");

    try {
      const options = parseJsonObject(form.options, t("OptionsJsonError"));
      parseJsonObject(form.translations, t("TranslationsJsonError"));
      const parsedAccess = parseJsonObject(form.access, t("AccessJsonError"));
      const type = isSystem ? (value?.type || form.type) : form.type.trim();
      const route = isSystem
        ? (value?.options?.route || value?.options?.endpoint || value?.options?.path || "")
        : form.route.trim();
      const customInterfaceId = isSystem
        ? (value?.options?.customInterfaceId || "")
        : form.customInterfaceId;
      const customInterface = customInterfaceOptions.find((item) => item.id === customInterfaceId) || null;

      const nextTranslations = updateCurrentLocaleTranslation(
        form.translations,
        currentLanguageCode,
        form.name,
        t("TranslationsJsonError"),
      );

      const payload = {
        ...(isEdit ? { id: value.id } : {}),
        parentId: form.parentId || null,
        order: Number(form.order) || 0,
        name: value?.name || form.name.trim() || null,
        description: form.description.trim() || null,
        icon: isSupportedIconName(form.icon.trim()) ? form.icon.trim() : null,
        translations: nextTranslations,
        type,
        options: {
          ...options,
          ...(isRouteType(type)
            ? {
              route,
            }
            : {
              customInterfaceId: customInterfaceId || null,
              route: customInterface?.route || "",
            }),
        },
        access: isSystem ? (value?.access || {}) : parsedAccess,
        enabled: Boolean(form.enabled),
      };

      if (isRouteType(type)) {
        delete payload.options.customInterfaceId;
        delete payload.options.endpoint;
      } else {
        delete payload.options.endpoint;
      }

      if (isEdit) {
        const savedItem = await updateCabinetMenuItem(payload, dispatch);
        onAction?.({
          type: "update",
          item: savedItem,
        });
      } else {
        const createdItem = await createCabinetMenuItem(payload, dispatch);
        const createdParentId = createdItem?.parentId || null;
        const siblingItems = (items || [])
          .filter((item) => (item?.parentId || null) === createdParentId)
          .slice()
          .sort((a, b) => {
            if ((a?.order ?? 0) !== (b?.order ?? 0)) {
              return (a?.order ?? 0) - (b?.order ?? 0);
            }

            return String(a?.name || "").localeCompare(String(b?.name || ""));
          });

        const reorderedItems = [createdItem, ...siblingItems]
          .filter((item, index, list) =>
            item?.id && list.findIndex((candidate) => candidate?.id === item.id) === index,
          )
          .map((item, index) => ({
            ...item,
            parentId: createdParentId,
            order: index,
          }));

        await sortCabinetMenuItems(
          reorderedItems.map((item) => ({
            id: item.id,
            parentId: item.parentId || null,
            order: item.order,
          })),
          dispatch,
        );

        onAction?.({
          type: "create",
          item: reorderedItems[0],
          reorderedItems,
        });
      }
      onClose?.();
    } catch (submitError) {
      setError(submitError?.message || t("SaveError"));
    }
  };

  const parsedTranslations = React.useMemo(() => {
    try {
      return parseJsonObject(form.translations, t("TranslationsJsonError"));
    } catch {
      return {};
    }
  }, [form.translations, t]);

  const dialogTitleName = form.name || value?.name || "-";

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {isEdit ? t("EditItemTitle", { name: dialogTitleName }) : t("CreateItemTitle")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select={true}
                sx={{ width: { xs: "100%", md: 240 }, flexShrink: 0 }}
                label={t("Type")}
                value={form.type}
                onChange={handleChange("type")}
                disabled={isSystem}
              >
                <MenuItem value="customInterface">{t("CustomInterfaceType")}</MenuItem>
                <MenuItem value="link">{t("LinkType")}</MenuItem>
                <MenuItem value="button">{t("ButtonType")}</MenuItem>
              </TextField>
              {isRouteType(form.type) ? (
                <TextField
                  fullWidth={true}
                  sx={{ flex: 1 }}
                  label={t("Route")}
                  value={form.route}
                  onChange={handleChange("route")}
                  disabled={isSystem}
                />
              ) : (
                <Autocomplete
                  fullWidth
                  sx={{ flex: 1 }}
                  disabled={isSystem}
                  options={customInterfaceOptions}
                  value={selectedCustomInterface}
                  onChange={(event, nextValue) => {
                    setForm((prev) => ({
                      ...prev,
                      customInterfaceId: nextValue?.id || "",
                      name: nextValue?.name || prev.name,
                      translations: nextValue?.name
                        ? stringifyObject(updateCurrentLocaleTranslation(
                          prev.translations,
                          currentLanguageCode,
                          nextValue.name,
                          t("TranslationsJsonError"),
                        ))
                        : prev.translations,
                    }));
                  }}
                  loading={customInterfacesLoading}
                  getOptionLabel={(option) => option?.name || option?.route || ""}
                  isOptionEqualToValue={(option, selectedValue) =>
                    option?.id === selectedValue?.id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      label={t("CustomInterface")}
                    />
                  )}
                />
              )}
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <IconSelect
                sx={{ width: { xs: "100%", md: 240 }, flexShrink: 0 }}
                label={t("Icon")}
                searchLabel={t("IconSearch")}
                value={isSupportedIconName(form.icon) ? form.icon : ""}
                onChange={(nextValue) => {
                  setForm((prev) => ({
                    ...prev,
                    icon: nextValue,
                  }));
                }}
              />
              <TextField
                fullWidth={true}
                sx={{ flex: 1 }}
                label={t("MenuName")}
                value={form.name}
                onChange={handleNameChange}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      size="small"
                      onClick={() => setTranslationsOpen(true)}
                      edge="end"
                    >
                      <TranslateIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select={true}
                fullWidth={true}
                label={t("Parent")}
                value={form.parentId}
                onChange={handleChange("parentId")}
              >
                <MenuItem value="">
                  {t("RootItem")}
                </MenuItem>
                {parentOptions.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.name || item.id}
                      </Box>
                      {item.options?.system ? <SystemItemIcon title={t("SystemItem")} /> : null}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            {t("Save")}
          </Button>
        </DialogActions>
      </Dialog>
      <CabinetMenuTranslationsDialog
        open={translationsOpen}
        onClose={() => setTranslationsOpen(false)}
        value={parsedTranslations}
        onSave={(nextTranslations) => {
          setForm((prev) => ({
            ...prev,
            name: getLocalizedName({ name: prev.name, translations: nextTranslations }, currentLanguageCode),
            translations: stringifyObject(nextTranslations),
          }));
        }}
      />
    </>
  );
};

export default CabinetMenuDialog;

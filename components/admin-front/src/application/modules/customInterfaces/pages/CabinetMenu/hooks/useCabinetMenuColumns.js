import React from "react";
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import MaterialSymbolIcon from "components/MaterialSymbolIcon";
import materialSymbolNames from "helpers/materialSymbolNames";
import {
  getCurrentLanguageCode,
  getTranslationCandidates,
} from "helpers/localization";
import * as MuiIcons from "@mui/icons-material";
import CabinetMenuActions from "../components/CabinetMenuActions";
import { getItemRoute } from "../helpers/tree";

const statusChipSx = {
  borderRadius: "999px",
  fontWeight: 600,
  minWidth: 96,
};

const SystemItemIcon = ({ title }) => (
  <Tooltip title={title}>
    <AdminPanelSettingsOutlinedIcon
      fontSize="small"
      sx={{ color: "text.secondary", flexShrink: 0 }}
    />
  </Tooltip>
);

const isImageSource = (value) => (
  typeof value === "string" && (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  )
);

const renderResolvedIcon = (iconName) => {
  if (materialSymbolNames.includes(iconName)) {
    return <MaterialSymbolIcon name={iconName} sx={{ color: "#fff", fontSize: 22 }} />;
  }

  const iconCandidates = iconName
    ? [
        iconName,
        iconName.endsWith("Icon") ? iconName.slice(0, -4) : `${iconName}Icon`,
      ]
    : [];
  const IconComponent = iconCandidates.reduce(
    (resolved, candidate) => resolved || MuiIcons[candidate],
    null,
  );

  if (IconComponent) {
    return <IconComponent fontSize="small" sx={{ color: "#fff" }} />;
  }

  if (isImageSource(iconName)) {
    return (
      <Box
        component="img"
        src={iconName}
        alt=""
        sx={{
          width: 18,
          height: 18,
          objectFit: "contain",
          display: "block",
        }}
      />
    );
  }

  return (
    <Typography variant="body2" sx={{ color: "#fff" }}>
      {iconName || "—"}
    </Typography>
  );
};

const getLocalizedName = (item, languageCode) => {
  const translations = item?.translations;

  if (translations && typeof translations === "object" && !Array.isArray(translations)) {
    for (const candidate of getTranslationCandidates(languageCode)) {
      if (typeof translations[candidate] === "string" && translations[candidate].trim()) {
        return translations[candidate];
      }
    }
  }

  return item?.name || "";
};

const useCabinetMenuColumns = ({
  t,
  expanded,
  toggleExpanded,
  localItems,
  canEdit,
  handleItemAction,
}) => {
  const currentLanguageCode = React.useMemo(() => getCurrentLanguageCode(), []);

  return React.useMemo(() => [
    {
      id: "tree",
      name: "",
      width: 52,
      disableTooltip: true,
      disableClick: true,
      render: () => (
        <Box sx={{ display: "flex", alignItems: "center", color: "text.secondary" }}>
          <DragIndicatorIcon fontSize="small" />
        </Box>
      ),
    },
    {
      id: "name",
      name: (
        <Box sx={{ pl: "42px" }}>
          {t("MenuName")}
        </Box>
      ),
      disableTooltip: true,
      render: (_, row) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            pl: `${row.depth * 30}px`,
            gap: 1,
          }}
        >
          {row.hasChildren ? (
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded(row.id);
              }}
            >
              {expanded[row.id] === false ? <ChevronRightIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          ) : (
            <Box sx={{ width: 36 }} />
          )}
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {getLocalizedName(row, currentLanguageCode) || t("Unnamed")}
            {row.childrenCount > 0 ? ` (${row.childrenCount})` : ""}
          </Typography>
          {row.options?.system ? <SystemItemIcon title={t("SystemItem")} /> : null}
        </Box>
      ),
    },
    {
      id: "icon",
      name: t("Icon"),
      disableTooltip: true,
      render: (_, row) => renderResolvedIcon(row.icon),
    },
    {
      id: "route",
      name: t("Route"),
      disableTooltip: true,
      render: (_, row) => (
        <Typography variant="body2">
          {getItemRoute(row) || "—"}
        </Typography>
      ),
    },
    {
      id: "enabled",
      name: t("Status"),
      disableTooltip: true,
      render: (_, row) => (
        <Chip
          label={row.enabled ? t("Enabled") : t("Disabled")}
          variant="outlined"
          sx={{
            ...statusChipSx,
            color: row.enabled ? "success.main" : "#fff",
            borderColor: row.enabled ? "success.main" : "#fff",
          }}
        />
      ),
    },
    {
      id: "actions",
      name: t("Actions"),
      width: 120,
      disableClick: true,
      disableTooltip: true,
      render: (_, row) => (
        <CabinetMenuActions
          item={row}
          items={localItems}
          readOnly={!canEdit}
          onAction={handleItemAction}
        />
      ),
    },
  ], [
    t,
    expanded,
    toggleExpanded,
    localItems,
    canEdit,
    handleItemAction,
    currentLanguageCode,
  ]);
};

export default useCabinetMenuColumns;

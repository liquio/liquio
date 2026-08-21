import React from "react";
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import ToggleOffOutlinedIcon from "@mui/icons-material/ToggleOffOutlined";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import { useDispatch } from "react-redux";
import { useTranslate } from "react-translate";
import CabinetMenuDialog from "./CabinetMenuDialog";
import DeleteCabinetMenuItemDialog from "./DeleteCabinetMenuItemDialog";
import CabinetMenuAccessDialog from "./CabinetMenuAccessDialog";
import { updateCabinetMenuItem } from "../helpers/actions";

const CabinetMenuActions = ({
  item,
  items,
  readOnly,
  onAction,
}) => {
  const t = useTranslate("CabinetMenuPage");
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [modal, setModal] = React.useState(null);
  const [enabledSaving, setEnabledSaving] = React.useState(false);

  const open = Boolean(anchorEl);
  const isSystem = Boolean(item?.options?.system);
  const canCreateChild = !item?.parentId && (item?.depth || 0) === 0;

  if (readOnly) {
    return null;
  }

  const handleEnabledChange = async (nextEnabled) => {
    if (!item?.id || enabledSaving) {
      return;
    }

    setEnabledSaving(true);
    try {
      const savedItem = await updateCabinetMenuItem({
        id: item.id,
        enabled: nextEnabled,
      }, dispatch);

      onAction?.({
        type: "update",
        item: savedItem,
      });
    } finally {
      setEnabledSaving(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "nowrap",
          width: "100%",
        }}
      >
        {canCreateChild ? (
          <Tooltip title={t("AddChild")}>
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                setModal("create-child");
              }}
              size="large"
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        ) : null}
        {isSystem ? null : <Tooltip title={t("EditAccess")}>
          <IconButton
            onClick={(event) => {
              event.stopPropagation();
              setModal("access");
            }}
            size="large"
          >
            <ShieldOutlinedIcon />
          </IconButton>
        </Tooltip>}
        <IconButton
          onClick={(event) => {
            event.stopPropagation();
            setAnchorEl(event.currentTarget);
          }}
          size="large"
        >
          <MoreVertIcon />
        </IconButton>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            setModal("edit");
            setAnchorEl(null);
          }}
        >
          <EditIcon sx={{ mr: 1.5 }} />
          {t("Edit")}
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={enabledSaving}
          onClick={(event) => {
            event.stopPropagation();
            handleEnabledChange(!Boolean(item?.enabled));
            setAnchorEl(null);
          }}
        >
          {item?.enabled ? (
            <ToggleOnOutlinedIcon sx={{ mr: 1.5 }} color="primary" />
          ) : (
            <ToggleOffOutlinedIcon sx={{ mr: 1.5 }} />
          )}
          {t(item?.enabled ? "Disable" : "Enable")}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (isSystem) {
              return;
            }

            setModal("delete");
            setAnchorEl(null);
          }}
          sx={{ color: "error.main" }}
          disabled={isSystem}
        >
          <DeleteIcon sx={{ mr: 1.5 }} color="error" />
          {t("Delete")}
        </MenuItem>
      </Menu>
      <CabinetMenuDialog
        open={modal === "edit"}
        onClose={() => setModal(null)}
        onAction={onAction}
        value={item}
        items={items}
      />
      <CabinetMenuDialog
        open={modal === "create-child"}
        onClose={() => setModal(null)}
        onAction={onAction}
        value={null}
        items={items}
        parentId={item?.id}
      />
      <DeleteCabinetMenuItemDialog
        open={modal === "delete"}
        onClose={() => setModal(null)}
        onAction={onAction}
        value={item}
      />
      <CabinetMenuAccessDialog
        open={modal === "access"}
        onClose={() => setModal(null)}
        onAction={onAction}
        value={item}
      />
    </>
  );
};

export default CabinetMenuActions;

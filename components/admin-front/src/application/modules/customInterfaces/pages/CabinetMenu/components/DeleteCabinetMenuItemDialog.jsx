import React from "react";
import { useDispatch } from "react-redux";
import { useTranslate } from "react-translate";
import ConfirmDialog from "components/ConfirmDialog";
import { deleteCabinetMenuItem } from "../helpers/actions";

const DeleteCabinetMenuItemDialog = ({
  open,
  onClose,
  onAction,
  value,
}) => {
  const t = useTranslate("CabinetMenuPage");
  const dispatch = useDispatch();

  const handleDelete = async () => {
    if (value?.options?.system) {
      onClose?.();
      return;
    }

    await deleteCabinetMenuItem(value, dispatch);
    onAction?.({
      type: "delete",
      id: value?.id,
    });
    onClose?.();
  };

  return (
    <ConfirmDialog
      open={open}
      title={t("DeletePrompt")}
      description={t("DeletePromptDescription", { name: value?.name || "-" })}
      handleClose={onClose}
      handleConfirm={handleDelete}
      darkTheme={true}
    />
  );
};

export default DeleteCabinetMenuItemDialog;
